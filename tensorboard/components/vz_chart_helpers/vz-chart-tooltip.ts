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
  updateAndPosition(anchorNode: Element, newDom: Array<any>): void;
}

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

  ready() {
    this._styleCache = null;
    this._raf = null;
    this._tunnel = null;
  },

  attached() {
    this._tunnel = this._createTunnel();
  },

  detached() {
    this.hide();
    this._removeTunnel(this._tunnel);
    this._tunnel = null;
  },

  hide() {
    window.cancelAnimationFrame(this._raf);
    this._styleCache = null;
    this.content().style.opacity = 0;
  },

  content(): Element {
    return this._tunnel.firstElementChild;
  },

  /**
   * CSS Scopes the newly added DOM (in most tooltip where columns are
   * invariable, only newly added rows are necessary to be scoped) and positions
   * the tooltip with respect to the anchorNode.
   */
  updateAndPosition(anchorNode: Element, newDom: Element[]) {
    newDom.forEach(row => this.scopeSubtree(row));

    window.cancelAnimationFrame(this._raf);
    this._raf = window.requestAnimationFrame(() => {
      if (!this.isAttached) return;
      this._repositionImpl(anchorNode);
    });
  },

  _repositionImpl(anchorNode: Element) {
    const tooltipContent = this.content();

    const nodeRect = anchorNode.getBoundingClientRect();
    const tooltipRect = tooltipContent.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const documentWidth = document.body.clientWidth;

    const anchorTop = nodeRect.top;
    const anchorBottom = anchorTop + nodeRect.height;
    const effectiveTooltipHeight = tooltipRect.height +
        vz_chart_helpers.TOOLTIP_Y_PIXEL_OFFSET;

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
    if (this.position == TooltipPosition.AUTO &&
        nodeRect.top - effectiveTooltipHeight > 0 &&
        viewportHeight < nodeRect.top + nodeRect.height +
            effectiveTooltipHeight) {
      top = null;
      bottom = viewportHeight - anchorTop +
          vz_chart_helpers.TOOLTIP_Y_PIXEL_OFFSET;
    }

    const newStyle = {
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
    const div = document.createElement('div');
    div.classList.add(`${this.is}-tunnel`);
    const template = this.instanceTemplate(this.$.template);
    this.scopeSubtree(template);
    div.appendChild(template);
    document.body.appendChild(div);
    return div;
  },

  _removeTunnel(tunnel: Element) {
    document.body.removeChild(tunnel);
  },
});

}  // namespace vz_chart_helper
