/* Copyright 2016 The TensorFlow Authors. All Rights Reserved.

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

import {computed, customElement, property} from '@polymer/decorators';
import {html, PolymerElement} from '@polymer/polymer';
import * as _ from 'lodash';
import '../../../components/polymer/irons_and_papers';
import {LegacyElementMixin} from '../../../components/polymer/legacy_element_mixin';
import {getTags} from '../../../components/tf_backend/backend';
import {RequestManager} from '../../../components/tf_backend/requestManager';
import {getRouter} from '../../../components/tf_backend/router';
import {
  categorizeRunTagCombinations,
  RunTagCategory,
} from '../../../components/tf_categorization_utils/categorizationUtils';
import '../../../components/tf_categorization_utils/tf-tag-filterer';
import '../../../components/tf_dashboard_common/dashboard-style';
import '../../../components/tf_dashboard_common/tf-dashboard-layout';
import '../../../components/tf_dashboard_common/tf-option-selector';
import '../../../components/tf_paginated_view/tf-category-paginated-view';
import '../../../components/tf_runs_selector/tf-runs-selector';
import './tf-histogram-loader';
import {HistogramTagInfo, TfHistogramLoader} from './tf-histogram-loader';

@customElement('tf-histogram-dashboard')
class TfHistogramDashboard extends LegacyElementMixin(PolymerElement) {
  static readonly template = html`
    <tf-dashboard-layout>
      <div slot="sidebar">
        <div class="settings">
          <div class="sidebar-section">
            <tf-option-selector
              id="histogramModeSelector"
              name="Histogram mode"
              selected-id="{{_histogramMode}}"
            >
              <paper-button id="overlay">overlay</paper-button>
              <paper-button id="offset">offset</paper-button>
            </tf-option-selector>
          </div>
          <div class="sidebar-section">
            <tf-option-selector
              id="timePropertySelector"
              name="Offset time axis"
              selected-id="{{_timeProperty}}"
            >
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
                You haven’t written any histogram data to your event files.
              </li>
              <li>TensorBoard can’t find your event files.</li>
            </ul>

            <p>
              If you’re new to using TensorBoard, and want to find out how to
              add data and set up your event files, check out the
              <a
                href="https://github.com/tensorflow/tensorboard/blob/master/README.md"
                >README</a
              >
              and perhaps the
              <a
                href="https://www.tensorflow.org/get_started/summaries_and_tensorboard"
                >TensorBoard tutorial</a
              >.
            </p>

            <p>
              If you think TensorBoard is configured properly, please see
              <a
                href="https://github.com/tensorflow/tensorboard/blob/master/README.md#my-tensorboard-isnt-showing-any-data-whats-wrong"
                >the section of the README devoted to missing data problems</a
              >
              and consider filing an issue on GitHub.
            </p>
          </div>
        </template>
        <template is="dom-if" if="[[!_dataNotFound]]">
          <tf-tag-filterer tag-filter="{{_tagFilter}}"></tf-tag-filterer>
          <template is="dom-repeat" items="[[_categories]]" as="category">
            <tf-category-paginated-view
              category="[[category]]"
              initial-opened="[[_shouldOpen(index)]]"
            >
              <template>
                <tf-histogram-loader
                  run="[[item.run]]"
                  tag="[[item.tag]]"
                  active="[[active]]"
                  tag-metadata="[[_tagMetadata(_runToTagInfo, item.run, item.tag)]]"
                  time-property="[[_timeProperty]]"
                  histogram-mode="[[_histogramMode]]"
                  request-manager="[[_requestManager]]"
                ></tf-histogram-loader>
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
    </style>
  `;

  @property({type: Boolean})
  reloadOnReady: boolean = true;

  @property({type: String})
  _histogramMode: string = 'offset';

  @property({type: String})
  _timeProperty: string = 'step';

  @property({type: Array})
  _selectedRuns: string[];

  @property({type: Object})
  _runToTag: {[run: string]: string[]};

  @property({type: Object})
  _runToTagInfo: {[run: string]: HistogramTagInfo};

  @property({type: Boolean})
  _dataNotFound: boolean;

  @property({type: String})
  _tagFilter: string;

  @property({type: Boolean})
  _restamp: boolean = false;

  // Categories must only be computed after _dataNotFound is found to be
  // true and then polymer DOM templating responds to that finding. We
  // thus use this property to guard when categories are computed.
  @property({type: Boolean})
  _categoriesDomReady: boolean;

  @property({type: Object})
  _requestManager: RequestManager = new RequestManager();

  _redrawCategoryPane(event, val) {
    if (!val) return;
    event.target
      .querySelectorAll('tf-histogram-loader')
      .forEach((histogram) => histogram.redraw());
  }

  ready() {
    super.ready();
    if (this.reloadOnReady) this.reload();
  }

  reload() {
    this._fetchTags().then(() => {
      this._reloadHistograms();
    });
  }

  _fetchTags() {
    const url = getRouter().pluginRoute('histograms', '/tags');
    return this._requestManager.request(url).then((runToTagInfo) => {
      if (_.isEqual(runToTagInfo, this._runToTagInfo)) {
        // No need to update anything if there are no changes.
        return;
      }
      const runToTag = _.mapValues(runToTagInfo, (x) => Object.keys(x));
      const tags = getTags(runToTag);
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
    this.root?.querySelectorAll('tf-histogram-loader').forEach((histogram) => {
      (histogram as TfHistogramLoader).reload();
    });
  }

  _shouldOpen(index) {
    return index <= 2;
  }

  @computed('_runToTag', '_selectedRuns', '_tagFilter', '_categoriesDomReady')
  get _categories(): RunTagCategory[] {
    var runToTag = this._runToTag;
    var selectedRuns = this._selectedRuns;
    var tagFilter = this._tagFilter;
    var categoriesDomReady = this._categoriesDomReady;
    return categorizeRunTagCombinations(runToTag, selectedRuns, tagFilter);
  }

  _tagMetadata(runToTagInfo, run, tag) {
    return runToTagInfo[run][tag];
  }
}
