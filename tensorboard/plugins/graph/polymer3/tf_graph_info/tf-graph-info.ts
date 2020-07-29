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

import { PolymerElement, html } from "@polymer/polymer";
import { customElement, property } from "@polymer/decorators";
import "@polymer/paper-material";
import "@polymer/paper-slider";
import "@polymer/paper-spinner";
import { DO_NOT_SUBMIT } from "../tf-imports/polymer.html";
import { DO_NOT_SUBMIT } from "../tf-graph-common/tf-graph-common.html";
import { DO_NOT_SUBMIT } from "../tf-graph-debugger-data-card/tf-graph-debugger-data-card.html";
import { DO_NOT_SUBMIT } from "../tf-graph-op-compat-card/tf-graph-op-compat-card.html";
import { DO_NOT_SUBMIT } from "tf-node-info.html";
import "@polymer/paper-material";
import "@polymer/paper-slider";
import "@polymer/paper-spinner";
import { DO_NOT_SUBMIT } from "../tf-imports/polymer.html";
import { DO_NOT_SUBMIT } from "../tf-graph-common/tf-graph-common.html";
import { DO_NOT_SUBMIT } from "../tf-graph-debugger-data-card/tf-graph-debugger-data-card.html";
import { DO_NOT_SUBMIT } from "../tf-graph-op-compat-card/tf-graph-op-compat-card.html";
import { DO_NOT_SUBMIT } from "tf-node-info.html";
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
"use strict";
@customElement("tf-graph-info")
class TfGraphInfo extends PolymerElement {
    static readonly template = html `<style>
      :host {
        font-size: 12px;
        margin: 0;
        padding: 0;
        display: block;
        max-height: 650px;
        overflow-x: hidden;
        overflow-y: auto;
      }

      h2 {
        padding: 0;
        text-align: center;
        margin: 0;
      }
    </style>
    <template is="dom-if" if="{{selectedNode}}">
      <paper-material elevation="1" class="card">
        <tf-node-info graph-hierarchy="[[graphHierarchy]]" render-hierarchy="[[renderHierarchy]]" flat-graph="[[graph]]" graph-node-name="[[selectedNode]]" node-include="[[selectedNodeInclude]]" highlighted-node="{{highlightedNode}}" color-by="[[colorBy]]">
        </tf-node-info>
      </paper-material>
    </template>
    <template is="dom-if" if="[[_equals(colorBy, 'op_compatibility')]]">
      <tf-graph-op-compat-card graph-hierarchy="[[graphHierarchy]]" hierarchy-params="[[hierarchyParams]]" render-hierarchy="[[renderHierarchy]]" color-by="[[colorBy]]" node-title="[[compatNodeTitle]]">
      </tf-graph-op-compat-card>
    </template>
    <template is="dom-if" if="[[_healthPillsAvailable(debuggerDataEnabled, nodeNamesToHealthPills)]]">
      <tf-graph-debugger-data-card render-hierarchy="[[renderHierarchy]]" debugger-numeric-alerts="[[debuggerNumericAlerts]]" node-names-to-health-pills="[[nodeNamesToHealthPills]]" selected-node="{{selectedNode}}" highlighted-node="{{highlightedNode}}" are-health-pills-loading="[[areHealthPillsLoading]]" all-steps-mode-enabled="{{allStepsModeEnabled}}" specific-health-pill-step="{{specificHealthPillStep}}" health-pill-step-index="{{healthPillStepIndex}}">
      </tf-graph-debugger-data-card>
    </template>`;
    @property({ type: String })
    title: string;
    @property({ type: Object })
    graphHierarchy: object;
    @property({ type: Object })
    graph: object;
    @property({ type: Object })
    renderHierarchy: object;
    @property({ type: Object })
    nodeNamesToHealthPills: object;
    @property({
        type: Number,
        notify: true
    })
    healthPillStepIndex: number;
    @property({ type: String })
    colorBy: string;
    @property({ type: String })
    compatNodeTitle: string;
    @property({
        type: String,
        notify: true
    })
    selectedNode: string;
    @property({
        type: String,
        notify: true
    })
    highlightedNode: string;
    @property({
        type: Number,
        notify: true
    })
    selectedNodeInclude: number;
    @property({ type: Boolean })
    debuggerDataEnabled: boolean;
    _nodeListItemClicked(event) {
        this.selectedNode = event.detail.nodeName;
    }
    _nodeListItemMouseover(event) {
        this.highlightedNode = event.detail.nodeName;
    }
    _nodeListItemMouseout() {
        this.highlightedNode = null;
    }
    _healthPillsAvailable(debuggerDataEnabled, nodeNamesToHealthPills) {
        // So long as there is a mapping (even if empty) from node name to health pills, show the
        // legend and slider. We do that because, even if no health pills exist at the current step,
        // the user may desire to change steps, and the slider must show for the user to do that.
        return (debuggerDataEnabled &&
            nodeNamesToHealthPills &&
            Object.keys(nodeNamesToHealthPills).length > 0);
    }
    _equals(a, b) {
        return a === b;
    }
}
