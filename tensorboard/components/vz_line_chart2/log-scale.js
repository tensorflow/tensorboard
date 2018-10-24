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
    // Smallest positive non-zero value represented by IEEE 754 binary (64 bit)
    // floating-point number.
    // https://www.ecma-international.org/ecma-262/5.1/#sec-8.5
    var MIN_POSITIVE_VALUE = Math.pow(2, -1074);
    function log(x) {
        return Math.log10(x);
    }
    function pow(x) {
        return Math.pow(10, x);
    }
    var LogScale = /** @class */ (function (_super) {
        __extends(LogScale, _super);
        function LogScale() {
            var _this = _super.call(this) || this;
            _this._d3LogScale = d3.scaleLog();
            _this.padProportion(.2);
            return _this;
        }
        LogScale.prototype.scale = function (x) {
            // Returning NaN makes sure line plot does not plot illegal values.
            if (x <= 0)
                return NaN;
            return this._d3LogScale(x);
        };
        LogScale.prototype.invert = function (x) {
            return this._d3LogScale.invert(x);
        };
        LogScale.prototype.scaleTransformation = function (value) {
            return this.scale(value);
        };
        LogScale.prototype.invertedTransformation = function (value) {
            return this.invert(value);
        };
        LogScale.prototype.getTransformationDomain = function () {
            return this.domain();
        };
        LogScale.prototype._getDomain = function () {
            return this._untransformedDomain;
        };
        LogScale.prototype._setDomain = function (values) {
            this._untransformedDomain = values;
            var min = values[0], max = values[1];
            _super.prototype._setDomain.call(this, [Math.max(MIN_POSITIVE_VALUE, min), max]);
        };
        /**
         * Given a domain, pad it and clip the lower bound to MIN_POSITIVE_VALUE.
         */
        LogScale.prototype._niceDomain = function (domain, count) {
            var low = domain[0], high = domain[1];
            var adjustedLogLow = Math.max(log(MIN_POSITIVE_VALUE), log(low));
            var logHigh = log(high);
            var pad = (logHigh - adjustedLogLow) * this.padProportion();
            var logLowFloor = Math.floor(adjustedLogLow);
            var logHighCeil = Math.ceil(logHigh);
            return [
                pow(Math.max(log(MIN_POSITIVE_VALUE), adjustedLogLow - pad, logLowFloor)),
                pow(Math.min(logHigh + pad, logHighCeil)),
            ];
        };
        /**
         * Generates a possible extent based on data from all plots the scale is
         * connected to by taking the minimum and maximum values of all extents for
         * lower and upper bound, respectively.
         * @override to remove default padding logic.
         */
        LogScale.prototype._getUnboundedExtent = function (ignoreAttachState) {
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
        LogScale.prototype._getAllIncludedValues = function (ignoreAttachState) {
            if (ignoreAttachState === void 0) { ignoreAttachState = false; }
            var values = _super.prototype._getAllIncludedValues.call(this);
            // For log scale, the value cannot be smaller or equal to 0. They are
            // negative infinity.
            return values.map(function (x) { return x > 0 ? x : MIN_POSITIVE_VALUE; });
        };
        LogScale.prototype._defaultExtent = function () {
            return [1, 10];
        };
        LogScale.prototype._backingScaleDomain = function (values) {
            if (values == null) {
                return this._d3LogScale.domain();
            }
            else {
                this._d3LogScale.domain(values);
                return this;
            }
        };
        LogScale.prototype._getRange = function () {
            return this._d3LogScale.range();
        };
        LogScale.prototype._setRange = function (values) {
            this._d3LogScale.range(values);
        };
        LogScale.prototype.defaultTicks = function () {
            return this._d3LogScale.ticks(1);
        };
        LogScale.prototype.ticks = function () {
            return this._d3LogScale.ticks();
        };
        /**
         * Returns an `extent` for a data series. In log-scale, we must omit all
         * non-positive values when computing a `domain`.
         * @override
         */
        LogScale.prototype.extentOfValues = function (values) {
            // Log can only take positive values.
            var legalValues = values
                .filter(function (x) { return Plottable.Utils.Math.isValidNumber(x) && x > 0; });
            var filteredValues = legalValues;
            if (this.ignoreOutlier()) {
                var logValues = legalValues.map(log);
                var sortedLogValues = logValues.sort(function (a, b) { return a - b; });
                var a_1 = d3.quantile(sortedLogValues, 0.05);
                var b_1 = d3.quantile(sortedLogValues, 0.95);
                filteredValues = sortedLogValues.filter(function (x) { return x >= a_1 && x <= b_1; }).map(pow);
            }
            var extent = d3.extent(filteredValues);
            return extent[0] == null || extent[1] == null ? [] : extent;
        };
        return LogScale;
    }(vz_line_chart2.TfScale));
    vz_line_chart2.LogScale = LogScale;
})(vz_line_chart2 || (vz_line_chart2 = {})); //  namespace vz_line_chart2
