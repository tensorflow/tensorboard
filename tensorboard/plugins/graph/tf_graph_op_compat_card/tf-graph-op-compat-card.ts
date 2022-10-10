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

import {computed, customElement, observe, property} from '@polymer/decorators';
import {html, PolymerElement} from '@polymer/polymer';
import * as d3 from 'd3';
import {DarkModeMixin} from '../../../components/polymer/dark_mode_mixin';
import '../../../components/polymer/irons_and_papers';
import {LegacyElementMixin} from '../../../components/polymer/legacy_element_mixin';
import * as tf_graph from '../tf_graph_common/graph';
import * as tf_graph_hierarchy from '../tf_graph_common/hierarchy';
import * as tf_graph_render from '../tf_graph_common/render';
import './tf-graph-op-compat-list-item';

@customElement('tf-graph-op-compat-card')
class TfGraphOpCompatCard extends LegacyElementMixin(
  DarkModeMixin(PolymerElement)
) {
  static readonly template = html`
    <style>
      :host {
        max-height: 500px;
      }

      .incompatible-ops-list {
        height: 350px;
        max-height: 400px;
        overflow-y: scroll;
        display: flex;
        flex-direction: column;
      }

      iron-list {
        flex: 1 1 auto;
      }

      paper-item {
        padding: 0;
        background: var(--secondary-background-color);
      }

      paper-item-body[two-line] {
        min-height: 0;
        padding: 8px 12px 4px;
      }

      .expandedInfo {
        padding: 8px 12px;
        font-weight: 500;
        font-size: 12pt;
        width: 100%;
      }

      .node-name {
        white-space: normal;
        word-wrap: break-word;
        font-size: 14pt;
        font-weight: 500;
      }

      .subtitle {
        color: var(--secondary-text-color);
        font-size: 12pt;
      }

      .toggle-button {
        float: right;
        max-height: 20px;
        max-width: 20px;
        padding: 0;
      }

      .non-control-list-item {
        padding-left: 10px;
      }

      div.op-compat-display {
        margin-top: 10px;
        display: inline-block;
      }

      /**
       * Sadly, because the whole body is inverted in color, legends also need
       * to be inverted.
       **/
      :host(.dark-mode) div.op-compat-display {
        filter: invert(1);
      }

      svg.op-compat {
        width: 250px;
        height: 25px;
        float: left;
      }

      div.op-compat-value {
        float: right;
        height: 100%;
        font-size: 14px;
        color: black;
        margin-left: 10px;
      }
    </style>

    <paper-item>
      <paper-item-body two-line>
        <div>
          <paper-icon-button
            icon="{{_getToggleIcon(_expanded)}}"
            on-click="_toggleExpanded"
            class="toggle-button"
          >
          </paper-icon-button>
          <div class="node-name" id="nodetitle">[[nodeTitle]]</div>
        </div>
        <div secondary>
          <div class="subtitle">
            <div class="op-compat-display">
              <svg
                class="op-compat"
                preserveAspectRatio="xMinYMid meet"
                viewBox="0 0 250 25"
              >
                <defs>
                  <linearGradient id="op-compat-fill">
                    <stop offset="0" stop-color$="[[_opCompatColor]]"></stop>
                    <stop
                      offset$="[[_opCompatScore]]"
                      stop-color$="[[_opCompatColor]]"
                    ></stop>
                    <stop
                      offset$="[[_opCompatScore]]"
                      stop-color$="[[_opIncompatColor]]"
                    ></stop>
                    <stop offset="1" stop-color$="[[_opIncompatColor ]]"></stop>
                  </linearGradient>
                </defs>
                <rect
                  height="25"
                  width="250"
                  rx="5"
                  ry="5"
                  style="fill: url('#op-compat-fill');"
                ></rect>
              </svg>
              <div class="op-compat-value">[[_opCompatScoreLabel]]</div>
            </div>
          </div>
        </div>
      </paper-item-body>
    </paper-item>

    <iron-collapse opened="{{_expanded}}">
      <template is="dom-if" if="{{_expanded}}" restamp="true">
        <div class="expandedInfo">
          Incompatible Operations: (<span>[[_totalIncompatOps]]</span>)
          <iron-list
            class="incompatible-ops-list"
            id="incompatibleOpsList"
            items="[[_incompatibleOpNodes]]"
          >
            <template>
              <tf-graph-op-compat-list-item
                class="non-control-list-item"
                item-node="[[item]]"
                item-render-info="[[_getRenderInfo(item.name, renderHierarchy)]]"
                name="[[item.name]]"
                template-index="[[_templateIndex]]"
                color-by="[[colorBy]]"
                item-type="incompatible-ops"
              >
              </tf-graph-op-compat-list-item>
            </template>
          </iron-list>
        </div>
      </template>
    </iron-collapse>
  `;
  @property({type: Object})
  graphHierarchy: tf_graph_hierarchy.Hierarchy;
  @property({type: Object})
  renderHierarchy: tf_graph_render.RenderGraphInfo;
  @property({type: String})
  nodeTitle: string;
  @property({
    type: Boolean,
  })
  _expanded: boolean = true;
  @property({
    type: String,
  })
  _opCompatColor: string = tf_graph_render.OpNodeColors.COMPATIBLE;
  @property({
    type: String,
  })
  _opIncompatColor: string = tf_graph_render.OpNodeColors.INCOMPATIBLE;
  @property({type: Object})
  _templateIndex: ((name: string) => number | null) | null = null;
  _getNode(nodeName, graphHierarchy) {
    return graphHierarchy.node(nodeName);
  }
  _getRenderInfo(nodeName, renderHierarchy) {
    return this.renderHierarchy.getOrCreateRenderNodeByName(nodeName);
  }
  _toggleExpanded() {
    this._expanded = !this._expanded;
  }
  _getToggleIcon(expanded) {
    return expanded ? 'expand-less' : 'expand-more';
  }
  _resizeList(selector) {
    var list = document.querySelector(selector);
    if (list) {
      list.fire('iron-resize');
    }
  }
  @computed('graphHierarchy')
  get _incompatibleOpNodes(): Array<tf_graph.GroupNode | tf_graph.OpNode> {
    const graphHierarchy = this.graphHierarchy;
    if (!graphHierarchy || !graphHierarchy.root) {
      return [];
    }
    this.async(this._resizeList.bind(this, '#incompatibleOpsList'));
    return tf_graph_hierarchy.getIncompatibleOps(graphHierarchy);
  }
  @computed('graphHierarchy')
  get _opCompatScore(): number {
    var graphHierarchy = this.graphHierarchy;
    if (graphHierarchy && graphHierarchy.root) {
      var root = graphHierarchy.root;
      var numCompat = root.compatibilityHistogram.compatible;
      var numIncompat = root.compatibilityHistogram.incompatible;
      if (numCompat == 0 && numIncompat == 0) return 0;
      var numTotal = numCompat + numIncompat;
      // Round the ratio towards negative infinity.
      return Math.floor((100 * numCompat) / numTotal) / 100;
    }
    return 0;
  }
  @computed('_opCompatScore')
  get _opCompatScoreLabel(): string {
    var opCompatScore = this._opCompatScore;
    return d3.format('.0%')(opCompatScore);
  }
  @computed('graphHierarchy')
  get _totalIncompatOps(): number {
    var graphHierarchy = this.graphHierarchy;
    if (graphHierarchy && graphHierarchy.root) {
      return graphHierarchy.root.compatibilityHistogram.incompatible;
    }
    return 0;
  }
  @observe('graphHierarchy')
  _graphHierarchyChanged() {
    this._templateIndex = this.graphHierarchy.getTemplateIndex();
    this.graphHierarchy.addListener(
      tf_graph_hierarchy.HierarchyEvent.TEMPLATES_UPDATED,
      () => {
        this._templateIndex = this.graphHierarchy.getTemplateIndex();
      }
    );
  }
}
