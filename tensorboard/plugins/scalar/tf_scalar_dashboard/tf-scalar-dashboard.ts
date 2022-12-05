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
import {html} from '@polymer/polymer';
import * as _ from 'lodash';
import '../../../components/polymer/irons_and_papers';
import {LegacyElementMixin} from '../../../components/polymer/legacy_element_mixin';
import {getTags} from '../../../components/tf_backend/backend';
import {RequestManager} from '../../../components/tf_backend/requestManager';
import {getRouter} from '../../../components/tf_backend/router';
import * as tf_categorization_utils from '../../../components/tf_categorization_utils/categorizationUtils';
import '../../../components/tf_categorization_utils/tf-tag-filterer';
import {ArrayUpdateHelper} from '../../../components/tf_dashboard_common/array-update-helper';
import '../../../components/tf_dashboard_common/dashboard-style';
import '../../../components/tf_dashboard_common/tf-dashboard-layout';
import '../../../components/tf_dashboard_common/tf-option-selector';
import '../../../components/tf_paginated_view/tf-category-paginated-view';
import '../../../components/tf_runs_selector/tf-runs-selector';
import * as tf_storage from '../../../components/tf_storage/storage';
import * as tf_utils from '../../../components/tf_utils/utils';
import * as vz_chart_helpers from '../../../components/vz_chart_helpers/vz-chart-helpers';
import {FeatureFlags} from '../../../webapp/feature_flag/types';
import './tf-scalar-card';
import {TfScalarCard} from './tf-scalar-card';
import './tf-smoothing-input';

/**
 * A frontend that displays a set of tf-scalar-charts, each of which
 * represents the time series for a particular tag. This dashboard
 * provides a categorizer, run selector, and abcissa selector, by which
 * the user can customize how data is organized and displayed.
 */
@customElement('tf-scalar-dashboard')
// tslint:disable-next-line:no-unused-variable
class TfScalarDashboard extends LegacyElementMixin(ArrayUpdateHelper) {
  static readonly template = html`
    <tf-dashboard-layout>
      <div class="sidebar" slot="sidebar">
        <div class="settings">
          <div class="sidebar-section">
            <div class="line-item">
              <paper-checkbox
                id="show-download-links"
                checked="{{_showDownloadLinks}}"
                >Show data download links</paper-checkbox
              >
            </div>
            <div class="line-item">
              <paper-checkbox
                id="ignore-y-outlier"
                checked="{{_ignoreYOutliers}}"
                >Ignore outliers in chart scaling</paper-checkbox
              >
            </div>
            <div id="tooltip-sorting">
              <div>Tooltip sorting method:</div>
              <paper-dropdown-menu
                no-label-float
                selected-item-label="{{_tooltipSortingMethod}}"
              >
                <paper-listbox
                  class="dropdown-content"
                  selected="0"
                  slot="dropdown-content"
                >
                  <paper-item>default</paper-item>
                  <paper-item>descending</paper-item>
                  <paper-item>ascending</paper-item>
                  <paper-item>nearest</paper-item>
                </paper-listbox>
              </paper-dropdown-menu>
            </div>
          </div>
          <div class="sidebar-section">
            <tf-smoothing-input
              weight="{{_smoothingWeight}}"
              step="0.001"
              min="0"
              max="0.999"
            ></tf-smoothing-input>
          </div>
          <div class="sidebar-section">
            <tf-option-selector
              id="x-type-selector"
              name="Horizontal Axis"
              selected-id="{{_xType}}"
            >
              <paper-button id="step">step</paper-button
              ><!--
            --><paper-button id="relative">relative</paper-button
              ><!--
            --><paper-button id="wall_time">wall</paper-button>
            </tf-option-selector>
          </div>
        </div>
        <div class="sidebar-section runs-selector">
          <tf-runs-selector selected-runs="{{_selectedRuns}}">
          </tf-runs-selector>
        </div>
      </div>
      <div class="center" slot="center">
        <template is="dom-if" if="[[_dataNotFound]]">
          <div class="no-data-warning">
            <h3>No scalar data was found.</h3>
            <p>Probable causes:</p>
            <ul>
              <li>You haven’t written any scalar data to your event files.</li>
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
                <tf-scalar-card
                  active="[[active]]"
                  data-to-load="[[item.series]]"
                  ignore-y-outliers="[[_ignoreYOutliers]]"
                  multi-experiments="[[_getMultiExperiments(dataSelection)]]"
                  request-manager="[[_requestManager]]"
                  show-download-links="[[_showDownloadLinks]]"
                  smoothing-enabled="[[_smoothingEnabled]]"
                  smoothing-weight="[[_smoothingWeight]]"
                  tag-metadata="[[_tagMetadata(category, _runToTagInfo, item)]]"
                  tag="[[item.tag]]"
                  tooltip-sorting-method="[[_tooltipSortingMethod]]"
                  x-type="[[_xType]]"
                  batch-size="[[featureFlags.scalarsBatchSize]]"
                  in-colab="[[featureFlags.inColab]]"
                ></tf-scalar-card>
              </template>
            </tf-category-paginated-view>
          </template>
        </template>
      </div>
    </tf-dashboard-layout>

    <style include="dashboard-style"></style>
    <style>
      #tooltip-sorting {
        align-items: center;
        display: flex;
        font-size: 14px;
        margin-top: 15px;
      }

      #tooltip-sorting paper-dropdown-menu {
        margin-left: 10px;
        --paper-input-container-focus-color: var(--tb-orange-strong);
        width: 105px;
      }

      .line-item {
        display: block;
        padding-top: 5px;
      }
      .no-data-warning {
        max-width: 540px;
        margin: 80px auto 0 auto;
      }
      .center {
        overflow-x: hidden;
      }
    </style>
  `;

  @property({type: Boolean})
  reloadOnReady: boolean = true;

  @property({type: Object})
  featureFlags?: FeatureFlags;

  @property({
    type: Boolean,
    notify: true,
    observer: '_showDownloadLinksObserver',
  })
  _showDownloadLinks: boolean = tf_storage
    .getBooleanInitializer('_showDownloadLinks', {
      defaultValue: false,
      useLocalStorage: true,
    })
    .call(this);

  @property({
    type: Number,
    notify: true,
    observer: '_smoothingWeightObserver',
  })
  _smoothingWeight: number = tf_storage
    .getNumberInitializer('_smoothingWeight', {
      defaultValue: 0.6,
    })
    .call(this);

  @property({
    type: Boolean,
    observer: '_ignoreYOutliersObserver',
  })
  _ignoreYOutliers: boolean = tf_storage
    .getBooleanInitializer('_ignoreYOutliers', {
      defaultValue: true,
      useLocalStorage: true,
    })
    .call(this);

  @property({type: String})
  _xType: string = vz_chart_helpers.XType.STEP;

  @property({type: Array})
  _selectedRuns: string[] = [];

  @property({type: Object})
  _runToTagInfo: object;

  @property({type: Boolean})
  _dataNotFound: boolean;

  @property({type: String})
  _tagFilter: string = '';

  // Categories must only be computed after _dataNotFound is found to be
  // true and then polymer DOM templating responds to that finding. We
  // thus use this property to guard when categories are computed.
  @property({type: Boolean})
  _categoriesDomReady: boolean;

  @property({type: Array})
  _categories: string[] = [];

  // Items show multiple runs, so exclude runs from category item keys for
  // efficient template reuse.
  @property({type: Object})
  _getCategoryItemKey: object = (item) => item.tag;

  @property({type: Object})
  _requestManager: RequestManager = new RequestManager(50);

  _showDownloadLinksObserver = tf_storage.getBooleanObserver(
    '_showDownloadLinks',
    {defaultValue: false, useLocalStorage: true}
  );

  _smoothingWeightObserver = tf_storage.getNumberObserver('_smoothingWeight', {
    defaultValue: 0.6,
  });

  _ignoreYOutliersObserver = tf_storage.getBooleanObserver('_ignoreYOutliers', {
    defaultValue: true,
    useLocalStorage: true,
  });

  @computed('_smoothingWeight')
  get _smoothingEnabled(): boolean {
    var _smoothingWeight = this._smoothingWeight;
    return _smoothingWeight > 0;
  }

  _getCategoryKey(category) {
    return category.metadata.type ==
      tf_categorization_utils.CategoryType.SEARCH_RESULTS
      ? ''
      : category.name;
  }

  _shouldOpen(index) {
    return index <= 2;
  }

  ready() {
    super.ready();
    if (this.reloadOnReady) this.reload();
  }

  reload() {
    this._fetchTags().then(() => {
      this._reloadCharts();
    });
  }

  _fetchTags() {
    const url = getRouter().pluginRoute('scalars', '/tags');
    return this._requestManager.request(url).then((runToTagInfo) => {
      if (_.isEqual(runToTagInfo, this._runToTagInfo)) {
        // No need to update anything if there are no changes.
        return;
      }
      const runToTag = _.mapValues(runToTagInfo, (x) => Object.keys(x));
      const tags = getTags(runToTag);
      this.set('_dataNotFound', tags.length === 0);
      this.set('_runToTagInfo', runToTagInfo);
      this.async(() => {
        // See the comment above `_categoriesDomReady`.
        this.set('_categoriesDomReady', true);
      });
    });
  }

  _reloadCharts() {
    this.root?.querySelectorAll('tf-scalar-card').forEach((chart) => {
      (chart as TfScalarCard).reload();
    });
  }

  @observe(
    '_runToTagInfo',
    '_selectedRuns',
    '_tagFilter',
    '_categoriesDomReady'
  )
  _updateCategories() {
    var runToTagInfo = this._runToTagInfo;
    var selectedRuns = this._selectedRuns;
    var tagFilter = this._tagFilter;
    let categories;
    let query = tagFilter;
    const runToTag = _.mapValues(runToTagInfo, (x) => Object.keys(x));
    categories = tf_categorization_utils.categorizeTags(
      runToTag as tf_categorization_utils.RunToTag,
      selectedRuns,
      query
    );
    categories.forEach((category) => {
      category.items = category.items.map((item) => ({
        tag: item.tag,
        series: item.runs.map((run) => ({run, tag: item.tag})),
      }));
    });
    this.updateArrayProp('_categories', categories, this._getCategoryKey);
  }

  _tagMetadata(category, runToTagsInfo, item) {
    const categoryName = category.name as string;
    const tag = item.tag;
    const runToTagInfo = {};
    item.series.forEach(({run}) => {
      runToTagInfo[run] = runToTagsInfo[run][tag];
    });
    // All new-style scalar tags include the `/scalar_summary`
    // suffix. We can trim that from the display name.
    const defaultDisplayName = tag.replace(/\/scalar_summary$/, '');
    let {description, displayName} = tf_utils.aggregateTagInfo(
      runToTagInfo,
      defaultDisplayName
    );
    // If category name is a prefix group, strip the prefix from the name
    // of the scalar-card if name != prefix.
    if (
      category.metadata.type ==
        tf_categorization_utils.CategoryType.PREFIX_GROUP &&
      displayName.startsWith(categoryName + '/')
    ) {
      // + 1 to strip off the separator.
      displayName = displayName.slice(categoryName.length + 1);
    }
    return {description, displayName};
  }
}
