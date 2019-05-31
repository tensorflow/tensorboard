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
var vz_line_chart2;
(function (vz_line_chart2) {
    var State;
    (function (State) {
        State[State["NONE"] = 0] = "NONE";
        State[State["DRAG_ZOOMING"] = 1] = "DRAG_ZOOMING";
        State[State["PANNING"] = 2] = "PANNING";
    })(State || (State = {}));
    var PanZoomDragLayer = /** @class */ (function (_super) {
        __extends(PanZoomDragLayer, _super);
        /**
         * A Plottable component/layer with a complex interaction for the line chart.
         * When not pressing alt-key, it behaves like DragZoomLayer -- dragging a
         * region zooms the area under the gray box and double clicking resets the
         * zoom. When pressing alt-key, it lets user pan around while having mousedown
         * on the chart and let user zoom-in/out of cursor when scroll with alt key
         * pressed.
         */
        function PanZoomDragLayer(xScale, yScale, unzoomMethod) {
            var _this = _super.call(this) || this;
            _this.state = State.NONE;
            _this.panStartCallback = new Plottable.Utils.CallbackSet();
            _this.panEndCallback = new Plottable.Utils.CallbackSet();
            _this.panZoom = new Plottable.Interactions.PanZoom(xScale, yScale);
            _this.panZoom.dragInteraction().mouseFilter(function (event) {
                return PanZoomDragLayer.isPanKey(event) && event.button === 0;
            });
            _this.panZoom.wheelFilter(_this.canScrollZoom);
            _this.dragZoomLayer = new vz_line_chart.DragZoomLayer(xScale, yScale, unzoomMethod);
            _this.dragZoomLayer.dragInteraction().mouseFilter(function (event) {
                return !PanZoomDragLayer.isPanKey(event) && event.button === 0;
            });
            _this.append(_this.dragZoomLayer);
            var onWheel = _this.onWheel.bind(_this);
            _this.onAnchor(function () {
                _this._mouseDispatcher = Plottable.Dispatchers.Mouse.getDispatcher(_this);
                _this._mouseDispatcher.onWheel(onWheel);
                _this.panZoom.attachTo(_this);
            });
            _this.onDetach(function () {
                _this.panZoom.detachFrom(_this);
                // onDetach can be invoked before onAnchor
                if (_this._mouseDispatcher) {
                    _this._mouseDispatcher.offWheel(onWheel);
                    _this._mouseDispatcher = null;
                }
            });
            _this.panZoom.dragInteraction().onDragStart(function () {
                if (_this.state == State.NONE)
                    _this.setState(State.PANNING);
            });
            _this.panZoom.dragInteraction().onDragEnd(function () {
                if (_this.state == State.PANNING)
                    _this.setState(State.NONE);
            });
            _this.dragZoomLayer.dragInteraction().onDragStart(function () {
                if (_this.state == State.NONE)
                    _this.setState(State.DRAG_ZOOMING);
            });
            _this.dragZoomLayer.dragInteraction().onDragEnd(function () {
                if (_this.state == State.DRAG_ZOOMING)
                    _this.setState(State.NONE);
            });
            return _this;
        }
        PanZoomDragLayer.prototype.onWheel = function (_, event) {
            if (this.canScrollZoom(event))
                return;
            var helpContainer = this.element();
            if (!helpContainer.select('.help').empty())
                return;
            // If the style gets crazy, use CSS and custom-dom API.
            var help = helpContainer
                .append('div')
                .classed('help', true)
                .style('background', 'rgba(30, 30, 30, .6)')
                .style('color', '#fff')
                .style('pointer-events', 'none')
                .style('opacity', 1)
                .style('position', 'absolute')
                .style('top', 0)
                .style('bottom', 0)
                .style('left', 0)
                .style('right', 0)
                .style('display', 'flex')
                .style('justify-content', 'center')
                .style('padding', '20px')
                .style('align-items', 'center');
            var fade = d3.transition().duration(2500);
            help.transition(fade)
                .style('opacity', 0)
                .remove();
            help.append('span')
                .text('Alt + Scroll to Zoom')
                .style('white-space', 'normal');
        };
        PanZoomDragLayer.isPanKey = function (event) {
            return Boolean(event.altKey) || Boolean(event.shiftKey);
        };
        PanZoomDragLayer.prototype.canScrollZoom = function (event) {
            return event.altKey;
        };
        PanZoomDragLayer.prototype.setState = function (nextState) {
            if (this.state == nextState)
                return;
            var prevState = this.state;
            this.state = nextState;
            this.root().removeClass(this.stateClassName(prevState));
            this.root().addClass(this.stateClassName(nextState));
            if (prevState == State.PANNING) {
                this.panEndCallback.callCallbacks();
            }
            if (nextState == State.PANNING) {
                this.panStartCallback.callCallbacks();
            }
        };
        PanZoomDragLayer.prototype.stateClassName = function (state) {
            switch (state) {
                case State.PANNING:
                    return 'panning';
                case State.DRAG_ZOOMING:
                    return 'drag-zooming';
                case State.NONE:
                default:
                    return '';
            }
        };
        PanZoomDragLayer.prototype.onPanStart = function (cb) {
            this.panStartCallback.add(cb);
        };
        PanZoomDragLayer.prototype.onPanEnd = function (cb) {
            this.panEndCallback.add(cb);
        };
        PanZoomDragLayer.prototype.onScrollZoom = function (cb) {
            this.panZoom.onZoomEnd(cb);
        };
        PanZoomDragLayer.prototype.onDragZoomStart = function (cb) {
            this.dragZoomLayer.interactionStart(cb);
        };
        PanZoomDragLayer.prototype.onDragZoomEnd = function (cb) {
            this.dragZoomLayer.interactionEnd(cb);
        };
        return PanZoomDragLayer;
    }(Plottable.Components.Group));
    vz_line_chart2.PanZoomDragLayer = PanZoomDragLayer;
})(vz_line_chart2 || (vz_line_chart2 = {})); // namespace vz_line_chart
