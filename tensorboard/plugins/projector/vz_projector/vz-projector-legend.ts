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

import {customElement, observe, property} from '@polymer/decorators';
import {html, PolymerElement} from '@polymer/polymer';
import {LegacyElementMixin} from '../../../components/polymer/legacy_element_mixin';
import './styles';

export interface ColorLegendRenderInfo {
  // To be used for categorical map.
  items: ColorLegendItem[];
  // To be used for gradient map.
  thresholds: ColorLegendThreshold[];
}
/** An item in the categorical color legend. */
export interface ColorLegendItem {
  color: string;
  label: string;
  count: number;
}
/** An item in the gradient color legend. */
export interface ColorLegendThreshold {
  color: string;
  value: number;
}

@customElement('vz-projector-legend')
class Legend extends LegacyElementMixin(PolymerElement) {
  static readonly template = html`
    <style include="vz-projector-styles"></style>
    <style>
      .item {
        display: flex;
        align-items: flex-start;
        margin-bottom: 10px;
      }

      .shape {
        width: 10px;
        height: 10px;
        margin-right: 10px;
        margin-top: 5px;
        border-radius: 50%;
      }

      .label {
        flex-grow: 1;
      }

      .gradient {
        width: 100%;
        height: 10px;
      }

      .gradient-boundaries {
        display: flex;
        justify-content: space-between;
      }
    </style>

    <template is="dom-repeat" items="[[renderInfo.items]]">
      <div class="item">
        <div class="shape" style="background-color: [[item.color]];"></div>
        <div class="label">[[item.label]]</div>
        <div class="info" style="color: [[item.color]];">[[item.count]]</div>
      </div>
    </template>

    <template is="dom-if" if="[[renderInfo.thresholds?.length]]">
      <svg class="gradient">
        <defs>
          <linearGradient
            id="gradient"
            x1="0%"
            y1="100%"
            x2="100%"
            y2="100%"
          ></linearGradient>
        </defs>
        <rect height="10" style="fill: url('#gradient');"></rect>
      </svg>
      <div class="gradient-boundaries">
        <div>[[renderInfo.thresholds.0.value]]</div>
        <div>[[_getLastThreshold(renderInfo.thresholds)]]</div>
      </div>
    </template>
  `;
  @property({type: Object})
  renderInfo: ColorLegendRenderInfo;

  @observe('renderInfo')
  _renderInfoChanged() {
    if (this.renderInfo == null) {
      return;
    }
    if (this.renderInfo.thresholds?.length) {
      // <linearGradient> is under dom-if so we should wait for it to be
      // inserted in the dom tree using async().
      this.async(() => this.setupLinearGradient(), 150);
    }
  }
  _getLastThreshold(): number | undefined {
    if (this.renderInfo == null || !this.renderInfo.thresholds?.length) {
      return;
    }
    return this.renderInfo.thresholds[this.renderInfo.thresholds.length - 1]
      .value;
  }
  private getOffset(value: number): string {
    const min = this.renderInfo.thresholds[0].value;
    const max =
      this.renderInfo.thresholds[this.renderInfo.thresholds.length - 1].value;
    return ((100 * (value - min)) / (max - min)).toFixed(2) + '%';
  }
  private setupLinearGradient() {
    const linearGradient = this.$$('#gradient') as SVGLinearGradientElement;
    const width = (this.$$('svg.gradient') as SVGElement).clientWidth;
    // Set the svg <rect> to be the width of its <svg> parent.
    (this.$$('svg.gradient rect') as SVGRectElement).style.width = width + 'px';
    // Remove all <stop> children from before.
    linearGradient.textContent = '';
    // Add a <stop> child in <linearGradient> for each gradient threshold.
    this.renderInfo.thresholds.forEach((t) => {
      const stopElement = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'stop'
      );
      stopElement.setAttribute('offset', this.getOffset(t.value));
      stopElement.setAttribute('stop-color', t.color);
      linearGradient.appendChild(stopElement);
    });
  }
}
