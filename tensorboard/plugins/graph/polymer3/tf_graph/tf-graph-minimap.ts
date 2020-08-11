/* Copyright 2020 The TensorFlow Authors. All Rights Reserved.

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

import {PolymerElement, html} from '@polymer/polymer';
import {customElement} from '@polymer/decorators';

import * as tf_scene_minimap from '../tf_graph_common/minimap';

@customElement('tf-graph-minimap')
export class TfGraphMinimap extends PolymerElement {
  static readonly template = html`
    <style>
      :host {
        background-color: white;
        transition: opacity 0.3s linear;
        pointer-events: auto;
      }

      :host(.hidden) {
        opacity: 0;
        pointer-events: none;
      }

      canvas {
        border: 1px solid #999;
      }

      rect {
        fill: white;
        stroke: #111111;
        stroke-width: 1px;
        fill-opacity: 0;
        filter: url(#minimapDropShadow);
        cursor: move;
      }

      svg {
        position: absolute;
      }
    </style>
    <svg>
      <defs>
        <filter
          id="minimapDropShadow"
          x="-20%"
          y="-20%"
          width="150%"
          height="150%"
        >
          <feOffset result="offOut" in="SourceGraphic" dx="1" dy="1"></feOffset>
          <feColorMatrix
            result="matrixOut"
            in="offOut"
            type="matrix"
            values="0.1 0 0 0 0 0 0.1 0 0 0 0 0 0.1 0 0 0 0 0 0.5 0"
          ></feColorMatrix>
          <feGaussianBlur
            result="blurOut"
            in="matrixOut"
            stdDeviation="2"
          ></feGaussianBlur>
          <feBlend in="SourceGraphic" in2="blurOut" mode="normal"></feBlend>
        </filter>
      </defs>
      <rect></rect>
    </svg>
    <canvas class="first"></canvas>
    <!-- Additional canvas to use as buffer to avoid flickering between updates -->
    <canvas class="second"></canvas>
    <canvas class="download"></canvas>
  `;
  /**
   * Initializes the minimap and returns a minimap object to notify when
   * things update.
   *
   * @param svg The main svg element.
   * @param zoomG The svg group used for panning and zooming the main svg.
   * @param mainZoom The main zoom behavior.
   * @param maxWAndH The maximum width/height for the minimap.
   * @param labelPadding Padding in pixels due to the main graph labels.
   */
  init(svg, zoomG, mainZoom, maxWAndH, labelPadding) {
    return new tf_scene_minimap.Minimap(
      svg,
      zoomG,
      mainZoom,
      this,
      maxWAndH,
      labelPadding
    );
  }
}
