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
import {customElement, observe, property} from '@polymer/decorators';
import {html, PolymerElement} from '@polymer/polymer';
import '../../../components/polymer/irons_and_papers';
import {LegacyElementMixin} from '../../../components/polymer/legacy_element_mixin';
import '../tf_graph/tf-graph';
import * as tf_graph from '../tf_graph_common/graph';
import * as tf_graph_hierarchy from '../tf_graph_common/hierarchy';
import * as tf_graph_render from '../tf_graph_common/render';
import {ColorBy} from '../tf_graph_common/view_types';
import '../tf_graph_info/tf-graph-info';

/**
 * Some UX features, such as 'color by structure', rely on the 'template'
 * information of a graph. This can be very expensive to compute when the
 * graph is too large. This object's constants determine what constitutes
 * a 'large' graph. Graphs that exceed all these constraints should not
 * have templates computed by default.
 */
const maxGraphSizeToComputeTemplates = {
  MAX_NODE_COUNT: 10000,
  MAX_EDGE_COUNT: 10000,
};

/**
 * Element for putting tf-graph and tf-graph-info side by side.
 *
 * Example
 * <tf-graph-board graph=[[graph]]></tf-graph-board>
 */
@customElement('tf-graph-board')
class TfGraphBoard extends LegacyElementMixin(PolymerElement) {
  static readonly template = html`
    <style>
      ::host {
        display: block;
      }

      /deep/ .close {
        position: absolute;
        cursor: pointer;
        left: 15px;
        bottom: 15px;
      }

      .container {
        width: 100%;
        height: 100%;
        opacity: 1;
      }

      .container.loading {
        cursor: progress;
        opacity: 0.1;
      }

      .container.loading.error {
        cursor: auto;
      }

      #info {
        position: absolute;
        right: 5px;
        top: 5px;
        padding: 0px;
        max-width: 380px;
        min-width: 320px;
        background-color: rgba(255, 255, 255, 0.9);
        @apply --shadow-elevation-2dp;
      }

      #main {
        width: 100%;
        height: 100%;
      }

      #progress-bar {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
        position: absolute;
        top: 40px;
        left: 0;
        font-size: 13px;
      }

      #progress-msg {
        margin-bottom: 5px;
        white-space: pre-wrap;
        width: 400px;
      }

      paper-progress {
        width: 400px;
        --paper-progress-height: 6px;
        --paper-progress-active-color: #f3913e;
      }

      .context-menu {
        position: absolute;
        display: none;
        background-color: #e2e2e2;
        border-radius: 2px;
        font-size: 14px;
        min-width: 150px;
        border: 1px solid #d4d4d4;
      }

      /deep/ .context-menu ul {
        list-style-type: none;
        margin: 0;
        padding: 0;
        cursor: default;
      }

      /deep/ .context-menu ul li {
        padding: 4px 16px;
      }

      /deep/ .context-menu ul li:hover {
        background-color: #f3913e;
        color: white;
      }
    </style>
    <template is="dom-if" if="[[_isNotComplete(progress)]]">
      <div id="progress-bar">
        <div id="progress-msg">[[progress.msg]]</div>
        <paper-progress value="[[progress.value]]"></paper-progress>
      </div>
    </template>
    <div class$="[[_getContainerClass(progress)]]">
      <div id="main">
        <tf-graph
          id="graph"
          graph-hierarchy="{{graphHierarchy}}"
          basic-graph="[[graph]]"
          hierarchy-params="[[hierarchyParams]]"
          render-hierarchy="{{renderHierarchy}}"
          devices-for-stats="[[devicesForStats]]"
          stats="[[stats]]"
          selected-node="{{selectedNode}}"
          highlighted-node="{{_highlightedNode}}"
          color-by="[[colorBy]]"
          color-by-params="{{colorByParams}}"
          progress="{{progress}}"
          edge-label-function="[[edgeLabelFunction]]"
          edge-width-function="[[edgeWidthFunction]]"
          node-names-to-health-pills="[[nodeNamesToHealthPills]]"
          health-pill-step-index="[[healthPillStepIndex]]"
          handle-node-selected="[[handleNodeSelected]]"
          handle-edge-selected="[[handleEdgeSelected]]"
          trace-inputs="[[traceInputs]]"
          auto-extract-nodes="[[autoExtractNodes]]"
        ></tf-graph>
      </div>
      <div id="info">
        <tf-graph-info
          id="graph-info"
          title="selected"
          graph-hierarchy="[[graphHierarchy]]"
          render-hierarchy="[[renderHierarchy]]"
          graph="[[graph]]"
          selected-node="{{selectedNode}}"
          selected-node-include="{{_selectedNodeInclude}}"
          highlighted-node="{{_highlightedNode}}"
          color-by="[[colorBy]]"
          color-by-params="[[colorByParams]]"
          debugger-data-enabled="[[debuggerDataEnabled]]"
          are-health-pills-loading="[[areHealthPillsLoading]]"
          debugger-numeric-alerts="[[debuggerNumericAlerts]]"
          node-names-to-health-pills="[[nodeNamesToHealthPills]]"
          all-steps-mode-enabled="{{allStepsModeEnabled}}"
          specific-health-pill-step="{{specificHealthPillStep}}"
          health-pill-step-index="{{healthPillStepIndex}}"
          compat-node-title="[[compatNodeTitle]]"
          on-node-toggle-inclusion="_onNodeInclusionToggled"
          on-node-toggle-seriesgroup="_onNodeSeriesGroupToggled"
        ></tf-graph-info>
      </div>
    </div>
  `;
  @property({type: Object})
  graphHierarchy: tf_graph_hierarchy.Hierarchy;
  @property({type: Object})
  graph: tf_graph.SlimGraph;
  // TODO(psybuzz): ideally, this would be a required property and the component
  // that owns <tf-graph-board> and the graph loader should create these params.
  @property({type: Object})
  hierarchyParams: tf_graph_hierarchy.HierarchyParams =
    tf_graph_hierarchy.DefaultHierarchyParams;
  @property({type: Object})
  stats: object;
  /**
   * A number between 0 and 100 denoting the % of progress
   * for the progress bar and the displayed message.
   * @type {{value: number, msg: string}}
   */
  @property({type: Object})
  progress: object;
  @property({type: Boolean})
  traceInputs: boolean;
  @property({type: Boolean})
  autoExtractNodes: boolean;
  @property({
    type: String,
    notify: true,
  })
  colorBy: ColorBy;
  @property({
    type: Object,
    notify: true,
  })
  colorByParams: object;
  @property({
    type: Object,
    notify: true,
  })
  renderHierarchy: tf_graph_render.RenderGraphInfo;
  // Whether debugger data is enabled for this instance of Tensorboard.
  @property({type: Boolean})
  debuggerDataEnabled: boolean;
  // Whether health pills are currently being loaded.
  @property({type: Boolean})
  areHealthPillsLoading: boolean;
  @property({
    type: Array,
    notify: true,
  })
  // An array of alerts (in chronological order) provided by debugging libraries on when bad
  // values (NaN, +/- Inf) appear.
  debuggerNumericAlerts: unknown[];
  @property({type: Object})
  // A mapping between node name to the tf.graph.scene.HealthPill to render.
  nodeNamesToHealthPills: object;
  // Whether the user can request health pills for individual steps from the server. This can be
  // slow compared the default of showing sampled health pills.
  @property({
    type: Boolean,
    notify: true,
  })
  allStepsModeEnabled: boolean = false;
  // Relevant if allStepsModeEnabled. The specific step for which to fetch health pills from the
  // server for.
  @property({
    type: Number,
    notify: true,
  })
  specificHealthPillStep: number = 0;
  // The step of health pills to show throughout the graph.
  @property({type: Number})
  healthPillStepIndex: number;
  @property({
    type: String,
    notify: true,
  })
  selectedNode: string;
  @property({
    type: String,
  })
  compatNodeTitle: string = 'TPU Compatibility';
  // A function with signature EdgeThicknessFunction that computes the
  // thickness of a given edge.
  @property({type: Object})
  edgeWidthFunction: object;
  // The enum value of the include property of the selected node.
  @property({type: Number})
  _selectedNodeInclude: number;
  @property({type: String})
  _highlightedNode: string;
  // An optional function that takes a node selected event (whose `detail`
  // property is the selected node ... which could be null if a node is
  // deselected). Called whenever a node is selected or deselected.
  @property({type: Object})
  handleNodeSelected: object;
  // An optional function that computes the label for an edge. Should
  // implement the EdgeLabelFunction signature.
  @property({type: Object})
  edgeLabelFunction: object;
  // An optional callback that implements the tf.graph.edge.EdgeSelectionCallback signature. If
  // provided, edges are selectable, and this callback is run when an edge is selected.
  @property({type: Object})
  handleEdgeSelected: object;
  fit() {
    (this.$.graph as any).fit();
  }
  async downloadAsImage(filename: string) {
    const blob = await (this.$.graph as any).getImageBlob();
    const element = document.createElement('a');
    (element as any).href = (URL as any).createObjectURL(blob);
    element.download = filename;
    element.click();
    URL.revokeObjectURL(element.href);
  }
  /** True if the progress is not complete yet (< 100 %). */
  _isNotComplete(progress) {
    return progress.value < 100;
  }
  _getContainerClass(progress) {
    var result = 'container';
    if (progress.error) {
      result += ' error';
    }
    if (this._isNotComplete(progress)) {
      result += ' loading';
    }
    return result;
  }
  _onNodeInclusionToggled(event) {
    (this.$.graph as any).nodeToggleExtract(event.detail.name);
  }
  _onNodeSeriesGroupToggled(event) {
    (this.$.graph as any).nodeToggleSeriesGroup(event.detail.name);
  }
  @observe('selectedNode', 'renderHierarchy')
  _updateNodeInclude() {
    const node = !this.renderHierarchy
      ? null
      : this.renderHierarchy.getNodeByName(this.selectedNode);
    this._selectedNodeInclude = node
      ? node.include
      : tf_graph.InclusionType.UNSPECIFIED;
  }
  @observe('graph')
  _slimGraphChanged() {
    // By default, avoid coloring by 'structure' for large graphs, since it may be very expensive.
    // Color by 'structure' is still available to users via explicit gesture.
    if (!this.graph) {
      return;
    }
    const {MAX_NODE_COUNT, MAX_EDGE_COUNT} = maxGraphSizeToComputeTemplates;
    const isGraphTooLarge =
      Object.keys(this.graph.nodes).length > MAX_NODE_COUNT &&
      this.graph.edges.length > MAX_EDGE_COUNT;
    if (isGraphTooLarge && this.colorBy === ColorBy.STRUCTURE) {
      this.colorBy = ColorBy.NONE;
    }
  }
  @observe('colorBy', 'graphHierarchy')
  _ensureTemplates() {
    if (!this.graphHierarchy || this.colorBy !== ColorBy.STRUCTURE) {
      return;
    }
    if (this.graphHierarchy.getTemplateIndex()) {
      return;
    }
    this.graphHierarchy.updateTemplates();
  }
}
