var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
    var LinearScale = /** @class */ (function (_super) {
        __extends(LinearScale, _super);
        function LinearScale() {
            var _this = _super.call(this) || this;
            _this._ignoreOutlier = false;
            _this.padProportion(.2);
            return _this;
        }
        LinearScale.prototype.setValueProviderForDomain = function (provider) {
            this._valueProviderForDomain = provider;
            return this;
        };
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
        LinearScale.prototype._niceDomain = function (domain, count) {
            var a = domain[0], b = domain[1];
            var padding;
            var span = b - a;
            if (span === 0) {
                // If b===a, we would create an empty range. We instead select the range
                // [0, 2*a] if a > 0, or [-2*a, 0] if a < 0, plus a little bit of
                // extra padding on the top and bottom of the plot.
                padding = Math.abs(a) * 1.1 + 1.1;
            }
            else {
                padding = span * this.padProportion();
            }
            var lower;
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
            return _super.prototype._niceDomain.call(this, [lower, b + padding], count);
        };
        /**
         * @override to remove default padding logic.
         */
        LinearScale.prototype._getUnboundedExtent = function (ignoreAttachState) {
            var includedValues = this._getAllIncludedValues(ignoreAttachState);
            var extent = this._defaultExtent();
            if (includedValues.length !== 0) {
                var combinedExtent = [
                    Plottable.Utils.Math.min(includedValues, extent[0]),
                    Plottable.Utils.Math.max(includedValues, extent[1]),
                ];
                extent = this._niceDomain(combinedExtent);
            }
            return extent;
        };
        /**
         * @override
         */
        LinearScale.prototype._getAllIncludedValues = function (ignoreAttachState) {
            if (ignoreAttachState === void 0) { ignoreAttachState = false; }
            var values = this._valueProviderForDomain ?
                this._valueProviderForDomain() : [];
            return this.extentOfValues(values);
        };
        /**
         * @override to apply the outlier logic.
         */
        LinearScale.prototype.extentOfValues = function (values) {
            var legalValues = values
                .filter(function (x) { return Plottable.Utils.Math.isValidNumber(x); });
            var filteredValues = legalValues;
            if (this.ignoreOutlier()) {
                var sortedValues = legalValues.sort(function (a, b) { return a - b; });
                var a_1 = d3.quantile(sortedValues, 0.05);
                var b_1 = d3.quantile(sortedValues, 0.95);
                filteredValues = legalValues.filter(function (x) { return x >= a_1 && x <= b_1; });
            }
            var extent = d3.extent(filteredValues);
            return extent[0] == null || extent[1] == null ? [] : extent;
        };
        LinearScale.prototype.ignoreOutlier = function (ignore) {
            if (typeof ignore == 'boolean') {
                this._ignoreOutlier = ignore;
                return this;
            }
            return this._ignoreOutlier;
        };
        return LinearScale;
    }(Plottable.Scales.Linear));
    vz_line_chart2.LinearScale = LinearScale;
})(vz_line_chart2 || (vz_line_chart2 = {})); // namespace vz_line_chart2
