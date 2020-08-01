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
import "@polymer/iron-icon";
import "@polymer/paper-button";
import "@polymer/paper-input";
import { DO_NOT_SUBMIT } from "../tf-imports/polymer.html";
import { DO_NOT_SUBMIT } from "../tf-backend/tf-backend.html";
import { DO_NOT_SUBMIT } from "../tf-categorization-utils/tf-categorization-utils.html";
import { DO_NOT_SUBMIT } from "../tf-categorization-utils/tf-tag-filterer.html";
import { DO_NOT_SUBMIT } from "../tf-dashboard-common/dashboard-style.html";
import { DO_NOT_SUBMIT } from "../tf-dashboard-common/tf-dashboard-layout.html";
import { DO_NOT_SUBMIT } from "../tf-dashboard-common/tf-option-selector.html";
import { DO_NOT_SUBMIT } from "../tf-paginated-view/tf-category-paginated-view.html";
import { DO_NOT_SUBMIT } from "../tf-runs-selector/tf-runs-selector.html";
import { DO_NOT_SUBMIT } from "../tf-tensorboard/registry.html";
import { DO_NOT_SUBMIT } from "tf-histogram-loader.html";
import "@polymer/iron-icon";
import "@polymer/paper-button";
import "@polymer/paper-input";
import { DO_NOT_SUBMIT } from "../tf-imports/polymer.html";
import { DO_NOT_SUBMIT } from "../tf-backend/tf-backend.html";
import { DO_NOT_SUBMIT } from "../tf-categorization-utils/tf-categorization-utils.html";
import { DO_NOT_SUBMIT } from "../tf-categorization-utils/tf-tag-filterer.html";
import { DO_NOT_SUBMIT } from "../tf-dashboard-common/dashboard-style.html";
import { DO_NOT_SUBMIT } from "../tf-dashboard-common/tf-dashboard-layout.html";
import { DO_NOT_SUBMIT } from "../tf-dashboard-common/tf-option-selector.html";
import { DO_NOT_SUBMIT } from "../tf-paginated-view/tf-category-paginated-view.html";
import { DO_NOT_SUBMIT } from "../tf-runs-selector/tf-runs-selector.html";
import { DO_NOT_SUBMIT } from "../tf-tensorboard/registry.html";
import { DO_NOT_SUBMIT } from "tf-histogram-loader.html";
'use strict';
@customElement("tf-histogram-dashboard")
class TfHistogramDashboard extends PolymerElement {
    static readonly template = html `<tf-dashboard-layout>
      <div slot="sidebar">
        <div class="settings">
          <div class="sidebar-section">
            <tf-option-selector id="histogramModeSelector" name="Histogram mode" selected-id="{{_histogramMode}}">
              <paper-button id="overlay">overlay</paper-button>
              <paper-button id="offset">offset</paper-button>
            </tf-option-selector>
          </div>
          <div class="sidebar-section">
            <tf-option-selector id="timePropertySelector" name="Offset time axis" selected-id="{{_timeProperty}}">
              <paper-button id="step">step</paper-button>
              <paper-button id="relative">relative</paper-button>
              <paper-button id="wall_time">wall</paper-button>
            </tf-option-selector>
          </div>
        </div>
        <div class="sidebar-section runs-selector">
          <tf-runs-selector selected-runs="{{_selectedRuns}}">
          </tf-runs-selector>
        </div>
      </div>
      <div slot="center">
        <template is="dom-if" if="[[_dataNotFound]]">
          <div class="no-data-warning">
            <h3>No histogram data was found.</h3>
            <p>Probable causes:</p>
            <ul>
              <li>
                You haven\u2019t written any histogram data to your event files.
              </li>
              <li>TensorBoard can\u2019t find your event files.</li>
            </ul>

            <p>
              If you\u2019re new to using TensorBoard, and want to find out how to
              add data and set up your event files, check out the
              <a href="https://github.com/tensorflow/tensorboard/blob/master/README.md">README</a>
              and perhaps the
              <a href="https://www.tensorflow.org/get_started/summaries_and_tensorboard">TensorBoard tutorial</a>.
            </p>

            <p>
              If you think TensorBoard is configured properly, please see
              <a href="https://github.com/tensorflow/tensorboard/blob/master/README.md#my-tensorboard-isnt-showing-any-data-whats-wrong">the section of the README devoted to missing data problems</a>
              and consider filing an issue on GitHub.
            </p>
          </div>
        </template>
        <template is="dom-if" if="[[!_dataNotFound]]">
          <tf-tag-filterer tag-filter="{{_tagFilter}}"></tf-tag-filterer>
          <template is="dom-repeat" items="[[_categories]]" as="category">
            <tf-category-paginated-view category="[[category]]" initial-opened="[[_shouldOpen(index)]]">
              <template>
                <tf-histogram-loader run="[[item.run]]" tag="[[item.tag]]" active="[[active]]" tag-metadata="[[_tagMetadata(_runToTagInfo, item.run, item.tag)]]" time-property="[[_timeProperty]]" histogram-mode="[[_histogramMode]]" request-manager="[[_requestManager]]"></tf-histogram-loader>
              </template>
            </tf-category-paginated-view>
          </template>
        </template>
      </div>
    </tf-dashboard-layout>

    <style include="dashboard-style"></style>
    <style>
      .no-data-warning {
        max-width: 540px;
        margin: 80px auto 0 auto;
      }
    </style>`;
    @property({
        type: Boolean
    })
    reloadOnReady: boolean = true;
    @property({
        type: String
    })
    _histogramMode: string = 'offset';
    @property({
        type: String
    })
    _timeProperty: string = 'step';
    @property({ type: Array })
    _selectedRuns: unknown[];
    @property({ type: Object })
    _runToTag: object;
    @property({ type: Object })
    _runToTagInfo: object;
    @property({ type: Boolean })
    _dataNotFound: boolean;
    @property({ type: String })
    _tagFilter: string;
    @property({
        type: Boolean
    })
    _restamp: boolean = false;
    @property({ type: Boolean })
    _categoriesDomReady: boolean;
    @property({
        type: Object
    })
    _requestManager: object = () => new tf_backend.RequestManager();
    _redrawCategoryPane(event, val) {
        if (!val)
            return;
        event.target
            .querySelectorAll('tf-histogram-loader')
            .forEach((histogram) => histogram.redraw());
    }
    ready() {
        if (this.reloadOnReady)
            this.reload();
    }
    reload() {
        this._fetchTags().then(() => {
            this._reloadHistograms();
        });
    }
    _fetchTags() {
        const url = tf_backend.getRouter().pluginRoute('histograms', '/tags');
        return this._requestManager.request(url).then((runToTagInfo) => {
            if (_.isEqual(runToTagInfo, this._runToTagInfo)) {
                // No need to update anything if there are no changes.
                return;
            }
            const runToTag = _.mapValues(runToTagInfo, (x) => Object.keys(x));
            const tags = tf_backend.getTags(runToTag);
            this.set('_dataNotFound', tags.length === 0);
            this.set('_runToTag', runToTag);
            this.set('_runToTagInfo', runToTagInfo);
            this.async(() => {
                // See the comment above `_categoriesDomReady`.
                this.set('_categoriesDomReady', true);
            });
        });
    }
    _reloadHistograms() {
        this.root
            .querySelectorAll('tf-histogram-loader')
            .forEach((histogram) => {
            histogram.reload();
        });
    }
    _shouldOpen(index) {
        return index <= 2;
    }
    @computed("_runToTag", "_selectedRuns", "_tagFilter", "_categoriesDomReady")
    get _categories(): unknown[] {
        var runToTag = this._runToTag;
        var selectedRuns = this._selectedRuns;
        var tagFilter = this._tagFilter;
        var categoriesDomReady = this._categoriesDomReady;
        return tf_categorization_utils.categorizeRunTagCombinations(runToTag, selectedRuns, tagFilter);
    }
    _tagMetadata(runToTagInfo, run, tag) {
        return runToTagInfo[run][tag];
    }
}
