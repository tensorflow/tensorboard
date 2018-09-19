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
/* Copyright 2015 The TensorFlow Authors. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the 'License');
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an 'AS IS' BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/
var vz_line_chart;
(function (vz_line_chart) {
    var DragZoomLayer = /** @class */ (function (_super) {
        __extends(DragZoomLayer, _super);
        /**
         * Constructs a SelectionBoxLayer with an attached DragInteraction and
         * ClickInteraction. On drag, it triggers an animated zoom into the box
         * that was dragged. On double click, it zooms back out to the original
         * view, before any zooming.
         * The zoom animation uses an easing function (default
         * d3.ease('cubic-in-out')) and is customizable.
         * Usage: Construct the selection box layer and attach x and y scales,
         * and then add the layer over the plot you are zooming on using a
         * Component Group.
         * TODO(@dandelionmane) - merge this into Plottable
         */
        function DragZoomLayer(xScale, yScale, unzoomMethod) {
            var _this = _super.call(this) || this;
            _this.easeFn = d3.easeCubicInOut;
            _this._animationTime = 750;
            _this.xScale(xScale);
            _this.yScale(yScale);
            _this._dragInteraction = new Plottable.Interactions.Drag();
            _this._doubleClickInteraction = new Plottable.Interactions.Click();
            _this.setupCallbacks();
            _this.unzoomMethod = unzoomMethod;
            // Activate interaction only when the component is mounted onto DOM.
            _this.onDetach(function () {
                _this._doubleClickInteraction.detachFrom(_this);
                _this._dragInteraction.detachFrom(_this);
            });
            _this.onAnchor(function () {
                _this._doubleClickInteraction.attachTo(_this);
                _this._dragInteraction.attachTo(_this);
            });
            return _this;
        }
        /**
         * Register a method that calls when the DragZoom interaction starts.
         */
        DragZoomLayer.prototype.interactionStart = function (cb) {
            this.onStart = cb;
        };
        /**
         * Register a method that calls when the DragZoom interaction ends.
         */
        DragZoomLayer.prototype.interactionEnd = function (cb) {
            this.onEnd = cb;
        };
        /**
         * Returns backing drag interaction. Useful for customization to the
         * interaction.
         */
        DragZoomLayer.prototype.dragInteraction = function () {
            return this._dragInteraction;
        };
        DragZoomLayer.prototype.setupCallbacks = function () {
            var _this = this;
            var dragging = false;
            this._dragInteraction.onDragStart(function (startPoint) {
                _this.bounds({
                    topLeft: startPoint,
                    bottomRight: startPoint,
                });
                _this.onStart();
            });
            this._dragInteraction.onDrag(function (startPoint, endPoint) {
                _this.bounds({ topLeft: startPoint, bottomRight: endPoint });
                _this.boxVisible(true);
                dragging = true;
            });
            this._dragInteraction.onDragEnd(function (startPoint, endPoint) {
                _this.boxVisible(false);
                _this.bounds({ topLeft: startPoint, bottomRight: endPoint });
                if (dragging) {
                    _this.zoom();
                }
                else {
                    _this.onEnd();
                }
                dragging = false;
            });
            this._doubleClickInteraction.onDoubleClick(this.unzoom.bind(this));
        };
        DragZoomLayer.prototype.animationTime = function (animationTime) {
            if (animationTime == null) {
                return this._animationTime;
            }
            if (animationTime < 0) {
                throw new Error('animationTime cannot be negative');
            }
            this._animationTime = animationTime;
            return this;
        };
        /**
         * Set the easing function, which determines how the zoom interpolates
         * over time.
         */
        DragZoomLayer.prototype.ease = function (fn) {
            if (typeof (fn) !== 'function') {
                throw new Error('ease function must be a function');
            }
            if (fn(0) !== 0 || fn(1) !== 1) {
                Plottable.Utils.Window.warn('Easing function does not maintain invariant ' +
                    'f(0)==0 && f(1)==1. Bad behavior may result.');
            }
            this.easeFn = fn;
            return this;
        };
        // Zoom into extent of the selection box bounds
        DragZoomLayer.prototype.zoom = function () {
            var x0 = this.xExtent()[0].valueOf();
            var x1 = this.xExtent()[1].valueOf();
            var y0 = this.yExtent()[1].valueOf();
            var y1 = this.yExtent()[0].valueOf();
            if (x0 === x1 || y0 === y1) {
                return;
            }
            this.interpolateZoom(x0, x1, y0, y1);
        };
        // Restore the scales to their state before any zoom
        DragZoomLayer.prototype.unzoom = function () {
            // We need to reset the zoom domain unconditionally, as the data or the
            // smoothing may have updated, such that we are not longer fully zoomed out.
            var xScale = this.xScale();
            xScale._domainMin = null;
            xScale._domainMax = null;
            var xDomain = xScale._getExtent();
            this.xScale().domain(xDomain);
            this.unzoomMethod();
        };
        // If we are zooming, disable interactions, to avoid contention
        DragZoomLayer.prototype.isZooming = function (isZooming) {
            this._dragInteraction.enabled(!isZooming);
            this._doubleClickInteraction.enabled(!isZooming);
        };
        DragZoomLayer.prototype.interpolateZoom = function (x0f, x1f, y0f, y1f) {
            var _this = this;
            var x0s = this.xScale().domain()[0].valueOf();
            var x1s = this.xScale().domain()[1].valueOf();
            var y0s = this.yScale().domain()[0].valueOf();
            var y1s = this.yScale().domain()[1].valueOf();
            // Copy a ref to the ease fn, so that changing ease wont affect zooms in
            // progress.
            var ease = this.easeFn;
            var interpolator = function (a, b, p) {
                return d3.interpolateNumber(a, b)(ease(p));
            };
            this.isZooming(true);
            var start = Date.now();
            var draw = function () {
                var now = Date.now();
                var passed = now - start;
                var p = _this._animationTime === 0 ?
                    1 :
                    Math.min(1, passed / _this._animationTime);
                var x0 = interpolator(x0s, x0f, p);
                var x1 = interpolator(x1s, x1f, p);
                var y0 = interpolator(y0s, y0f, p);
                var y1 = interpolator(y1s, y1f, p);
                _this.xScale().domain([x0, x1]);
                _this.yScale().domain([y0, y1]);
                if (p < 1) {
                    Plottable.Utils.DOM.requestAnimationFramePolyfill(draw);
                }
                else {
                    _this.onEnd();
                    _this.isZooming(false);
                }
            };
            draw();
        };
        return DragZoomLayer;
    }(Plottable.Components.SelectionBoxLayer));
    vz_line_chart.DragZoomLayer = DragZoomLayer;
})(vz_line_chart || (vz_line_chart = {})); // namespace vz_line_chart
