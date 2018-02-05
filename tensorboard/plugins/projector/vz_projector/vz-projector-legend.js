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
/* Copyright 2016 The TensorFlow Authors. All Rights Reserved.

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
var vz_projector;
(function (vz_projector) {
    // tslint:disable-next-line
    vz_projector.LegendPolymer = vz_projector.PolymerElement({
        is: 'vz-projector-legend',
        properties: { renderInfo: { type: Object, observer: '_renderInfoChanged' } }
    });
    var Legend = /** @class */ (function (_super) {
        __extends(Legend, _super);
        function Legend() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Legend.prototype._renderInfoChanged = function () {
            var _this = this;
            if (this.renderInfo == null) {
                return;
            }
            if (this.renderInfo.thresholds) {
                // <linearGradient> is under dom-if so we should wait for it to be
                // inserted in the dom tree using async().
                this.async(function () { return _this.setupLinearGradient(); });
            }
        };
        Legend.prototype._getLastThreshold = function () {
            if (this.renderInfo == null || this.renderInfo.thresholds == null) {
                return;
            }
            return this.renderInfo.thresholds[this.renderInfo.thresholds.length - 1]
                .value;
        };
        Legend.prototype.getOffset = function (value) {
            var min = this.renderInfo.thresholds[0].value;
            var max = this.renderInfo.thresholds[this.renderInfo.thresholds.length - 1].value;
            return (100 * (value - min) / (max - min)).toFixed(2) + '%';
        };
        Legend.prototype.setupLinearGradient = function () {
            var _this = this;
            var linearGradient = this.querySelector('#gradient');
            var width = this.querySelector('svg.gradient').clientWidth;
            // Set the svg <rect> to be the width of its <svg> parent.
            this.querySelector('svg.gradient rect').style.width =
                width + 'px';
            // Remove all <stop> children from before.
            linearGradient.innerHTML = '';
            // Add a <stop> child in <linearGradient> for each gradient threshold.
            this.renderInfo.thresholds.forEach(function (t) {
                var stopElement = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
                stopElement.setAttribute('offset', _this.getOffset(t.value));
                stopElement.setAttribute('stop-color', t.color);
            });
        };
        return Legend;
    }(vz_projector.LegendPolymer));
    vz_projector.Legend = Legend;
    document.registerElement(Legend.prototype.is, Legend);
})(vz_projector || (vz_projector = {})); // namespace vz_projector
