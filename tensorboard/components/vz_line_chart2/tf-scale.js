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
    var TfScale = /** @class */ (function (_super) {
        __extends(TfScale, _super);
        function TfScale() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this._ignoreOutlier = false;
            return _this;
        }
        TfScale.prototype.setValueProviderForDomain = function (provider) {
            this._valueProviderForDomain = provider;
            return this;
        };
        TfScale.prototype.ignoreOutlier = function (ignore) {
            if (typeof ignore == 'boolean') {
                this._ignoreOutlier = ignore;
                return this;
            }
            return this._ignoreOutlier;
        };
        /**
         * Returns possible `extent`s for a dataset. Note that a dataset can contain
         * multiple series. Unlike the method name suggests, it uses values from each
         * series to return `extent`s.
         * @override
         */
        TfScale.prototype._getAllIncludedValues = function (ignoreAttachState) {
            if (ignoreAttachState === void 0) { ignoreAttachState = false; }
            var values = this._valueProviderForDomain ?
                this._valueProviderForDomain() : [];
            return this.extentOfValues(values);
        };
        return TfScale;
    }(Plottable.QuantitativeScale));
    vz_line_chart2.TfScale = TfScale;
})(vz_line_chart2 || (vz_line_chart2 = {})); //  namespace vz_line_chart2
