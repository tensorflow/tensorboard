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
import * as Plottable from 'plottable';

export type ValueProviderForDomain = () => number[];
/**
 * Plottable.Scale is a class that wraps the d3.scale that adds many utility
 * methods that work with the Plottable's `dataset` concept.
 *
 * Plottable.Scale provides some cool feature where a scale is bound to set of
 * plots (i.e., line, scatter, smooth line chart, etc...) and, when a dataset
 * of a plot changes, updates the domain based on minimum and maximum values of
 * each charts. In some Plottable functions, a word `extent` is used to refer to
 * a possible value for a domain and it often is the minimum and maximum value
 * of a dataset of a plot.
 *
 * Above binding is quite useful in most cases but is rather harmful for the
 * line-chart. The line-chart draws multiple plots -- a line plot for raw data,
 * another line plot for smoothed data, a scatter plot for tooltip, and etc...
 * These plots all derive data from the raw data series, so it is rather odd to
 * compute `extent` for each plot separately. Moreover, we want to set the
 * domain with respect to a solid colored line (when using smoothing, it is the
 * smoothed line plot) regardless of the extent of the raw data. Hence, we need
 * an ability to disregard dataset of certain plots when computed domain but
 * such capability is not opened from the Plottable.
 *
 * To mitigate the issue, TfScale overrides few methods and receives data from
 * the LineChart instead of a respective plots the chart draws.
 */
export interface ITfScale extends Plottable.QuantitativeScale<number> {
  setValueProviderForDomain(provider: ValueProviderForDomain): this;
  ignoreOutlier(): boolean;
  ignoreOutlier(ignore: boolean): this;
}
export abstract class TfScale
  extends Plottable.QuantitativeScale<number>
  implements ITfScale
{
  protected _ignoreOutlier: boolean = false;
  protected _valueProviderForDomain: ValueProviderForDomain;
  public setValueProviderForDomain(provider: ValueProviderForDomain): this {
    this._valueProviderForDomain = provider;
    return this;
  }
  public ignoreOutlier(): boolean;
  public ignoreOutlier(ignore: boolean): this;
  public ignoreOutlier(ignore?: boolean): any {
    if (typeof ignore == 'boolean') {
      this._ignoreOutlier = ignore;
      return this;
    }
    return this._ignoreOutlier;
  }
  /**
   * Returns possible `extent`s for a dataset. Note that a dataset can contain
   * multiple series. Unlike the method name suggests, it uses values from each
   * series to return `extent`s.
   * @override
   */
  protected override _getAllIncludedValues(
    ignoreAttachState = false
  ): number[] {
    const values = this._valueProviderForDomain
      ? this._valueProviderForDomain()
      : [];
    return this.extentOfValues(values);
  }
}
