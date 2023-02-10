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

import {computed, customElement, property} from '@polymer/decorators';
import {html, PolymerElement} from '@polymer/polymer';
import * as _ from 'lodash';
import '../../../components/polymer/irons_and_papers';
import {LegacyElementMixin} from '../../../components/polymer/legacy_element_mixin';
import {getTags} from '../../../components/tf_backend/backend';
import {RequestManager} from '../../../components/tf_backend/requestManager';
import {getRouter} from '../../../components/tf_backend/router';
import * as tf_categorization_utils from '../../../components/tf_categorization_utils/categorizationUtils';
import '../../../components/tf_categorization_utils/tf-tag-filterer';
import '../../../components/tf_dashboard_common/dashboard-style';
import '../../../components/tf_dashboard_common/tf-dashboard-layout';
import '../../../components/tf_dashboard_common/tf-option-selector';
import '../../../components/tf_paginated_view/tf-category-paginated-view';
import '../../../components/tf_runs_selector/tf-runs-selector';
import * as tf_utils from '../../../components/tf_utils/utils';
import './tf-pr-curve-card';
import {TfPrCurveCard} from './tf-pr-curve-card';
import './tf-pr-curve-steps-selector';

@customElement('tf-pr-curve-dashboard')
// tslint:disable-next-line:no-unused-variable
class TfPrCurveDashboard extends LegacyElementMixin(PolymerElement) {
  static readonly template = html`
    <tf-dashboard-layout>
      <div class="sidebar" slot="sidebar">
        <div class="settings">
          <div class="sidebar-section">
            <tf-option-selector
              id="time-type-selector"
              name="Time Display Type"
              selected-id="{{_timeDisplayType}}"
            >
              <paper-button id="step">step</paper-button>
              <!--
            -->
              <paper-button id="relative">relative</paper-button>
              <!--
            -->
              <paper-button id="wall_time">wall</paper-button>
            </tf-option-selector>
          </div>
          <template is="dom-if" if="[[_runToAvailableTimeEntries]]">
            <div class="sidebar-section" id="steps-selector-container">
              <tf-pr-curve-steps-selector
                runs="[[_relevantSelectedRuns]]"
                run-to-step="{{_runToStep}}"
                run-to-available-time-entries="[[_runToAvailableTimeEntries]]"
                time-display-type="[[_timeDisplayType]]"
              >
              </tf-pr-curve-steps-selector>
            </div>
          </template>
        </div>
        <div class="sidebar-section runs-selector">
          <tf-runs-selector selected-runs="{{_selectedRuns}}">
          </tf-runs-selector>
        </div>
      </div>
      <div class="center" slot="center">
        <template is="dom-if" if="[[_dataNotFound]]">
          <div class="no-data-warning">
            <h3>No precision–recall curve data was found.</h3>
            <p>Probable causes:</p>
            <ul>
              <li>
                You haven’t written any precision–recall data to your event
                files.
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
              get-category-item-key="[[_getCategoryItemKey]]"
            >
              <template>
                <tf-pr-curve-card
                  active="[[active]]"
                  runs="[[item.runs]]"
                  tag="[[item.tag]]"
                  tag-metadata="[[_tagMetadata(_runToTagInfo, item.runs, item.tag)]]"
                  request-manager="[[_requestManager]]"
                  run-to-step-cap="[[_runToStep]]"
                  on-data-change="[[_createDataChangeCallback(item.tag)]]"
                ></tf-pr-curve-card>
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

      /** Do not let the steps selector occlude the run selector. */
      #steps-selector-container {
        max-height: 60%;
        overflow-y: auto;
      }
    </style>
  `;

  @property({type: Boolean})
  reloadOnReady: boolean = true;

  @property({type: String})
  _timeDisplayType: string = 'step';

  @property({type: Array})
  _selectedRuns: string[] = [];

  @property({type: Object})
  _runToTagInfo: object = {};

  @property({type: Object})
  _tagToRunToData: object = {};

  @property({
    type: Object,
    notify: true,
  })
  _runToStep: object;

  @property({type: Boolean})
  _dataNotFound: boolean;

  @property({type: String})
  _tagFilter: string;

  @property({type: Boolean})
  _categoriesDomReady: boolean;

  @property({type: Object})
  _getCategoryItemKey: object = (item) => item.tag;

  @property({type: Object})
  _requestManager: RequestManager = new RequestManager();

  @property({
    type: Number,
    notify: true,
  })
  _step: number = 0;

  ready() {
    super.ready();
    if (this.reloadOnReady) this.reload();
  }

  reload() {
    Promise.all([this._fetchTags()]).then(() => {
      this._reloadCards();
    });
  }

  _shouldOpen(index) {
    return index <= 2;
  }

  _fetchTags() {
    const url = getRouter().pluginRoute('pr_curves', '/tags');
    return this._requestManager.request(url).then((runToTagInfo) => {
      if (_.isEqual(runToTagInfo, this._runToTagInfo)) {
        // No need to update anything if there are no changes.
        return;
      }
      const runToTag = _.mapValues(runToTagInfo, (o) => _.keys(o));
      const tags = getTags(runToTag);
      this.set('_dataNotFound', tags.length === 0);
      this.set('_runToTagInfo', runToTagInfo);
      this.async(() => {
        // See the comment above `_categoriesDomReady`.
        this.set('_categoriesDomReady', true);
      });
    });
  }

  _reloadCards() {
    _.forEach(this.root?.querySelectorAll('tf-pr-curve-card')!, (card) => {
      (card as TfPrCurveCard).reload();
    });
  }

  @computed(
    '_runToTagInfo',
    '_selectedRuns',
    '_tagFilter',
    '_categoriesDomReady'
  )
  get _categories(): tf_categorization_utils.TagCategory[] {
    var runToTagInfo = this._runToTagInfo;
    var selectedRuns = this._selectedRuns;
    var tagFilter = this._tagFilter;
    const runToTag = _.mapValues(runToTagInfo, (x) => Object.keys(x));
    return tf_categorization_utils.categorizeTags(
      runToTag as tf_categorization_utils.RunToTag,
      selectedRuns,
      tagFilter
    );
  }

  @computed('_selectedRuns', '_runToTagInfo')
  get _relevantSelectedRuns(): unknown[] {
    var selectedRuns = this._selectedRuns;
    var runToTagInfo = this._runToTagInfo;
    return selectedRuns.filter((run) => runToTagInfo[run]);
  }

  _tagMetadata(runToTagsInfo, runs, tag) {
    const runToTagInfo = {};
    runs.forEach((run) => {
      runToTagInfo[run] = runToTagsInfo[run][tag];
    });
    // All PR curve tags include the `/pr_curves` suffix. We can trim
    // that from the display name.
    const defaultDisplayName = tag.replace(/\/pr_curves$/, '');
    return tf_utils.aggregateTagInfo(runToTagInfo, defaultDisplayName);
  }

  _createDataChangeCallback(tag) {
    return (runToData) => {
      this.set('_tagToRunToData', {
        ...this._tagToRunToData,
        [tag]: runToData,
      });
    };
  }

  @computed('_tagToRunToData')
  get _runToAvailableTimeEntries(): object {
    var tagToRunToData = this._tagToRunToData;
    const canonicalTag = {}; // map from run to canonical tag name
    for (const [tag, runToData] of Object.entries(tagToRunToData)) {
      for (const [run] of Object.entries(runToData)) {
        // arbitrary stable ordering: smallest tag name is canonical
        if (canonicalTag[run] == null || tag < canonicalTag[run]) {
          canonicalTag[run] = tag;
        }
      }
    }
    const result = {};
    for (const [run, tag] of Object.entries(canonicalTag)) {
      const data = tagToRunToData[tag as string][run];
      result[run] = data.map((d) => ({
        step: d.step,
        wall_time: d.wall_time,
        relative: d.wall_time - data[0].wall_time,
      }));
    }
    return result;
  }
}
