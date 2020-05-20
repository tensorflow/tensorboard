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
namespace vz_chart_helper {
  export enum TooltipPosition {
    /**
     * Positions the tooltip to the bottom of the chart in most case. Positions
     * the tooltip above the chart if there isn't sufficient space below.
     */
    AUTO = 'auto',
    /**
     * Position the tooltip on the bottom of the chart.
     */
    BOTTOM = 'bottom',
    /**
     * Positions the tooltip to the right of the chart.
     */
    RIGHT = 'right',
  }

  export interface VzChartTooltip extends Element {
    content(): Element;
    hide(): void;
    updateAndPosition(anchorNode: Element): void;
  }

  const DEFAULT_TOOLTIP_STYLE = {
    boxShadow: '0 1px 4px rgba(0, 0, 0, .3)',
    opacity: 0,
    position: 'fixed',
    willChange: 'transform',
    zIndex: 5,
  };

  Polymer({
    is: 'vz-chart-tooltip',
    _template: null, // strictTemplatePolicy requires a template (even a null one).
    properties: {
      /**
       * Required prop for specifying name of the WebComponent for tooltip
       * content.
       */
      contentComponentName: String,

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

    ready() {
      this._styleCache = null;
      this._raf = null;
      this._tunnel = null;
    },

    attached() {
      this._tunnel = this._createTunnel();
      this._hideOnBlur = () => {
        if (document.hidden) this.hide();
      };
      window.addEventListener('visibilitychange', this._hideOnBlur);
    },

    detached() {
      this.hide();
      this._removeTunnel(this._tunnel);
      this._tunnel = null;
      window.removeEventListener('visibilitychange', this._hideOnBlur);
    },

    content(): Element {
      return this._tunnel.shadowRoot;
    },

    hide() {
      window.cancelAnimationFrame(this._raf);
      this._styleCache = null;
      this._tunnel.style.opacity = 0;
    },

    /**
     * CSS Scopes the newly added DOM (in most tooltip where columns are
     * invariable, only newly added rows are necessary to be scoped) and positions
     * the tooltip with respect to the anchorNode.
     */
    updateAndPosition(anchorNode: Element) {
      window.cancelAnimationFrame(this._raf);
      this._raf = window.requestAnimationFrame(() => {
        if (!this.isAttached) return;
        this._repositionImpl(anchorNode);
      });
    },

    _repositionImpl(anchorNode: Element) {
      const tooltipContent = this._tunnel;

      const nodeRect = anchorNode.getBoundingClientRect();
      const tooltipRect = tooltipContent.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const documentWidth = document.body.clientWidth;

      const anchorTop = nodeRect.top;
      const anchorBottom = anchorTop + nodeRect.height;
      const effectiveTooltipHeight =
        tooltipRect.height + vz_chart_helpers.TOOLTIP_Y_PIXEL_OFFSET;

      let bottom = null;
      let left = Math.max(this.minDistFromEdge, nodeRect.left);
      let right = null;
      let top = anchorTop;

      if (this.position == TooltipPosition.RIGHT) {
        left = nodeRect.right;
      } else {
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
      if (
        this.position == TooltipPosition.AUTO &&
        nodeRect.top - effectiveTooltipHeight > 0 &&
        viewportHeight < nodeRect.top + nodeRect.height + effectiveTooltipHeight
      ) {
        top = null;
        bottom =
          viewportHeight - anchorTop + vz_chart_helpers.TOOLTIP_Y_PIXEL_OFFSET;
      }

      const newStyle = {
        contain: 'content',
        opacity: 1,
        left: left ? `${left}px` : null,
        right: right ? `${right}px` : null,
        top: top ? `${top}px` : null,
        bottom: bottom ? `${bottom}px` : null,
      };

      // Do not update the style (which can cause re-layout) if it has not
      // changed.
      if (!_.isEqual(this._styleCache, newStyle)) {
        Object.assign(tooltipContent.style, newStyle);
        this._styleCache = newStyle;
      }
    },

    _createTunnel(): Element {
      if (!this.contentComponentName) {
        throw new RangeError(
          'Require `contentComponentName` to be a name of a Polymer component'
        );
      }
      const tunnel = document.createElement(this.contentComponentName);
      Object.assign(tunnel.style, DEFAULT_TOOLTIP_STYLE);
      document.body.appendChild(tunnel);
      return tunnel;
    },

    _removeTunnel(tunnel: Element) {
      document.body.removeChild(tunnel);
    },
  });
} // namespace vz_chart_helper
