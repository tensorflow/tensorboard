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

export function getTicks(
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

export function getTicksForTemporalScale(
  scale: Scale,
  formatter: Formatter,
  maxMinorTickCount: number,
  lowAndHigh: [number, number]
): {minor: MinorTick[]; major: MajorTick[]} {
  const [low, high] = lowAndHigh;
  let majorTicks = scale.ticks(lowAndHigh, 2);
  if (high - low >= DAY_IN_MS || majorTicks.length > 2) {
    majorTicks = [];
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

export function getTicksForLinearScale(
  scale: LinearScale,
  formatter: Formatter,
  maxMinorTickCount: number,
  lowAndHigh: [number, number]
): {minor: MinorTick[]; major: MajorTick[]} {
  const [low, high] = lowAndHigh;
  const diff = Math.abs(high - low);
  if (diff > 1e-3) {
    return getTicks(scale, formatter, maxMinorTickCount, lowAndHigh);
  }

  const minorTickVals = scale.ticks([low, high], maxMinorTickCount);
  const numFractionalToKeep = getNumLeadingZerosInFractional(diff);
  const majorTickVals = scale.ticks([low, high], 2);
  const minor: MinorTick[] = [];

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
      tickFormattedString: formatter.formatShort(flooredNumber),
    });
  }

  const maximumDiff = 10 * Math.pow(10, -numFractionalToKeep);

  for (const val of minorTickVals) {
    for (const flooredMajorVal of majorTickValMap.keys()) {
      const diff = Math.abs(val - flooredMajorVal);
      if (diff >= 0 && diff < maximumDiff) {
        // `diff` can have very minute number because of IEEE 754.
        const remainder = String(val).slice(String(flooredMajorVal).length);
        minor.push({
          value: val,
          tickFormattedString: `…${remainder || '0'}`,
        });
        break;
      }
    }
  }

  return {major: Array.from(majorTickValMap.values()), minor};
}
