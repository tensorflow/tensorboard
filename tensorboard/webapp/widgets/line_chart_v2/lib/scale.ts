/* Copyright 2020 The TensorFlow Authors. All Rights Reserved.

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
import {scaleLinear, scaleLog} from '../../../third_party/d3';

import {ScaleType} from './scale_types';

/**
 * A `Scale` takes `domain` and sometimes `range` and provide coordinate system
 * transformation and convenience method around interval. Similar abstraction as d3.scale.
 *
 * Unlike d3.scale, it is pure and does not have performance impact.
 *
 * Important: both `domain` and `range` require to be finite numbers. The order of the
 * values do not matter (e.g., domain[1] < domain[0] is okay).
 */
export interface Scale {
  /**
   * Converts `x` in `domain` coordinates into `range` coordinates.
   */
  forward(domain: [number, number], range: [number, number], x: number): number;

  /**
   * Converts `x` in `range` coordinates into `domain` coordinates.
   */
  reverse(domain: [number, number], range: [number, number], x: number): number;

  /**
   * Attempts to transform domain into nice round numbers. Analogous to `d3.nice`.
   *
   * @param domain Two finite numbers to compuute round number from.
   */
  niceDomain(domain: [number, number]): [number, number];

  /**
   * Returns "human friendly" numbers between the `domain` that can be used for ticks and
   * grid.
   *
   * In case the spread of an interval is 0 or negligible, it can return an empty array
   * depending on an implementation.
   *
   * Examples:
   *   ticks([0, 10], 5) -> [0, 2, 4, 6, 8, 10]
   *   ticks([10, 0], 5) -> [10, 8, 6, 4, 2, 0]
   *   ticks([10, 10], 5) -> []
   *
   * @param domain Interval in which tick should be created.
   * @param sizeGuidance approximate number of the ticks. Depending on the domain, it
   *    may return less or more ticks.
   */
  ticks(domain: [number, number], sizeGuidance: number): number[];
}

export function createScale(type: ScaleType): Scale {
  switch (type) {
    case ScaleType.LINEAR:
      return new LinearScale();
    case ScaleType.LOG10:
      return new Log10Scale();
    default:
      const _: never = type;
      throw new RangeError(`ScaleType ${_} not supported.`);
  }
}

const PADDING_RATIO = 0.05;
const MIN_SIGNIFICANT_PADDING = 0.01;

class LinearScale implements Scale {
  private transform(
    inputSpace: [number, number],
    outputSpace: [number, number],
    x: number
  ): number {
    const [inputMin, inputMax] = inputSpace;
    const inputSpread = inputMax - inputMin;
    const [outputMin, outputMax] = outputSpace;
    const outputSpread = outputMax - outputMin;

    if (inputSpread === 0) {
      return outputMin;
    }

    return (outputSpread / inputSpread) * (x - inputMin) + outputMin;
  }

  forward(
    domain: [number, number],
    range: [number, number],
    x: number
  ): number {
    return this.transform(domain, range, x);
  }

  reverse(
    domain: [number, number],
    range: [number, number],
    x: number
  ): number {
    return this.transform(range, domain, x);
  }

  niceDomain(domain: [number, number]): [number, number] {
    let [min, max] = domain;
    if (max < min) {
      throw new Error('Unexpected input: min is larger than max');
    }

    const scale = scaleLinear();
    const padding =
      max === min
        ? // In case both `min` and `max` are 0, we want some padding.
          Math.max(min * PADDING_RATIO, MIN_SIGNIFICANT_PADDING)
        : (max - min + Number.EPSILON) * PADDING_RATIO;
    const [niceMin, niceMax] = scale
      .domain([min - padding, max + padding])
      .nice()
      .domain();
    return [niceMin, niceMax];
  }

  ticks(domain: [number, number], sizeGuidance: number): number[] {
    return scaleLinear().domain(domain).ticks(sizeGuidance);
  }
}

class Log10Scale implements Scale {
  private transform(x: number): number {
    return Math.log10(x > 0 ? x : Number.MIN_VALUE);
  }

  private untransform(x: number): number {
    return Math.exp(x / Math.LOG10E);
  }

  forward(
    domain: [number, number],
    range: [number, number],
    x: number
  ): number {
    if (x <= 0) {
      return range[0];
    }

    const [domainMin, domainMax] = domain;
    const [rangeMin, rangeMax] = range;

    const transformedMin = this.transform(domainMin);
    const transformedMax = this.transform(domainMax);
    const domainSpread = transformedMax - transformedMin;
    const rangeSpread = rangeMax - rangeMin;
    x = this.transform(x);

    return (
      (rangeSpread / (domainSpread + Number.EPSILON)) * (x - transformedMin) +
      rangeMin
    );
  }

  reverse(
    domain: [number, number],
    range: [number, number],
    x: number
  ): number {
    const [domainMin, domainMax] = domain;
    const [rangeMin, rangeMax] = range;

    const transformedMin = this.transform(domainMin);
    const transformedMax = this.transform(domainMax);
    const domainSpread = transformedMax - transformedMin;
    const rangeSpread = rangeMax - rangeMin;

    const val =
      (domainSpread / (rangeSpread + Number.EPSILON)) * (x - rangeMin) +
      transformedMin;
    return this.untransform(val);
  }

  niceDomain(domain: [number, number]): [number, number] {
    const [min, max] = domain;
    if (min > max) {
      throw new Error('Unexpected input: min is larger than max');
    }

    const adjustedMin = Math.max(min, Number.MIN_VALUE);
    const adjustedMax = Math.max(max, Number.MIN_VALUE);
    if (min <= 0 || max <= 0) {
      return [adjustedMin, adjustedMax];
    }

    const numericMinLogValue = this.transform(Number.MIN_VALUE);
    const minLogValue = this.transform(adjustedMin);
    const maxLogValue = this.transform(adjustedMax);

    const spreadInLog = maxLogValue - minLogValue;
    const padInLog =
      spreadInLog > 0
        ? spreadInLog * PADDING_RATIO
        : // In case `minLogValue` is 0 (i.e., log_10(1) = 0), we want some padding.
          Math.max(
            Math.abs(minLogValue * PADDING_RATIO),
            MIN_SIGNIFICANT_PADDING
          );

    return [
      this.untransform(Math.max(numericMinLogValue, minLogValue - padInLog)),
      this.untransform(maxLogValue + padInLog),
    ];
  }

  ticks(domain: [number, number], sizeGuidance: number): number[] {
    const low = domain[0] <= 0 ? Number.MIN_VALUE : domain[0];
    const high = domain[1] <= 0 ? Number.MIN_VALUE : domain[1];
    const ticks = scaleLog().domain([low, high]).ticks(sizeGuidance);
    return ticks.length ? ticks : domain;
  }
}
