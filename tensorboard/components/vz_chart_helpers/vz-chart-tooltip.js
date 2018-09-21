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
var vz_chart_helper;
(function (vz_chart_helper) {
    var TooltipPosition;
    (function (TooltipPosition) {
        /**
         * Positions the tooltip to the bottom of the chart in most case. Positions
         * the tooltip above the chart if there isn't sufficient space below.
         */
        TooltipPosition["AUTO"] = "auto";
        /**
         * Position the tooltip on the bottom of the chart.
         */
        TooltipPosition["BOTTOM"] = "bottom";
        /**
         * Positions the tooltip to the right of the chart.
         */
        TooltipPosition["RIGHT"] = "right";
    })(TooltipPosition = vz_chart_helper.TooltipPosition || (vz_chart_helper.TooltipPosition = {}));
    Polymer({
        is: 'vz-chart-tooltip',
        properties: {
            /**
             * Possible values are TooltipPosition.BOTTOM and TooltipPosition.RIGHT.
             */
            position: {
                type: String,
                value: TooltipPosition.AUTO,
            },
            /**
             * Minimum instance from the edge of the screen.
             */
            minDistFromEdge: {
                type: Number,
                value: 15,
            },
        },
        ready: function () {
            this._styleCache = null;
            this._raf = null;
            this._tunnel = null;
        },
        attached: function () {
            this._tunnel = this._createTunnel();
        },
        detached: function () {
            this.hide();
            this._removeTunnel(this._tunnel);
            this._tunnel = null;
        },
        hide: function () {
            window.cancelAnimationFrame(this._raf);
            this._styleCache = null;
            this.content().style.opacity = 0;
        },
        content: function () {
            return this._tunnel.firstElementChild;
        },
        /**
         * CSS Scopes the newly added DOM (in most tooltip where columns are
         * invariable, only newly added rows are necessary to be scoped) and positions
         * the tooltip with respect to the anchorNode.
         */
        updateAndPosition: function (anchorNode, newDom) {
            var _this = this;
            newDom.forEach(function (row) { return _this.scopeSubtree(row); });
            window.cancelAnimationFrame(this._raf);
            this._raf = window.requestAnimationFrame(function () {
                if (!_this.isAttached)
                    return;
                _this._repositionImpl(anchorNode);
            });
        },
        _repositionImpl: function (anchorNode) {
            var tooltipContent = this.content();
            var nodeRect = anchorNode.getBoundingClientRect();
            var tooltipRect = tooltipContent.getBoundingClientRect();
            var viewportHeight = window.innerHeight;
            var documentWidth = document.body.clientWidth;
            var anchorTop = nodeRect.top;
            var anchorBottom = anchorTop + nodeRect.height;
            var effectiveTooltipHeight = tooltipRect.height +
                vz_chart_helpers.TOOLTIP_Y_PIXEL_OFFSET;
            var bottom = null;
            var left = Math.max(this.minDistFromEdge, nodeRect.left);
            var right = null;
            var top = anchorTop;
            if (this.position == TooltipPosition.RIGHT) {
                left = nodeRect.right;
            }
            else {
                top = anchorBottom + vz_chart_helpers.TOOLTIP_Y_PIXEL_OFFSET;
                // prevent it from falling off the right side of the screen.
                if (documentWidth < left + tooltipRect.width + this.minDistFromEdge) {
                    left = null;
                    right = this.minDistFromEdge;
                }
            }
            // If there is not enough space to render tooltip below the anchorNode in
            // the viewport and there is enough space above, place it above the
            // anchorNode.
            if (this.position == TooltipPosition.AUTO &&
                nodeRect.top - effectiveTooltipHeight > 0 &&
                viewportHeight < nodeRect.top + nodeRect.height +
                    effectiveTooltipHeight) {
                top = null;
                bottom = viewportHeight - anchorTop +
                    vz_chart_helpers.TOOLTIP_Y_PIXEL_OFFSET;
            }
            var newStyle = {
                opacity: 1,
                left: left ? left + "px" : null,
                right: right ? right + "px" : null,
                top: top ? top + "px" : null,
                bottom: bottom ? bottom + "px" : null,
            };
            // Do not update the style (which can cause re-layout) if it has not
            // changed.
            if (!_.isEqual(this._styleCache, newStyle)) {
                Object.assign(tooltipContent.style, newStyle);
                this._styleCache = newStyle;
            }
        },
        _createTunnel: function () {
            var div = document.createElement('div');
            div.classList.add(this.is + "-tunnel");
            var template = this.instanceTemplate(this.$.template);
            this.scopeSubtree(template);
            div.appendChild(template);
            document.body.appendChild(div);
            return div;
        },
        _removeTunnel: function (tunnel) {
            document.body.removeChild(tunnel);
        },
    });
})(vz_chart_helper || (vz_chart_helper = {})); // namespace vz_chart_helper
