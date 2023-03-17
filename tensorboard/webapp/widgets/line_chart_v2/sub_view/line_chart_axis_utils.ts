/* Copyright 2021 The TensorFlow Authors. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/

import {Formatter, Scale} from '../lib/public_types';
import {LinearScale} from '../lib/scale';

const DAY_IN_MS = 24 * 1000 * 60 * 60;

export interface MinorTick {
  value: number;
  tickFormattedString: string;
}

// Major tick, unlike the minor tick, spans a range.
export interface MajorTick {
  // Start of the major tick range. An end is implicitly defined by next major tick while
  // it can certainly change to explicitly define the end.
  start: number;
  tickFormattedString: string;
}

function getNumLeadingZerosInFractional(value: number): number {
  const maybeExponential = value.toExponential().split('e-', 2);
  if (maybeExponential.length === 2) {
    return Number(maybeExponential[1]) - 1;
  }
  return 0;
}

function getStandardTicks(
  scale: Scale,
  formatter: Formatter,
  maxMinorTickCount: number,
  lowAndHigh: [number, number]
): {minor: MinorTick[]; major: MajorTick[]} {
  const minorTickVals = scale.ticks(lowAndHigh, maxMinorTickCount);
  return {
    major: [],
    minor: minorTickVals.map((tickVal) => {
      return {
        value: tickVal,
        tickFormattedString: formatter.formatTick(tickVal),
      };
    }),
  };
}

function getTicksForTemporalScale(
  scale: Scale,
  formatter: Formatter,
  maxMinorTickCount: number,
  lowAndHigh: [number, number]
): {minor: MinorTick[]; major: MajorTick[]} {
  const [low, high] = lowAndHigh;
  let majorTicks = scale.ticks(lowAndHigh, 2);
  if (high - low >= DAY_IN_MS || majorTicks.length > 2) {
    // Return standard ticks.
    return getStandardTicks(scale, formatter, maxMinorTickCount, lowAndHigh);
  }

  const minorTickVals = scale.ticks(lowAndHigh, maxMinorTickCount);
  return {
    major: majorTicks.map((tickVal) => {
      return {
        start: tickVal,
        tickFormattedString: formatter.formatShort(tickVal),
      };
    }),
    minor: minorTickVals.map((tickVal) => {
      return {
        value: tickVal,
        tickFormattedString: formatter.formatTick(tickVal),
      };
    }),
  };
}

function getTicksForLinearScale(
  scale: LinearScale,
  formatter: Formatter,
  maxMinorTickCount: number,
  lowAndHigh: [number, number]
): {minor: MinorTick[]; major: MajorTick[]} {
  const [low, high] = lowAndHigh;
  const diff = Math.abs(high - low);
  if (diff > 1e-3) {
    // Return standard ticks.
    return getStandardTicks(scale, formatter, maxMinorTickCount, lowAndHigh);
  }

  const minorTickVals = scale.ticks([low, high], maxMinorTickCount);
  const majorTickVals = scale.ticks([low, high], 2);

  // If the numbers are small enough that javascript starts using scientific
  // notation the logic here does not work. Also, those numbers normally show up
  // well using the standard ticks.
  if (
    containsScientificNotation(minorTickVals) ||
    containsScientificNotation(majorTickVals)
  ) {
    return getStandardTicks(scale, formatter, maxMinorTickCount, lowAndHigh);
  }

  const minor: MinorTick[] = [];

  let numFractionalToKeep = getNumLeadingZerosInFractional(diff);

  // In case the low and highs are 0 and [0, 1), e.g., [0, 0.0001], we would
  // like to keep a bit more fractionals than other cases. For example, For
  // above example, the `diff` is `0.0001` and `numFractionalToKeep` is
  // 3 (number of leading zeros after decimals). That would effectively make
  // majorTickVal just `0` and provide very awkward UX. For that case, we want
  // to keep one extra fractional number.
  if (
    diff < 1 &&
    majorTickVals.every((tickVal) => {
      const absTickVal = Math.abs(tickVal);
      return absTickVal >= 0 && absTickVal < 1;
    })
  ) {
    numFractionalToKeep += 1;
  }

  const majorTickValMap = new Map<number, MajorTick>();
  for (const val of majorTickVals) {
    const [whole, fractional = ''] = String(val).split('.', 2);
    // Rounded to the n
    const flooredNumber = Number(
      whole + '.' + fractional.slice(0, numFractionalToKeep)
    );
    majorTickValMap.set(flooredNumber, {
      // Put it in the middle. If the flooredNumber is 231.041, then put the axis label
      // at 231.0415 which is not the most ideal but certainly better than 231.041.
      start: flooredNumber,
      tickFormattedString:
        flooredNumber === 0 ? '—' : formatter.formatReadable(flooredNumber),
    });
  }

  const maximumDiff = 10 * Math.pow(10, -numFractionalToKeep);

  for (const val of minorTickVals) {
    for (const flooredMajorVal of [...majorTickValMap.keys()].reverse()) {
      const diff = val - flooredMajorVal;
      if (diff >= 0 && diff < maximumDiff) {
        // `diff` can have very minute number because of IEEE 754.

        // When major axis is `0`, there is no right way to truncate it. Use the
        // real formatter in that case.
        if (flooredMajorVal === 0) {
          minor.push({
            value: val,
            tickFormattedString: formatter.formatTick(val),
          });
        } else {
          const remainder = String(val).slice(String(flooredMajorVal).length);
          minor.push({
            value: val,
            tickFormattedString: `…${remainder || '0'}`,
          });
        }

        break;
      }
    }
  }

  return {major: Array.from(majorTickValMap.values()), minor};
}

const canvasForMeasure = document.createElement('canvas').getContext('2d');

/**
 * Filters minor ticks by their position and dimensions so each label does not
 * get overlapped with another.
 * @param minorTicks Minor ticks to be filtered.
 * @param getDomPos A function that returns position of a tick in a DOM.
 * @param axis Whether tick is for 'x' or 'y' axis.
 * @param axisFont Font used for the axis label.
 * @param marginBetweenAxis Optional required spacing between labels.
 * @returns Filtered minor ticks based on their visibilities.
 */
function filterTicksByVisibility(
  minorTicks: MinorTick[],
  getDomPos: (tick: MinorTick) => number,
  axis: 'x' | 'y',
  axisFont: string,
  marginBetweenAxis = 5
): MinorTick[] {
  if (!minorTicks.length || !canvasForMeasure) return minorTicks;
  // While tick is in data coordinate system, DOM is on the opposite system;
  // while pixels go from top=0 to down, data goes from bottom=0 to up.
  const coordinateUnit = axis === 'x' ? 1 : -1;

  let currentMax: number | null = null;
  return minorTicks.filter((tick) => {
    const position = getDomPos(tick);
    canvasForMeasure.font = axisFont;
    const textMetrics = canvasForMeasure.measureText(tick.tickFormattedString);
    const textDim =
      axis === 'x'
        ? textMetrics.width
        : textMetrics.actualBoundingBoxAscent -
          textMetrics.actualBoundingBoxDescent;

    if (currentMax === null) {
      if (position + coordinateUnit * textDim < 0) {
        return false;
      }
      currentMax = position + coordinateUnit * textDim;
      return true;
    }

    if (
      coordinateUnit *
        (currentMax + coordinateUnit * marginBetweenAxis - position) >
      0
    ) {
      return false;
    }
    currentMax = position + coordinateUnit * textDim;
    return true;
  });
}

function containsScientificNotation(values: number[]): boolean {
  for (const value of values) {
    if (String(value).includes('e')) {
      return true;
    }
  }
  return false;
}

export const AxisUtils = {
  getStandardTicks,
  getTicksForTemporalScale,
  getTicksForLinearScale,
  filterTicksByVisibility,
};

export const TEST_ONLY = {containsScientificNotation};
