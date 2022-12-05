/* Copyright 2018 The TensorFlow Authors. All Rights Reserved.

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
import * as d3 from 'd3';
import * as Plottable from 'plottable';
import {TfScale} from './tf-scale';

// Smallest positive non-zero value represented by IEEE 754 binary (64 bit)	import * as d3 from 'd3';
// floating-point number.
// https://www.ecma-international.org/ecma-262/5.1/#sec-8.5
export const MIN_POSITIVE_VALUE = Math.pow(2, -1074);

function log(x: number): number {
  return Math.log10(x);
}

function pow(x: number): number {
  return Math.pow(10, x);
}
/**
 * A logarithmic scale that returns NaN for all non-positive values as it
 * mathematically is supposed to be -Infinity. Also, due to the floating point
 * precision issue, it treats all values smaller than MIN_POSITIVE_VALUE as
 * non-positive. Lastly, if using autoDomain feature and if all values are the
 * same value, it pads 10% of the value.
 */
export class LogScale extends TfScale {
  private _d3LogScale = d3.scaleLog();
  private _untransformedDomain: number[];
  constructor() {
    super();
    this.padProportion(0.2);
  }
  public override scale(x: number): number {
    // Returning NaN makes sure line plot does not plot illegal values.
    if (x <= 0) return NaN;
    return this._d3LogScale(x);
  }
  public override invert(x: number): number {
    return this._d3LogScale.invert(x);
  }
  public override scaleTransformation(value: number) {
    return this.scale(value);
  }
  public override invertedTransformation(value: number) {
    return this.invert(value);
  }
  public override getTransformationDomain(): [number, number] {
    return this.domain() as [number, number];
  }
  public override setTransformationDomain(domain: [number, number]) {
    this.domain(domain);
  }
  public override getTransformationExtent(): [number, number] {
    return this._getUnboundedExtent(true) as [number, number];
  }
  protected override _getDomain() {
    return this._untransformedDomain;
  }
  protected override _setDomain(values: number[]) {
    this._untransformedDomain = values;
    const [min, max] = values;
    super._setDomain([Math.max(MIN_POSITIVE_VALUE, min), max]);
  }
  /**
   * Given a domain, pad it and clip the lower bound to MIN_POSITIVE_VALUE.
   */
  protected override _niceDomain(domain: number[], count?: number): number[] {
    const [low, high] = domain;
    const adjustedLogLow = Math.max(log(MIN_POSITIVE_VALUE), log(low));
    const logHigh = log(high);
    const spread = logHigh - adjustedLogLow;
    const pad = spread ? spread * this.padProportion() : 1;
    return [
      pow(Math.max(log(MIN_POSITIVE_VALUE), adjustedLogLow - pad)),
      pow(logHigh + pad),
    ];
  }
  /**
   * Generates a possible extent based on data from all plots the scale is
   * connected to by taking the minimum and maximum values of all extents for
   * lower and upper bound, respectively.
   * @override to remove default padding logic.
   */
  protected override _getUnboundedExtent(ignoreAttachState): number[] {
    const includedValues = this._getAllIncludedValues(ignoreAttachState);
    let extent = this._defaultExtent();
    if (includedValues.length !== 0) {
      const combinedExtent = [
        Plottable.Utils.Math.min<number>(includedValues, extent[0]),
        Plottable.Utils.Math.max<number>(includedValues, extent[1]),
      ];
      extent = this._niceDomain(combinedExtent);
    }
    return extent;
  }
  protected override _getAllIncludedValues(
    ignoreAttachState = false
  ): number[] {
    const values = super._getAllIncludedValues();
    // For log scale, the value cannot be smaller or equal to 0. They are
    // negative infinity.
    return values.map((x) => (x > 0 ? x : MIN_POSITIVE_VALUE));
  }
  protected override _defaultExtent(): number[] {
    return [1, 10];
  }
  protected override _backingScaleDomain(): number[];
  protected override _backingScaleDomain(values: number[]): this;
  protected override _backingScaleDomain(values?: number[]): any {
    if (values == null) {
      return this._d3LogScale.domain();
    } else {
      this._d3LogScale.domain(values);
      return this;
    }
  }
  protected override _getRange() {
    return this._d3LogScale.range();
  }
  protected override _setRange(values: number[]) {
    this._d3LogScale.range(values);
  }
  public override defaultTicks(): number[] {
    return this._d3LogScale.ticks(1);
  }
  public override ticks(): number[] {
    return this._d3LogScale.ticks();
  }
  /**
   * Returns an `extent` for a data series. In log-scale, we must omit all
   * non-positive values when computing a `domain`.
   * @override
   */
  public override extentOfValues(values: number[]): number[] {
    // Log can only take positive values.
    const legalValues = values.filter(
      (x) => Plottable.Utils.Math.isValidNumber(x) && x > 0
    );
    let filteredValues = legalValues;
    if (this.ignoreOutlier()) {
      const logValues = legalValues.map(log);
      const sortedLogValues = logValues.sort((a, b) => a - b);
      const a = d3.quantile(sortedLogValues, 0.05)!;
      const b = d3.quantile(sortedLogValues, 0.95)!;
      filteredValues = sortedLogValues.filter((x) => x >= a && x <= b).map(pow);
    }
    const extent = d3.extent(filteredValues);
    return extent[0] == null || extent[1] == null ? [] : extent;
  }
}
