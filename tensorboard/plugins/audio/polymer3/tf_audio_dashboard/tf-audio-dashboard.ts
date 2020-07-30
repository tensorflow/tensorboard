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
import { DO_NOT_SUBMIT } from "../tf-imports/polymer.html";
import { DO_NOT_SUBMIT } from "../tf-backend/tf-backend.html";
import { DO_NOT_SUBMIT } from "../tf-categorization-utils/tf-categorization-utils.html";
import { DO_NOT_SUBMIT } from "../tf-categorization-utils/tf-tag-filterer.html";
import { DO_NOT_SUBMIT } from "../tf-dashboard-common/dashboard-style.html";
import { DO_NOT_SUBMIT } from "../tf-dashboard-common/tf-dashboard-layout.html";
import { DO_NOT_SUBMIT } from "../tf-paginated-view/tf-category-paginated-view.html";
import { DO_NOT_SUBMIT } from "../tf-runs-selector/tf-runs-selector.html";
import { DO_NOT_SUBMIT } from "../tf-tensorboard/registry.html";
import { DO_NOT_SUBMIT } from "tf-audio-loader.html";
import { DO_NOT_SUBMIT } from "../tf-imports/polymer.html";
import { DO_NOT_SUBMIT } from "../tf-backend/tf-backend.html";
import { DO_NOT_SUBMIT } from "../tf-categorization-utils/tf-categorization-utils.html";
import { DO_NOT_SUBMIT } from "../tf-categorization-utils/tf-tag-filterer.html";
import { DO_NOT_SUBMIT } from "../tf-dashboard-common/dashboard-style.html";
import { DO_NOT_SUBMIT } from "../tf-dashboard-common/tf-dashboard-layout.html";
import { DO_NOT_SUBMIT } from "../tf-paginated-view/tf-category-paginated-view.html";
import { DO_NOT_SUBMIT } from "../tf-runs-selector/tf-runs-selector.html";
import { DO_NOT_SUBMIT } from "../tf-tensorboard/registry.html";
import { DO_NOT_SUBMIT } from "tf-audio-loader.html";
@customElement("tf-audio-dashboard")
class TfAudioDashboard extends PolymerElement {
    static readonly template = html `<tf-dashboard-layout>
      <div class="sidebar" slot="sidebar">
        <div class="sidebar-section runs-selector">
          <tf-runs-selector id="runs-selector" selected-runs="{{_selectedRuns}}"></tf-runs-selector>
        </div>
      </div>
      <div class="center" slot="center">
        <template is="dom-if" if="[[_dataNotFound]]">
          <div class="no-data-warning">
            <h3>No audio data was found.</h3>
            <p>Probable causes:</p>
            <ul>
              <li>You haven\u2019t written any audio data to your event files.</li>
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
                <tf-audio-loader active="[[active]]" run="[[item.run]]" tag="[[item.tag]]" sample="[[item.sample]]" total-samples="[[item.totalSamples]]" tag-metadata="[[_tagMetadata(_runToTagInfo, item.run, item.tag)]]" request-manager="[[_requestManager]]"></tf-audio-loader>
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
    @property({ type: Array })
    _selectedRuns: unknown[];
    @property({ type: Object })
    _runToTagInfo: object;
    @property({ type: Boolean })
    _dataNotFound: boolean;
    @property({
        type: String
    })
    _tagFilter: string = '';
    @property({
        type: Object
    })
    _requestManager: object = () => new tf_backend.RequestManager();
    ready() {
        if (this.reloadOnReady)
            this.reload();
    }
    reload() {
        this._fetchTags().then(() => {
            this._reloadAudio();
        });
    }
    _fetchTags() {
        const url = tf_backend.getRouter().pluginRoute('audio', '/tags');
        return this._requestManager.request(url).then((runToTagInfo) => {
            if (_.isEqual(runToTagInfo, this._runToTagInfo)) {
                // No need to update anything if there are no changes.
                return;
            }
            const runToTag = _.mapValues(runToTagInfo, (x) => Object.keys(x));
            const tags = tf_backend.getTags(runToTag);
            this.set('_dataNotFound', tags.length === 0);
            this.set('_runToTagInfo', runToTagInfo);
        });
    }
    _reloadAudio() {
        this.root.querySelectorAll('tf-audio-loader').forEach((audio) => {
            audio.reload();
        });
    }
    _shouldOpen(index) {
        return index <= 2;
    }
    @computed("_runToTagInfo", "_selectedRuns", "_tagFilter")
    get _categories(): unknown[] {
        var runToTagInfo = this._runToTagInfo;
        var selectedRuns = this._selectedRuns;
        var tagFilter = this._tagFilter;
        const runToTag = _.mapValues(runToTagInfo, (x) => Object.keys(x));
        const baseCategories = tf_categorization_utils.categorizeRunTagCombinations(runToTag, selectedRuns, tagFilter);
        function explodeItem(item) {
            const samples = runToTagInfo[item.run][item.tag].samples;
            return _.range(samples).map((i) => Object.assign({}, item, {
                sample: i,
                totalSamples: samples,
            }));
        }
        const withSamples = baseCategories.map((category) => Object.assign({}, category, {
            items: [].concat.apply([], category.items.map(explodeItem)),
        }));
        return withSamples;
    }
    _tagMetadata(runToTagInfo, run, tag) {
        return runToTagInfo[run][tag];
    }
}
