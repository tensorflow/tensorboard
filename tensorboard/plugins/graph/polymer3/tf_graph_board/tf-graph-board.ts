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
import '@polymer/paper-progress';
import {DO_NOT_SUBMIT} from '../tf-imports/polymer.html';
import {DO_NOT_SUBMIT} from '../tf-graph-common/tf-graph-common.html';
import {DO_NOT_SUBMIT} from '../tf-graph-info/tf-graph-info.html';
import {DO_NOT_SUBMIT} from '../tf-graph/tf-graph.html';
import '@polymer/paper-progress';
import {DO_NOT_SUBMIT} from '../tf-imports/polymer.html';
import {DO_NOT_SUBMIT} from '../tf-graph-common/tf-graph-common.html';
import {DO_NOT_SUBMIT} from '../tf-graph-info/tf-graph-info.html';
import {DO_NOT_SUBMIT} from '../tf-graph/tf-graph.html';
@customElement('tf-graph-board')
class TfGraphBoard extends PolymerElement {
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
        ></tf-graph>
      </div>
      <div id="info">
        <tf-graph-info
          id="graph-info"
          title="selected"
          graph-hierarchy="[[graphHierarchy]]"
          hierarchy-params="[[hierarchyParams]]"
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
  graphHierarchy: object;
  @property({type: Object})
  graph: object;
  @property({type: Object})
  stats: object;
  @property({type: Object})
  progress: object;
  @property({type: Boolean})
  traceInputs: boolean;
  @property({type: String})
  colorBy: string;
  @property({
    type: Object,
    notify: true,
  })
  colorByParams: object;
  @property({
    type: Object,
    notify: true,
  })
  renderHierarchy: object;
  @property({type: Boolean})
  debuggerDataEnabled: boolean;
  @property({type: Boolean})
  areHealthPillsLoading: boolean;
  @property({
    type: Array,
    notify: true,
  })
  debuggerNumericAlerts: unknown[];
  @property({type: Object})
  nodeNamesToHealthPills: object;
  @property({
    type: Boolean,
    notify: true,
  })
  allStepsModeEnabled: boolean = false;
  @property({
    type: Number,
    notify: true,
  })
  specificHealthPillStep: number = 0;
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
  @property({type: Object})
  edgeWidthFunction: object;
  @property({type: Number})
  _selectedNodeInclude: number;
  @property({type: String})
  _highlightedNode: string;
  @property({type: Object})
  handleNodeSelected: object;
  @property({type: Object})
  edgeLabelFunction: object;
  @property({type: Object})
  handleEdgeSelected: object;
  fit() {
    this.$.graph.fit();
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
    this.$.graph.nodeToggleExtract(event.detail.name);
  }
  _onNodeSeriesGroupToggled(event) {
    this.$.graph.nodeToggleSeriesGroup(event.detail.name);
  }
  @observe('selectedNode', 'renderHierarchy')
  _updateNodeInclude() {
    const node = !this.renderHierarchy
      ? null
      : this.renderHierarchy.getNodeByName(this.selectedNode);
    this._selectedNodeInclude = node
      ? node.include
      : tf.graph.InclusionType.UNSPECIFIED;
  }
}
