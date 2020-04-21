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
var vz_line_chart2;
(function (vz_line_chart2) {
    class LinearScale extends Plottable.Scales.Linear {
        constructor() {
            super();
            this._ignoreOutlier = false;
            this.padProportion(0.2);
        }
        setValueProviderForDomain(provider) {
            this._valueProviderForDomain = provider;
            return this;
        }
        /**
         * TODO(nickfelt): Examine whether we truly require `c`.
         * Adds some padding to a given domain. Specifically, it:
         * - returns about [-0.1a - c, 2.1a + c] when a = b and a >= 0.
         * - returns about [-2.1|a| - c, -0.1|a| + c] when a = b and a < 0.
         * - returns [-0.1b, b + padProportion * (b-a)] if b > 2a and a > 0
         * - else, pads by `padProportion`
         * Note that `c` is a constant offset which specifically is 1.1. Please refer
         * to [1] for its rationale.
         * @override
         */
        _niceDomain(domain, count) {
            const [a, b] = domain;
            let padding;
            const span = b - a;
            if (span === 0) {
                // If b===a, we would create an empty range. We instead select the range
                // [0, 2*a] if a > 0, or [-2*a, 0] if a < 0, plus a little bit of
                // extra padding on the top and bottom of the plot.
                padding = Math.abs(a) * 1.1 + 1.1;
            }
            else {
                padding = span * this.padProportion();
            }
            let lower;
            if (a >= 0 && a < span) {
                // [1]: We include the intercept (y = 0) if doing so less than doubles the
                // span of the y-axis. (We actually select a lower bound that's slightly
                // less than 0 so that 0.00 will clearly be written on the lower edge of
                // the chart. The label on the lowest tick is often filtered out.)
                lower = -0.1 * b;
            }
            else {
                lower = a - padding;
            }
            return super._niceDomain([lower, b + padding], count);
        }
        /**
         * @override to remove default padding logic.
         */
        _getUnboundedExtent(ignoreAttachState) {
            const includedValues = this._getAllIncludedValues(ignoreAttachState);
            let extent = this._defaultExtent();
            if (includedValues.length !== 0) {
                const combinedExtent = [
                    Plottable.Utils.Math.min(includedValues, extent[0]),
                    Plottable.Utils.Math.max(includedValues, extent[1]),
                ];
                extent = this._niceDomain(combinedExtent);
            }
            return extent;
        }
        /**
         * @override
         */
        _getAllIncludedValues(ignoreAttachState = false) {
            const values = this._valueProviderForDomain
                ? this._valueProviderForDomain()
                : [];
            return this.extentOfValues(values);
        }
        /**
         * @override to apply the outlier logic.
         */
        extentOfValues(values) {
            const legalValues = values.filter((x) => Plottable.Utils.Math.isValidNumber(x));
            let filteredValues = legalValues;
            if (this.ignoreOutlier()) {
                const sortedValues = legalValues.sort((a, b) => a - b);
                const a = d3.quantile(sortedValues, 0.05);
                const b = d3.quantile(sortedValues, 0.95);
                filteredValues = legalValues.filter((x) => x >= a && x <= b);
            }
            const extent = d3.extent(filteredValues);
            return extent[0] == null || extent[1] == null ? [] : extent;
        }
        ignoreOutlier(ignore) {
            if (typeof ignore == 'boolean') {
                this._ignoreOutlier = ignore;
                return this;
            }
            return this._ignoreOutlier;
        }
    }
    vz_line_chart2.LinearScale = LinearScale;
})(vz_line_chart2 || (vz_line_chart2 = {})); // namespace vz_line_chart2
