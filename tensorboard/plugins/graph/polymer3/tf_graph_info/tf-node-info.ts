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
import '@polymer/iron-collapse';
import '@polymer/iron-list';
import '@polymer/paper-button';
import '@polymer/paper-icon-button';
import '@polymer/paper-item';
import '@polymer/paper-item';
import {DO_NOT_SUBMIT} from '../tf-imports/polymer.html';
import {DO_NOT_SUBMIT} from '../tf-graph-common/tf-graph-common.html';
import {DO_NOT_SUBMIT} from '../tf-graph-common/tf-node-icon.html';
import {DO_NOT_SUBMIT} from '../tf-wbr-string/tf-wbr-string.html';
import {DO_NOT_SUBMIT} from 'tf-node-list-item.html';
import '@polymer/iron-collapse';
import '@polymer/iron-list';
import '@polymer/paper-button';
import '@polymer/paper-icon-button';
import '@polymer/paper-item';
import '@polymer/paper-item';
import {DO_NOT_SUBMIT} from '../tf-imports/polymer.html';
import {DO_NOT_SUBMIT} from '../tf-graph-common/tf-graph-common.html';
import {DO_NOT_SUBMIT} from '../tf-graph-common/tf-node-icon.html';
import {DO_NOT_SUBMIT} from '../tf-wbr-string/tf-wbr-string.html';
import {DO_NOT_SUBMIT} from 'tf-node-list-item.html';
@customElement('tf-node-info')
class TfNodeInfo extends PolymerElement {
  static readonly template = html`
    <style>
      .sub-list-group {
        font-weight: 500;
        font-size: 12pt;
        padding-bottom: 8px;
        width: 100%;
      }

      .sub-list {
        max-height: 300px;
        overflow-y: scroll;
      }

      .attr-left {
        float: left;
        width: 30%;
        word-wrap: break-word;
        color: #565656;
        font-size: 11pt;
        font-weight: 400;
      }

      .attr-right {
        margin-left: 30%;
        word-wrap: break-word;
        color: #565656;
        font-weight: 400;
      }

      .sub-list-table {
        display: table;
        width: 100%;
      }

      .sub-list-table-row {
        display: table-row;
      }

      .sub-list-table-row .sub-list-table-cell:last-child {
        text-align: right;
      }

      .sub-list-table-cell {
        color: #565656;
        display: table-cell;
        font-size: 11pt;
        font-weight: 400;
        max-width: 200px;
        padding: 0 4px;
      }

      paper-item {
        padding: 0;
        background: #e9e9e9;
      }

      paper-item-body[two-line] {
        min-height: 0;
        padding: 8px 12px 4px;
      }

      .expandedInfo {
        padding: 8px 12px;
      }

      .controlDeps {
        padding: 0 0 0 8px;
      }

      .node-name {
        white-space: normal;
        word-wrap: break-word;
        font-size: 14pt;
        font-weight: 500;
      }

      .node-icon {
        float: right;
      }

      .subtitle {
        font-size: 12pt;
        color: #5e5e5e;
      }

      .controlLine {
        font-size: 11pt;
        font-weight: 400;
      }

      .toggle-button {
        float: right;
        max-height: 20px;
        max-width: 20px;
        padding: 0;
      }

      .control-toggle-button {
        float: left;
        max-height: 20px;
        max-width: 20px;
        padding: 0;
      }

      .toggle-include-group {
        padding-top: 4px;
      }

      .toggle-include {
        margin: 5px 6px;
        text-transform: none;
        padding: 4px 6px;
        font-size: 10pt;
        background-color: #fafafa;
        color: #666;
      }

      .toggle-include:hover {
        background-color: var(--google-yellow-100);
      }

      .non-control-list-item {
        padding-left: 10px;
      }
    </style>
    <paper-item>
      <paper-item-body two-line="">
        <div>
          <paper-icon-button
            icon="{{_getToggleIcon(_expanded)}}"
            on-click="_toggleExpanded"
            class="toggle-button"
          >
          </paper-icon-button>
          <div class="node-name">
            <tf-wbr-string value="[[_node.name]]" delimiter-pattern="/">
            </tf-wbr-string>
          </div>
        </div>
        <div secondary="">
          <tf-node-icon
            class="node-icon"
            node="[[_node]]"
            render-info="[[_getRenderInfo(graphNodeName, renderHierarchy)]]"
            color-by="[[colorBy]]"
            template-index="[[_templateIndex]]"
          ></tf-node-icon>
          <template is="dom-if" if="{{_node.op}}">
            <div class="subtitle">
              Operation:
              <span>[[_node.op]]</span>
            </div>
          </template>
          <template is="dom-if" if="{{_node.metagraph}}">
            <div class="subtitle">
              Subgraph:
              <span>[[_node.cardinality]]</span> nodes
            </div>
          </template>
        </div>
      </paper-item-body>
    </paper-item>
    <iron-collapse opened="{{_expanded}}">
      <template is="dom-if" if="{{_expanded}}" restamp="true">
        <div class="expandedInfo">
          <div class="sub-list-group attributes">
            Attributes (<span>[[_attributes.length]]</span>)
            <iron-list
              class="sub-list"
              id="attributesList"
              items="[[_attributes]]"
            >
              <template>
                <div>
                  <div class="attr-left">[[item.key]]</div>
                  <div class="attr-right">[[item.value]]</div>
                </div>
              </template>
            </iron-list>
          </div>

          <template is="dom-if" if="{{_device}}">
            <div class="sub-list-group device">
              <div class="attr-left">Device</div>
              <div class="attr-right">[[_device]]</div>
            </div>
          </template>

          <div class="sub-list-group predecessors">
            Inputs (<span>[[_totalPredecessors]]</span>)
            <iron-list
              class="sub-list"
              id="inputsList"
              items="[[_predecessors.regular]]"
            >
              <template>
                <tf-node-list-item
                  class="non-control-list-item"
                  card-node="[[_node]]"
                  item-node="[[item.node]]"
                  edge-label="[[item.edgeLabel]]"
                  item-render-info="[[item.renderInfo]]"
                  name="[[item.name]]"
                  item-type="predecessors"
                  color-by="[[colorBy]]"
                  template-index="[[_templateIndex]]"
                >
                </tf-node-list-item>
              </template>
            </iron-list>
            <template is="dom-if" if="[[_predecessors.control.length]]">
              <div class="controlDeps">
                <div class="controlLine">
                  <paper-icon-button
                    icon="{{_getToggleIcon(_openedControlPred)}}"
                    on-click="_toggleControlPred"
                    class="control-toggle-button"
                  >
                  </paper-icon-button>
                  Control dependencies
                </div>
                <iron-collapse opened="{{_openedControlPred}}" no-animation="">
                  <template
                    is="dom-if"
                    if="{{_openedControlPred}}"
                    restamp="true"
                  >
                    <iron-list
                      class="sub-list"
                      items="[[_predecessors.control]]"
                    >
                      <template>
                        <tf-node-list-item
                          card-node="[[_node]]"
                          item-node="[[item.node]]"
                          item-render-info="[[item.renderInfo]]"
                          name="[[item.name]]"
                          item-type="predecessors"
                          color-by="[[colorBy]]"
                          template-index="[[_templateIndex]]"
                        >
                        </tf-node-list-item>
                      </template>
                    </iron-list>
                  </template>
                </iron-collapse>
              </div>
            </template>
          </div>

          <div class="sub-list-group successors">
            Outputs (<span>[[_totalSuccessors]]</span>)
            <iron-list
              class="sub-list"
              id="outputsList"
              items="[[_successors.regular]]"
            >
              <template>
                <tf-node-list-item
                  class="non-control-list-item"
                  card-node="[[_node]]"
                  item-node="[[item.node]]"
                  edge-label="[[item.edgeLabel]]"
                  item-render-info="[[item.renderInfo]]"
                  name="[[item.name]]"
                  item-type="successor"
                  color-by="[[colorBy]]"
                  template-index="[[_templateIndex]]"
                >
                </tf-node-list-item>
              </template>
            </iron-list>
            <template is="dom-if" if="[[_successors.control.length]]">
              <div class="controlDeps">
                <div class="controlLine">
                  <paper-icon-button
                    icon="{{_getToggleIcon(_openedControlSucc)}}"
                    on-click="_toggleControlSucc"
                    class="control-toggle-button"
                  >
                  </paper-icon-button>
                  Control dependencies
                </div>
                <iron-collapse opened="{{_openedControlSucc}}" no-animation="">
                  <template
                    is="dom-if"
                    if="{{_openedControlSucc}}"
                    restamp="true"
                  >
                    <iron-list class="sub-list" items="[[_successors.control]]">
                      <template>
                        <tf-node-list-item
                          card-node="[[_node]]"
                          item-node="[[item.node]]"
                          item-render-info="[[item.renderInfo]]"
                          name="[[item.name]]"
                          item-type="successors"
                          color-by="[[colorBy]]"
                          template-index="[[_templateIndex]]"
                        >
                        </tf-node-list-item>
                      </template>
                    </iron-list>
                  </template>
                </iron-collapse>
              </div>
            </template>
          </div>
          <template is="dom-if" if="{{_hasDisplayableNodeStats}}">
            <div class="sub-list-group node-stats">
              Node Stats
              <div class="sub-list-table">
                <template is="dom-if" if="{{_nodeStats.totalBytes}}">
                  <div class="sub-list-table-row">
                    <div class="sub-list-table-cell">Memory</div>
                    <div class="sub-list-table-cell">
                      [[_nodeStatsFormattedBytes]]
                    </div>
                  </div>
                </template>
                <template is="dom-if" if="{{_getTotalMicros(_nodeStats)}}">
                  <div class="sub-list-table-row">
                    <div class="sub-list-table-cell">Compute Time</div>
                    <div class="sub-list-table-cell">
                      [[_nodeStatsFormattedComputeTime]]
                    </div>
                  </div>
                </template>
                <template is="dom-if" if="{{_nodeStats.outputSize}}">
                  <div class="sub-list-table-row">
                    <div class="sub-list-table-cell">Tensor Output Sizes</div>
                    <div class="sub-list-table-cell">
                      <template
                        is="dom-repeat"
                        items="{{_nodeStatsFormattedOutputSizes}}"
                      >
                        [[item]] <br />
                      </template>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </template>

          <template is="dom-if" if="[[_functionUsages.length]]">
            <div class="sub-list-group predecessors">
              Usages of the Function (<span>[[_functionUsages.length]]</span>)
              <iron-list
                class="sub-list"
                id="functionUsagesList"
                items="[[_functionUsages]]"
              >
                <template>
                  <tf-node-list-item
                    class="non-control-list-item"
                    card-node="[[_node]]"
                    item-node="[[item]]"
                    name="[[item.name]]"
                    item-type="functionUsages"
                    color-by="[[colorBy]]"
                    template-index="[[_templateIndex]]"
                  >
                  </tf-node-list-item>
                </template>
              </iron-list>
            </div>
          </template>

          <template is="dom-if" if="[[!_isLibraryFunction(_node)]]">
            <div class="toggle-include-group">
              <paper-button
                raised=""
                class="toggle-include"
                on-click="_toggleInclude"
              >
                <span>[[_auxButtonText]]</span>
              </paper-button>
            </div>
          </template>

          <template is="dom-if" if="{{_isInSeries(_node)}}">
            <div class="toggle-include-group">
              <paper-button
                raised=""
                class="toggle-include"
                on-click="_toggleGroup"
              >
                <span>[[_groupButtonText]]</span>
              </paper-button>
            </div>
          </template>
        </div>
      </template>
    </iron-collapse>
  `;
  @property({type: String})
  graphNodeName: string;
  @property({type: Object})
  graphHierarchy: object;
  @property({type: Object})
  renderHierarchy: object;
  @property({type: String})
  colorBy: string;
  @property({
    type: Object,
    computed: '_getNode(graphNodeName, graphHierarchy)',
    observer: '_resetState',
  })
  _node: object;
  @property({
    type: Object,
    computed: '_getNodeStats(graphNodeName, graphHierarchy)',
    observer: '_resetState',
  })
  _nodeStats: object;
  @property({
    type: Number,
    observer: '_nodeIncludeStateChanged',
  })
  nodeInclude: number;
  @property({
    type: Boolean,
  })
  _expanded: boolean = true;
  @property({
    type: Boolean,
  })
  _openedControlPred: boolean = false;
  @property({
    type: Boolean,
  })
  _openedControlSucc: boolean = false;
  @property({type: String})
  _auxButtonText: string;
  @property({type: String})
  _groupButtonText: string;
  expandNode() {
    this.fire('_node.expand', this.node);
  }
  @computed('graphHierarchy')
  get _templateIndex(): object {
    var graphHierarchy = this.graphHierarchy;
    return graphHierarchy.getTemplateIndex();
  }
  _getNode(graphNodeName, graphHierarchy) {
    return graphHierarchy.node(graphNodeName);
  }
  _getNodeStats(graphNodeName, graphHierarchy) {
    var node = this._getNode(graphNodeName, graphHierarchy);
    if (node) {
      return node.stats;
    }
    return null;
  }
  _getTotalMicros(stats) {
    return stats ? stats.getTotalMicros() : 0;
  }
  @computed('_nodeStats')
  get _hasDisplayableNodeStats(): object {
    var stats = this._nodeStats;
    return tf.graph.util.hasDisplayableNodeStats(stats);
  }
  @computed('_nodeStats')
  get _nodeStatsFormattedBytes(): string {
    var stats = this._nodeStats;
    if (!stats || !stats.totalBytes) {
      return;
    }
    return tf.graph.util.convertUnitsToHumanReadable(
      stats.totalBytes,
      tf.graph.util.MEMORY_UNITS
    );
  }
  @computed('_nodeStats')
  get _nodeStatsFormattedComputeTime(): string {
    var stats = this._nodeStats;
    if (!stats || !stats.getTotalMicros()) {
      return;
    }
    return tf.graph.util.convertUnitsToHumanReadable(
      stats.getTotalMicros(),
      tf.graph.util.TIME_UNITS
    );
  }
  @computed('_nodeStats')
  get _nodeStatsFormattedOutputSizes(): unknown[] {
    var stats = this._nodeStats;
    if (!stats || !stats.outputSize || !stats.outputSize.length) {
      return;
    }
    return _.map(stats.outputSize, function(shape) {
      if (shape.length === 0) {
        return 'scalar';
      }
      return '[' + shape.join(', ') + ']';
    });
  }
  _getRenderInfo(graphNodeName, renderHierarchy) {
    return this.renderHierarchy.getOrCreateRenderNodeByName(graphNodeName);
  }
  @computed('_node')
  get _attributes(): unknown[] {
    var node = this._node;
    this.async(this._resizeList.bind(this, '#attributesList'));
    if (!node || !node.attr) {
      return [];
    }
    var attrs = [];
    _.each(node.attr, function(entry) {
      // Unpack the "too large" attributes into separate attributes
      // in the info card, with values "too large to show".
      if (entry.key === tf.graph.LARGE_ATTRS_KEY) {
        attrs = attrs.concat(
          entry.value.list.s.map(function(key) {
            return {key: key, value: 'Too large to show...'};
          })
        );
      } else {
        attrs.push({
          key: entry.key,
          value: JSON.stringify(entry.value),
        });
      }
    });
    return attrs;
  }
  @computed('_node')
  get _device(): string {
    var node = this._node;
    return node ? node.device : null;
  }
  @computed('_node', 'graphHierarchy')
  get _successors(): object {
    var node = this._node;
    var hierarchy = this.graphHierarchy;
    this._refreshNodeItemList('inputsList');
    if (!node) {
      return {regular: [], control: []};
    }
    return this._convertEdgeListToEdgeInfoList(
      hierarchy.getSuccessors(node.name),
      false,
      node.isGroupNode
    );
  }
  @computed('_node', 'graphHierarchy')
  get _predecessors(): object {
    var node = this._node;
    var hierarchy = this.graphHierarchy;
    this._refreshNodeItemList('outputsList');
    if (!node) {
      return {regular: [], control: []};
    }
    return this._convertEdgeListToEdgeInfoList(
      hierarchy.getPredecessors(node.name),
      true,
      node.isGroupNode
    );
  }
  @computed('_node', 'graphHierarchy')
  get _functionUsages(): unknown[] {
    var node = this._node;
    var hierarchy = this.graphHierarchy;
    this._refreshNodeItemList('functionUsagesList');
    if (!node || node.type !== tf.graph.NodeType.META) {
      // Functions must be represented by metanodes.
      return [];
    }
    const libraryFunctionData =
      hierarchy.libraryFunctions[node.associatedFunction];
    if (!libraryFunctionData) {
      // This is no function.
      return [];
    }
    // Return where the function is used.
    return libraryFunctionData.usages;
  }
  // The iron lists that enumerate ops must be asynchronously updated when
  // the data they render changes. This function triggers that update.
  _refreshNodeItemList(nodeListId) {
    this.async(this._resizeList.bind(this, `#${nodeListId}`));
  }
  _convertEdgeListToEdgeInfoList(list, isPredecessor, isGroupNode) {
    /**
     * Unpacks the metaedge into a list of base edge information
     * that can be rendered.
     */
    var unpackMetaedge = (metaedge) => {
      return _.map(metaedge.baseEdgeList, (baseEdge) => {
        var name = isPredecessor ? baseEdge.v : baseEdge.w;
        return {
          name: name,
          node: this._getNode(name, this.graphHierarchy),
          edgeLabel: tf.graph.scene.edge.getLabelForBaseEdge(
            baseEdge,
            this.renderHierarchy
          ),
          renderInfo: this._getRenderInfo(name, this.renderHierarchy),
        };
      });
    };
    /**
     * Converts a list of metaedges to a list of edge information
     * that can be rendered.
     */
    var toEdgeInfoList = function(edges) {
      var edgeInfoList = [];
      _.each(edges, (metaedge) => {
        var name = isPredecessor ? metaedge.v : metaedge.w;
        // Enumerate all the base edges if the node is an OpNode, or the
        // metaedge has only 1 edge in it.
        if (!isGroupNode || metaedge.baseEdgeList.length == 1) {
          edgeInfoList = edgeInfoList.concat(unpackMetaedge(metaedge));
        } else {
          edgeInfoList.push({
            name: name,
            node: this._getNode(name, this.graphHierarchy),
            edgeLabel: tf.graph.scene.edge.getLabelForEdge(
              metaedge,
              this.renderHierarchy
            ),
            renderInfo: this._getRenderInfo(name, this.renderHierarchy),
          });
        }
      });
      return edgeInfoList;
    }.bind(this);
    return {
      regular: toEdgeInfoList(list.regular),
      control: toEdgeInfoList(list.control),
    };
  }
  @computed('_node')
  get _subnodes(): unknown[] {
    var node = this._node;
    return node && node.metagraph ? node.metagraph.nodes() : null;
  }
  @computed('_predecessors')
  get _totalPredecessors(): number {
    var predecessors = this._predecessors;
    return predecessors.regular.length + predecessors.control.length;
  }
  @computed('_successors')
  get _totalSuccessors(): number {
    var successors = this._successors;
    return successors.regular.length + successors.control.length;
  }
  _toggleControlPred() {
    this._openedControlPred = !this._openedControlPred;
  }
  _toggleControlSucc() {
    this._openedControlSucc = !this._openedControlSucc;
  }
  _toggleExpanded() {
    this._expanded = !this._expanded;
  }
  _getToggleIcon(expanded) {
    return expanded ? 'expand-less' : 'expand-more';
  }
  _resetState() {
    this._openedControlPred = false;
    this._openedControlSucc = false;
    this.set(
      '_groupButtonText',
      tf.graph.scene.node.getGroupSettingLabel(this._node)
    );
  }
  _resizeList(selector) {
    var list = document.querySelector(selector);
    if (list) {
      list.fire('iron-resize');
    }
  }
  _toggleInclude() {
    this.fire('node-toggle-inclusion', {name: this.graphNodeName});
  }
  _nodeIncludeStateChanged(include, oldInclude) {
    this.set('_auxButtonText', tf.graph.getIncludeNodeButtonString(include));
  }
  _toggleGroup() {
    var seriesName = tf.graph.scene.node.getSeriesName(this._node);
    this.fire('node-toggle-seriesgroup', {name: seriesName});
  }
  _isLibraryFunction(node) {
    // If the node name starts with this string, the node is either a
    // library function or a node within it. Those nodes should never be
    // extracted into the auxiliary scene group because they represent
    // templates for function call nodes, not ops in the graph themselves.
    return node && node.name.startsWith(tf.graph.FUNCTION_LIBRARY_NODE_PREFIX);
  }
  _isInSeries(node) {
    return tf.graph.scene.node.canBeInSeries(node);
  }
}
