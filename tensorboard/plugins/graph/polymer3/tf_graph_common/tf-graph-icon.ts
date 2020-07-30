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
import {customElement, property} from '@polymer/decorators';
import {DO_NOT_SUBMIT} from '../tf-imports/polymer.html';
import {DO_NOT_SUBMIT} from '../tf-dashboard-common/tensorboard-color.html';
import {DO_NOT_SUBMIT} from 'tf-graph-icon';
import {DO_NOT_SUBMIT} from '../tf-imports/polymer.html';
import {DO_NOT_SUBMIT} from '../tf-dashboard-common/tensorboard-color.html';
export enum GraphIconType {
  CONST = 'CONST',
  META = 'META',
  OP = 'OP',
  SERIES = 'SERIES',
  SUMMARY = 'SUMMARY',
}
@customElement('tf-graph-icon')
class TfGraphIcon extends PolymerElement {
  static readonly template = html`
    <style>
      :host {
        font-size: 0;
      }

      .faded-rect {
        fill: url(#rectHatch);
      }

      .faded-ellipse {
        fill: url(#ellipseHatch);
      }

      .faded-rect,
      .faded-ellipse,
      .faded-series {
        stroke: var(--tb-graph-faded) !important;
      }
      #rectHatch line,
      #ellipseHatch line {
        color: #e0d4b3 !important;
        fill: white;
        stroke: #e0d4b3 !important;
      }
    </style>
    <!-- SVG for definitions -->
    <svg height="0" width="0" id="svgDefs">
      <defs>
        <!-- Hatch patterns for faded out nodes. -->
        <pattern
          id="rectHatch"
          patternTransform="rotate(45 0 0)"
          width="5"
          height="5"
          patternUnits="userSpaceOnUse"
        >
          <line x1="0" y1="0" x2="0" y2="5" style="stroke-width: 1"></line>
        </pattern>
        <pattern
          id="ellipseHatch"
          patternTransform="rotate(45 0 0)"
          width="2"
          height="2"
          patternUnits="userSpaceOnUse"
        >
          <line x1="0" y1="0" x2="0" y2="2" style="stroke-width: 1"></line>
        </pattern>
        <!-- Template for an Op node ellipse. -->
        <ellipse
          id="op-node-stamp"
          rx="7.5"
          ry="3"
          stroke="inherit"
          fill="inherit"
        ></ellipse>
        <!-- Template for an Op node annotation ellipse (smaller). -->
        <ellipse
          id="op-node-annotation-stamp"
          rx="5"
          ry="2"
          stroke="inherit"
          fill="inherit"
        ></ellipse>
        <!-- Vertically stacked series of Op nodes when unexpanded. -->
        <g id="op-series-vertical-stamp">
          <use xlink:href="#op-node-stamp" x="8" y="9"></use>
          <use xlink:href="#op-node-stamp" x="8" y="6"></use>
          <use xlink:href="#op-node-stamp" x="8" y="3"></use>
        </g>
        <g id="op-series-horizontal-stamp">
          <use xlink:href="#op-node-stamp" x="16" y="4"></use>
          <use xlink:href="#op-node-stamp" x="12" y="4"></use>
          <use xlink:href="#op-node-stamp" x="8" y="4"></use>
        </g>
        <g
          id="summary-icon"
          fill="#848484"
          height="12"
          viewBox="0 0 24 24"
          width="12"
        >
          <path
            d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"
          ></path>
        </g>
      </defs>
    </svg>
    <template is="dom-if" if="[[_isType(type, 'CONST')]]">
      <svg
        height$="[[height]]"
        preserveAspectRatio="xMinYMid meet"
        viewBox="0 0 10 10"
      >
        <circle
          cx="5"
          cy="5"
          r="3"
          fill$="[[_fill]]"
          stroke$="[[_stroke]]"
        ></circle>
      </svg>
    </template>
    <template is="dom-if" if="[[_isType(type, 'SUMMARY')]]">
      <svg
        width$="[[height]]"
        height$="[[height]]"
        viewBox="0 0 24 24"
        fill="#848484"
      >
        <path
          d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"
        ></path>
      </svg>
    </template>
    <template is="dom-if" if="[[_isType(type, 'OP')]]">
      <svg
        height$="[[height]]"
        preserveAspectRatio="xMinYMid meet"
        viewBox="0 0 16 8"
      >
        <use
          xmlns:xlink="http://www.w3.org/1999/xlink"
          xlink:href="#op-node-stamp"
          fill$="[[_fill]]"
          stroke$="[[_stroke]]"
          class$="{{_fadedClass(faded, 'ellipse')}}"
          x="8"
          y="4"
        ></use>
      </svg>
    </template>
    <template is="dom-if" if="[[_isType(type, 'META')]]">
      <svg
        height$="[[height]]"
        preserveAspectRatio="xMinYMid meet"
        viewBox="0 0 37 16"
      >
        <rect
          x="1"
          y="1"
          fill$="[[_fill]]"
          stroke$="[[_stroke]]"
          class$="{{_fadedClass(faded, 'rect')}}"
          stroke-width="2px"
          height="14"
          width="35"
          rx="5"
          ry="5"
        ></rect>
      </svg>
    </template>
    <template is="dom-if" if="[[_isType(type, 'SERIES')]]">
      <template is="dom-if" if="[[vertical]]">
        <svg
          height$="[[height]]"
          preserveAspectRatio="xMinYMid meet"
          viewBox="0 0 16 15"
        >
          <use
            xmlns:xlink="http://www.w3.org/1999/xlink"
            xlink:href="#op-series-vertical-stamp"
            fill$="[[_fill]]"
            stroke$="[[_stroke]]"
            class$="{{_fadedClass(faded, 'series')}}"
            x="0"
            y="2"
          ></use>
        </svg>
      </template>
      <template is="dom-if" if="[[!vertical]]">
        <svg
          height$="[[height]]"
          preserveAspectRatio="xMinYMid meet"
          viewBox="0 0 24 10"
        >
          <use
            xmlns:xlink="http://www.w3.org/1999/xlink"
            xlink:href="#op-series-horizontal-stamp"
            fill$="[[_fill]]"
            stroke$="[[_stroke]]"
            class$="{{_fadedClass(faded, 'series')}}"
            x="0"
            y="1"
          ></use>
        </svg>
      </template>
    </template>
  `;
  @property({type: String})
  type: string;
  @property({
    type: Boolean,
  })
  vertical: boolean = false;
  @property({
    type: String,
  })
  fillOverride: string = null;
  @property({
    type: String,
  })
  strokeOverride: string = null;
  @property({
    type: Number,
  })
  height: number = 20;
  @property({
    type: Boolean,
  })
  faded: boolean = false;
  getSvgDefinableElement(): HTMLElement {
    return this.$.svgDefs;
  }
  @computed('type', 'fillOverride')
  get _fill(): string {
    var type = this.type;
    var fillOverride = this.fillOverride;
    if (fillOverride != null) return fillOverride;
    switch (type) {
      case GraphIconType.META:
        return tf.graph.render.MetanodeColors.DEFAULT_FILL;
      case GraphIconType.SERIES:
        return tf.graph.render.SeriesNodeColors.DEFAULT_FILL;
      default:
        return tf.graph.render.OpNodeColors.DEFAULT_FILL;
    }
  }
  @computed('type', 'strokeOverride')
  get _stroke(): string {
    var type = this.type;
    var strokeOverride = this.strokeOverride;
    if (strokeOverride != null) return strokeOverride;
    switch (type) {
      case GraphIconType.META:
        return tf.graph.render.MetanodeColors.DEFAULT_STROKE;
      case GraphIconType.SERIES:
        return tf.graph.render.SeriesNodeColors.DEFAULT_STROKE;
      default:
        return tf.graph.render.OpNodeColors.DEFAULT_STROKE;
    }
  }
  /**
   * Test whether the specified node's type, or the literal type string,
   * match a particular other type.
   */
  _isType(type: GraphIconType, targetType: GraphIconType): boolean {
    return type === targetType;
  }
  _fadedClass(faded: boolean, shape: string) {
    return faded ? 'faded-' + shape : '';
  }
}
