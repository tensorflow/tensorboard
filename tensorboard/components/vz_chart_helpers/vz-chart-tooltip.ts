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
import {customElement, property} from '@polymer/decorators';
import {PolymerElement} from '@polymer/polymer';
import * as _ from 'lodash';
import {LegacyElementMixin} from '../polymer/legacy_element_mixin';
import {TOOLTIP_Y_PIXEL_OFFSET} from './vz-chart-helpers';

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

const DEFAULT_TOOLTIP_STYLE = {
  boxShadow: '0 1px 4px rgba(0, 0, 0, .3)',
  opacity: 0,
  position: 'fixed',
  willChange: 'transform',
  zIndex: 5,
};

@customElement('vz-chart-tooltip')
class VzChartTooltip extends LegacyElementMixin(PolymerElement) {
  @property({type: String})
  contentComponentName: string;

  @property({
    type: String,
  })
  position: string = TooltipPosition.AUTO;

  @property({
    type: Number,
  })
  minDistFromEdge: number = 15;

  override _template: null;
  _styleCache: null | {} = null;
  _raf: null | number = null;
  _tunnel: any = null;
  _hideOnBlur: any;

  ready() {
    this._styleCache = null;
    this._raf = null;
    this._tunnel = null;
  }

  override attached() {
    this._tunnel = this._createTunnel();
    this._hideOnBlur = () => {
      if (document.hidden) this.hide();
    };
    window.addEventListener('visibilitychange', this._hideOnBlur);
  }

  override detached() {
    this.hide();
    this._removeTunnel(this._tunnel);
    this._tunnel = null;
    window.removeEventListener('visibilitychange', this._hideOnBlur);
  }

  content(): Element {
    return this._tunnel.shadowRoot;
  }

  hide() {
    if (this._raf !== null) {
      window.cancelAnimationFrame(this._raf);
    }
    this._styleCache = null;
    this._tunnel.style.opacity = 0;
  }

  /**
   * CSS Scopes the newly added DOM (in most tooltip where columns are
   * invariable, only newly added rows are necessary to be scoped) and positions
   * the tooltip with respect to the anchorNode.
   */
  updateAndPosition(anchorNode: Element) {
    if (this._raf !== null) {
      window.cancelAnimationFrame(this._raf);
    }
    this._raf = window.requestAnimationFrame(() => {
      if (!this.isAttached) return;
      this._repositionImpl(anchorNode);
    });
  }

  private _repositionImpl(anchorNode: Element) {
    const tooltipContent = this._tunnel;
    const nodeRect = anchorNode.getBoundingClientRect();
    const tooltipRect = tooltipContent.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const documentWidth = document.body.clientWidth;
    const anchorTop = nodeRect.top;
    const anchorBottom = anchorTop + nodeRect.height;
    const effectiveTooltipHeight = tooltipRect.height + TOOLTIP_Y_PIXEL_OFFSET;
    let bottom: number | null = null;
    let left: number | null = Math.max(this.minDistFromEdge, nodeRect.left);
    let right: number | null = null;
    let top: number | null = anchorTop;
    if (this.position == TooltipPosition.RIGHT) {
      left = nodeRect.right;
    } else {
      top = anchorBottom + TOOLTIP_Y_PIXEL_OFFSET;
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
      bottom = viewportHeight - anchorTop + TOOLTIP_Y_PIXEL_OFFSET;
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
  }

  private _createTunnel(): Element {
    if (!this.contentComponentName) {
      throw new RangeError(
        'Require `contentComponentName` to be a name of a Polymer component'
      );
    }
    const tunnel = document.createElement(this.contentComponentName);
    Object.assign(tunnel.style, DEFAULT_TOOLTIP_STYLE);
    document.body.appendChild(tunnel);
    return tunnel;
  }

  private _removeTunnel(tunnel: Element) {
    document.body.removeChild(tunnel);
  }
}
