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
import * as _ from 'lodash';
import '../../../components/polymer/irons_and_papers';
import {LegacyElementMixin} from '../../../components/polymer/legacy_element_mixin';
import * as tb_debug from '../../../components/tb_debug';
import '../../../components/tf_dashboard_common/tensorboard-color';
import * as tf_graph_util from '../tf_graph_common/util';

@customElement('tf-graph-node-search')
class TfGraphNodeSearch extends LegacyElementMixin(PolymerElement) {
  static readonly template = html`
    <div id="search-container">
      <paper-input
        id="runs-regex"
        label="Search nodes (regex)"
        value="{{_rawRegexInput}}"
      >
      </paper-input>
      <div id="search-results-anchor">
        <div id="search-results">
          <template is="dom-repeat" items="[[_regexMatches]]">
            <div id="search-match" on-click="_matchClicked">[[item]]</div>
          </template>
        </div>
      </div>
    </div>
    <style>
      #search-container {
        width: 100%;
        overflow: visible;
      }

      #runs-regex {
        width: 100%;
      }

      #search-results-anchor {
        position: relative;
      }

      #search-results {
        color: #fff;
        position: absolute;
        max-height: 200px;
        overflow-x: hidden;
        overflow-y: auto;
        text-align: right;
        max-width: 100%;
        box-sizing: border-box;
      }

      #search-match {
        background: var(--tb-orange-strong);
        padding: 3px;
        float: right;
        width: 100%;
        box-sizing: border-box;
        direction: rtl;
      }

      #search-match:hover {
        background: var(--tb-orange-weak);
        cursor: pointer;
      }
    </style>
  `;
  @property({type: Object})
  renderHierarchy: any;
  @property({
    type: String,
    notify: true,
  })
  selectedNode: string;
  @property({
    type: String,
  })
  _rawRegexInput: string = '';
  @property({
    type: String,
  })
  // The value of the regex input for the last search.
  _previousRegexInput: string = '';
  @property({
    type: Number,
  })
  _searchTimeoutDelay: number = 150;
  @property({type: Boolean})
  _searchPending: boolean;
  @property({
    type: Number,
  })
  _maxRegexResults: number = 42;
  @property({type: Array})
  _regexMatches: unknown[];
  // This is the cleaned input.
  @computed('renderHierarchy', '_rawRegexInput')
  get _regexInput(): string {
    var renderHierarchy = this.renderHierarchy;
    var rawRegexInput = this._rawRegexInput;
    return rawRegexInput.trim();
  }
  @observe('_regexInput')
  _regexInputChanged() {
    var regexInput = this._regexInput;
    this._requestSearch();
  }
  _clearSearchResults() {
    this.set('_regexMatches', []);
  }
  _requestSearch() {
    if (this._searchPending) {
      return;
    }
    if (this._regexInput === this._previousRegexInput) {
      // No new search is needed.
      this._searchPending = false;
      return;
    }
    this._searchPending = true;
    this._executeSearch();
    // After some time, perhaps execute another search.
    this.async(() => {
      this._searchPending = false;
      this._requestSearch();
    }, this._searchTimeoutDelay);
  }
  _executeSearch() {
    this._previousRegexInput = this._regexInput;
    if (!this._regexInput) {
      this._clearSearchResults();
      return;
    }
    try {
      var regex = new RegExp(this._regexInput);
    } catch (e) {
      // The regular expression is invalid.
      this._clearSearchResults();
      return;
    }
    const matchedNodes: any[] = [];
    const nodeMap = this.renderHierarchy.hierarchy.getNodeMap();
    _.each(nodeMap, (_, nodeName) => {
      if (matchedNodes.length >= this._maxRegexResults) {
        // Terminate.
        return false;
      }
      if (!regex.test(nodeName)) {
        return;
      }
      matchedNodes.push(nodeName);
    });
    this.set('_regexMatches', matchedNodes);
  }
  _matchClicked(e) {
    const node = e.model.item;
    this.set('selectedNode', node);
    tf_graph_util.notifyDebugEvent({
      actionId: tb_debug.GraphDebugEventId.NODE_SEARCH_RESULT_FOCUSED,
    });
  }
}
