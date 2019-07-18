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
    class DragZoomLayer extends Plottable.Components.SelectionBoxLayer {
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
         * TODO(@decentralion) - merge this into Plottable
         */
        constructor(xScale, yScale, unzoomMethod) {
            super();
            this.easeFn = d3.easeCubicInOut;
            this._animationTime = 750;
            this.xScale(xScale);
            this.yScale(yScale);
            this._dragInteraction = new Plottable.Interactions.Drag();
            this._doubleClickInteraction = new Plottable.Interactions.Click();
            this.setupCallbacks();
            this.unzoomMethod = unzoomMethod;
            // Activate interaction only when the component is mounted onto DOM.
            this.onDetach(() => {
                this._doubleClickInteraction.detachFrom(this);
                this._dragInteraction.detachFrom(this);
            });
            this.onAnchor(() => {
                this._doubleClickInteraction.attachTo(this);
                this._dragInteraction.attachTo(this);
            });
        }
        /**
         * Register a method that calls when the DragZoom interaction starts.
         */
        interactionStart(cb) {
            this.onStart = cb;
        }
        /**
         * Register a method that calls when the DragZoom interaction ends.
         */
        interactionEnd(cb) {
            this.onEnd = cb;
        }
        /**
         * Returns backing drag interaction. Useful for customization to the
         * interaction.
         */
        dragInteraction() {
            return this._dragInteraction;
        }
        setupCallbacks() {
            let dragging = false;
            this._dragInteraction.onDragStart((startPoint) => {
                this.bounds({
                    topLeft: startPoint,
                    bottomRight: startPoint,
                });
                this.onStart();
            });
            this._dragInteraction.onDrag((startPoint, endPoint) => {
                this.bounds({ topLeft: startPoint, bottomRight: endPoint });
                this.boxVisible(true);
                dragging = true;
            });
            this._dragInteraction.onDragEnd((startPoint, endPoint) => {
                this.boxVisible(false);
                this.bounds({ topLeft: startPoint, bottomRight: endPoint });
                if (dragging) {
                    this.zoom();
                }
                else {
                    this.onEnd();
                }
                dragging = false;
            });
            this._doubleClickInteraction.onDoubleClick(this.unzoom.bind(this));
        }
        animationTime(animationTime) {
            if (animationTime == null) {
                return this._animationTime;
            }
            if (animationTime < 0) {
                throw new Error('animationTime cannot be negative');
            }
            this._animationTime = animationTime;
            return this;
        }
        /**
         * Set the easing function, which determines how the zoom interpolates
         * over time.
         */
        ease(fn) {
            if (typeof (fn) !== 'function') {
                throw new Error('ease function must be a function');
            }
            if (fn(0) !== 0 || fn(1) !== 1) {
                Plottable.Utils.Window.warn('Easing function does not maintain invariant ' +
                    'f(0)==0 && f(1)==1. Bad behavior may result.');
            }
            this.easeFn = fn;
            return this;
        }
        // Zoom into extent of the selection box bounds
        zoom() {
            let x0 = this.xExtent()[0].valueOf();
            let x1 = this.xExtent()[1].valueOf();
            let y0 = this.yExtent()[1].valueOf();
            let y1 = this.yExtent()[0].valueOf();
            if (x0 === x1 || y0 === y1) {
                return;
            }
            this.interpolateZoom(x0, x1, y0, y1);
        }
        // Restore the scales to their state before any zoom
        unzoom() {
            // We need to reset the zoom domain unconditionally, as the data or the
            // smoothing may have updated, such that we are not longer fully zoomed out.
            let xScale = this.xScale();
            xScale._domainMin = null;
            xScale._domainMax = null;
            let xDomain = xScale._getExtent();
            this.xScale().domain(xDomain);
            this.unzoomMethod();
        }
        // If we are zooming, disable interactions, to avoid contention
        isZooming(isZooming) {
            this._dragInteraction.enabled(!isZooming);
            this._doubleClickInteraction.enabled(!isZooming);
        }
        interpolateZoom(x0f, x1f, y0f, y1f) {
            let x0s = this.xScale().domain()[0].valueOf();
            let x1s = this.xScale().domain()[1].valueOf();
            let y0s = this.yScale().domain()[0].valueOf();
            let y1s = this.yScale().domain()[1].valueOf();
            // Copy a ref to the ease fn, so that changing ease wont affect zooms in
            // progress.
            let ease = this.easeFn;
            let interpolator = (a, b, p) => d3.interpolateNumber(a, b)(ease(p));
            this.isZooming(true);
            let start = Date.now();
            let draw = () => {
                let now = Date.now();
                let passed = now - start;
                let p = this._animationTime === 0 ?
                    1 :
                    Math.min(1, passed / this._animationTime);
                let x0 = interpolator(x0s, x0f, p);
                let x1 = interpolator(x1s, x1f, p);
                let y0 = interpolator(y0s, y0f, p);
                let y1 = interpolator(y1s, y1f, p);
                this.xScale().domain([x0, x1]);
                this.yScale().domain([y0, y1]);
                if (p < 1) {
                    Plottable.Utils.DOM.requestAnimationFramePolyfill(draw);
                }
                else {
                    this.onEnd();
                    this.isZooming(false);
                }
            };
            draw();
        }
    }
    vz_line_chart.DragZoomLayer = DragZoomLayer;
})(vz_line_chart || (vz_line_chart = {})); // namespace vz_line_chart
