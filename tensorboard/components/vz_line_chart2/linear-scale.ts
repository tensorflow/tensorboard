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
import {
  createScale,
  ScaleType,
} from '../../webapp/widgets/line_chart_v2/lib/scale';
import {ITfScale, ValueProviderForDomain} from './tf-scale';

export class LinearScale extends Plottable.Scales.Linear implements ITfScale {
  private _ignoreOutlier: boolean = false;
  protected _valueProviderForDomain: ValueProviderForDomain;
  constructor() {
    super();
    this.padProportion(0.2);
  }
  public setValueProviderForDomain(provider: ValueProviderForDomain): this {
    this._valueProviderForDomain = provider;
    return this;
  }
  /**
   * @override
   */
  protected override _niceDomain(domain: number[], count?: number): number[] {
    const [a, b] = domain;

    return createScale(ScaleType.LINEAR).niceDomain([a, b]);
  }
  /**
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
  /**
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
  /**
   * @override to apply the outlier logic.
   */
  public override extentOfValues(values: number[]): number[] {
    const legalValues = values.filter((x) =>
      Plottable.Utils.Math.isValidNumber(x)
    );
    let filteredValues = legalValues;
    if (this.ignoreOutlier()) {
      const sortedValues = legalValues.sort((a, b) => a - b);
      const a = d3.quantile(sortedValues, 0.05)!;
      const b = d3.quantile(sortedValues, 0.95)!;
      filteredValues = legalValues.filter((x) => x >= a && x <= b);
    }
    const extent = d3.extent(filteredValues);
    return extent[0] == null || extent[1] == null ? [] : extent;
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
}
