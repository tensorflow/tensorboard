/* Copyright 2024 The TensorFlow Authors. All Rights Reserved.

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

/**
 * Symmetric log transformation: sign(x) * log10(|x|/c + 1)
 * This handles zero and negative values gracefully.
 * @param x Input value
 * @param c Linear threshold: the region |x| < c is approximately linear (default 1)
 */
function symlog(x: number, c: number = 1): number {
  return Math.sign(x) * Math.log10(Math.abs(x) / c + 1);
}

/**
 * Inverse of symmetric log: sign(y) * c * (10^|y| - 1)
 * @param y Transformed value
 * @param c Linear threshold (must match the c used in symlog)
 */
function symexp(y: number, c: number = 1): number {
  return Math.sign(y) * c * (Math.pow(10, Math.abs(y)) - 1);
}

/**
 * A symmetric logarithmic scale that handles both positive and negative values.
 * Uses the log-modulus transformation: sign(x) * log10(|x| + 1)
 *
 * Key properties:
 * - Handles zero: symlog(0) = 0
 * - Handles negative values: symlog(-x) = -symlog(x)
 * - Behaves linearly near zero (when |x| << 1)
 * - Behaves logarithmically for large |x|
 */
export class SymLogScale extends TfScale {
  private _d3LinearScale = d3.scaleLinear();
  private _untransformedDomain: number[] = [0, 1];

  constructor() {
    super();
    this.padProportion(0.2);
  }

  public override scale(x: number): number {
    if (!Number.isFinite(x)) return NaN;
    // Transform x to symlog space, then use linear scale
    const transformedX = symlog(x);
    return this._d3LinearScale(transformedX);
  }

  public override invert(screenVal: number): number {
    // Invert from screen space to symlog space, then to original space
    const transformedVal = this._d3LinearScale.invert(screenVal);
    return symexp(transformedVal);
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
    // Transform domain to symlog space for the underlying linear scale
    super._setDomain([min, max]);
    this._d3LinearScale.domain([symlog(min), symlog(max)]);
  }

  /**
   * Given a domain, pad it in the transformed (symlog) space.
   */
  protected override _niceDomain(domain: number[], count?: number): number[] {
    const [low, high] = domain;
    const transformedLow = symlog(low);
    const transformedHigh = symlog(high);
    const spread = transformedHigh - transformedLow;
    const pad = spread ? spread * this.padProportion() : 1;
    return [symexp(transformedLow - pad), symexp(transformedHigh + pad)];
  }

  /**
   * Generates a possible extent based on data from all plots the scale is
   * connected to by taking the minimum and maximum values of all extents for
   * lower and upper bound, respectively.
   * @override to remove default padding logic.
   */
  protected override _getUnboundedExtent(ignoreAttachState: boolean): number[] {
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
    // For symlog scale, all finite values are valid
    const values = super._getAllIncludedValues();
    return values.filter((x) => Number.isFinite(x));
  }

  protected override _defaultExtent(): number[] {
    return [-1, 1];
  }

  protected override _backingScaleDomain(): number[];
  protected override _backingScaleDomain(values: number[]): this;
  protected override _backingScaleDomain(values?: number[]): any {
    if (values == null) {
      return this._d3LinearScale.domain().map(symexp);
    } else {
      this._d3LinearScale.domain(values.map(symlog));
      return this;
    }
  }

  protected override _getRange() {
    return this._d3LinearScale.range();
  }

  protected override _setRange(values: number[]) {
    this._d3LinearScale.range(values);
  }

  public override defaultTicks(): number[] {
    const [min, max] = this._untransformedDomain;
    // Generate ticks in transformed space
    const transformedTicks = this._d3LinearScale.ticks(1);
    return transformedTicks.map(symexp);
  }

  public override ticks(): number[] {
    const transformedTicks = this._d3LinearScale.ticks();
    return transformedTicks.map((t) => {
      const val = symexp(t);
      // Round to reasonable precision
      if (Math.abs(val) < 1e-10) return 0;
      const magnitude = Math.floor(Math.log10(Math.abs(val) || 1));
      const precision = Math.pow(10, magnitude - 2);
      return Math.round(val / precision) * precision;
    });
  }

  /**
   * Returns an `extent` for a data series. In symlog-scale, all finite values
   * are valid.
   * @override
   */
  public override extentOfValues(values: number[]): number[] {
    const legalValues = values.filter(
      (x) => Plottable.Utils.Math.isValidNumber(x) && Number.isFinite(x)
    );
    let filteredValues = legalValues;
    if (this.ignoreOutlier()) {
      const transformedValues = legalValues.map(symlog);
      const sortedValues = transformedValues.sort((a, b) => a - b);
      const a = d3.quantile(sortedValues, 0.05)!;
      const b = d3.quantile(sortedValues, 0.95)!;
      filteredValues = sortedValues.filter((x) => x >= a && x <= b).map(symexp);
    }
    const extent = d3.extent(filteredValues);
    return extent[0] == null || extent[1] == null ? [] : extent;
  }
}
