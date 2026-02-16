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
import {scaleLinear, scaleLog, scaleTime} from '../../../third_party/d3';
import {numberFormatter, wallTimeFormatter} from './formatter';
import {Scale, ScaleType} from './scale_types';

export {ScaleType} from './scale_types';

export function createScale(
  type: ScaleType,
  symlogLinearThreshold: number = 1
): Scale {
  switch (type) {
    case ScaleType.LINEAR:
      return new LinearScale();
    case ScaleType.LOG10:
      return new Log10Scale();
    case ScaleType.SYMLOG10:
      return new SymLog10Scale(symlogLinearThreshold);
    case ScaleType.TIME:
      return new TemporalScale();
    default:
      const _: never = type;
      throw new RangeError(`ScaleType ${_} not supported.`);
  }
}

const PADDING_RATIO = 0.05;

export class LinearScale implements Scale {
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

    if (max === min) {
      if (min === 0) return [-1, 1];
      if (min < 0) return [2 * min, 0];
      return [0, 2 * min];
    }

    const scale = scaleLinear();
    const padding = (max - min + Number.EPSILON) * PADDING_RATIO;
    const [niceMin, niceMax] = scale
      .domain([min - padding, max + padding])
      .nice()
      .domain();
    return [niceMin, niceMax];
  }

  ticks(domain: [number, number], sizeGuidance: number): number[] {
    return scaleLinear().domain(domain).ticks(sizeGuidance);
  }

  isSafeNumber(x: number): boolean {
    return Number.isFinite(x);
  }

  defaultFormatter = numberFormatter;
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

    if (max <= 0) {
      // When both min and max are non-positive, clip to [Number.MIN_VALUE, 1].
      return [Number.MIN_VALUE, 1];
    }

    return [Math.max(Number.MIN_VALUE, adjustedMin * 0.5), adjustedMax * 2];
  }

  ticks(domain: [number, number], sizeGuidance: number): number[] {
    const low = domain[0] <= 0 ? Number.MIN_VALUE : domain[0];
    const high = domain[1] <= 0 ? Number.MIN_VALUE : domain[1];
    const ticks = scaleLog().domain([low, high]).ticks(sizeGuidance);
    return ticks.length ? ticks : domain;
  }

  isSafeNumber(x: number): boolean {
    return Number.isFinite(x) && x > 0;
  }

  defaultFormatter = numberFormatter;
}

/**
 * Symmetric log scale (base 10) that handles both positive and negative values.
 * Uses the log-modulus transformation: sign(x) * log10(|x|/c + 1)
 * where c is the linear threshold parameter.
 *
 * Key properties:
 * - Handles zero: symlog(0) = 0
 * - Handles negative values: symlog(-x) = -symlog(x)
 * - Behaves linearly near zero (when |x| << c)
 * - Behaves logarithmically for large |x|
 * - c controls the width of the linear region:
 *   c = 1 (default): linear near |x| < 1
 *   c = 10: linear near |x| < 10
 *   c = 0.01: linear near |x| < 0.01
 */
class SymLog10Scale implements Scale {
  private readonly c: number;

  constructor(linearThreshold: number = 1) {
    this.c = Math.max(linearThreshold, Number.MIN_VALUE);
  }

  /**
   * Symmetric log transformation: sign(x) * log10(|x|/c + 1)
   */
  private transform(x: number): number {
    return Math.sign(x) * Math.log10(Math.abs(x) / this.c + 1);
  }

  /**
   * Inverse of symmetric log: sign(y) * c * (10^|y| - 1)
   */
  private untransform(y: number): number {
    return Math.sign(y) * this.c * (Math.pow(10, Math.abs(y)) - 1);
  }

  forward(
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

    if (domainSpread === 0) {
      return rangeMin;
    }

    const transformedX = this.transform(x);
    return (
      (rangeSpread / domainSpread) * (transformedX - transformedMin) + rangeMin
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

    if (rangeSpread === 0) {
      return this.untransform(transformedMin);
    }

    const transformedVal =
      (domainSpread / rangeSpread) * (x - rangeMin) + transformedMin;
    return this.untransform(transformedVal);
  }

  niceDomain(domain: [number, number]): [number, number] {
    const [min, max] = domain;
    if (min > max) {
      throw new Error('Unexpected input: min is larger than max');
    }

    // For symlog, we want to expand the domain symmetrically in log space
    if (min === max) {
      if (min === 0) return [-1, 1];
      // Expand by factor of 2 in both directions (log space)
      if (min > 0) return [min * 0.5, max * 2];
      if (max < 0) return [min * 2, max * 0.5];
    }

    // Apply padding in the transformed space
    const transformedMin = this.transform(min);
    const transformedMax = this.transform(max);
    const spread = transformedMax - transformedMin;
    const padding = spread * PADDING_RATIO;

    return [
      this.untransform(transformedMin - padding),
      this.untransform(transformedMax + padding),
    ];
  }

  ticks(domain: [number, number], sizeGuidance: number): number[] {
    const [min, max] = domain;
    const transformedMin = this.transform(min);
    const transformedMax = this.transform(max);

    // Generate ticks in transformed space, then convert back
    const transformedTicks = scaleLinear()
      .domain([transformedMin, transformedMax])
      .ticks(sizeGuidance);

    // Convert back to original space and round to nice numbers
    return transformedTicks.map((t) => {
      const val = this.untransform(t);
      // Round to reasonable precision to avoid floating point artifacts
      if (Math.abs(val) < 1e-10) return 0;
      const magnitude = Math.floor(Math.log10(Math.abs(val)));
      const precision = Math.pow(10, magnitude - 2);
      return Math.round(val / precision) * precision;
    });
  }

  isSafeNumber(x: number): boolean {
    return Number.isFinite(x);
  }

  defaultFormatter = numberFormatter;
}

export class TemporalScale implements Scale {
  private readonly scale = scaleTime();

  forward(
    domain: [number, number],
    range: [number, number],
    x: number
  ): number {
    return this.scale.domain(domain).range(range)(x);
  }

  reverse(
    domain: [number, number],
    range: [number, number],
    x: number
  ): number {
    return this.scale.domain(domain).range(range).invert(x).getTime();
  }

  niceDomain(domain: [number, number]): [number, number] {
    const [minDate, maxDate] = this.scale.domain(domain).nice().domain();
    return [minDate.getTime(), maxDate.getTime()];
  }

  ticks(domain: [number, number], sizeGuidance: number): number[] {
    return this.scale
      .domain(domain)
      .ticks(sizeGuidance)
      .map((date) => date.getTime());
  }

  isSafeNumber(x: number): boolean {
    return Number.isFinite(x);
  }

  defaultFormatter = wallTimeFormatter;
}
