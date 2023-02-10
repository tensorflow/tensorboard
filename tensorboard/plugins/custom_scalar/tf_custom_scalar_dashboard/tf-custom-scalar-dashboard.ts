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
import {Canceller} from '../../../components/tf_backend/canceller';
import {RequestManager} from '../../../components/tf_backend/requestManager';
import {getRouter} from '../../../components/tf_backend/router';
import {
  Category,
  CategoryType,
} from '../../../components/tf_categorization_utils/categorizationUtils';
import '../../../components/tf_dashboard_common/dashboard-style';
import '../../../components/tf_dashboard_common/tf-dashboard-layout';
import '../../../components/tf_dashboard_common/tf-option-selector';
import '../../../components/tf_paginated_view/tf-category-paginated-view';
import '../../../components/tf_runs_selector/tf-runs-selector';
import {
  getBooleanInitializer,
  getBooleanObserver,
  getNumberInitializer,
  getNumberObserver,
} from '../../../components/tf_storage/storage';
import '../../../components/tf_utils/utils';
import '../../scalar/tf_scalar_dashboard/tf-smoothing-input';
import {Layout} from './tf-custom-scalar-helpers';
import './tf-custom-scalar-margin-chart-card';
import {TfCustomScalarMarginChartCard} from './tf-custom-scalar-margin-chart-card';
import './tf-custom-scalar-multi-line-chart-card';
import {TfCustomScalarMultiLineChartCard} from './tf-custom-scalar-multi-line-chart-card';

@customElement('tf-custom-scalar-dashboard')
class TfCustomScalarDashboard extends PolymerElement {
  static readonly template = html`
    <tf-dashboard-layout>
      <div class="sidebar" slot="sidebar">
        <div class="settings">
          <div class="sidebar-section">
            <div class="line-item">
              <paper-checkbox checked="{{_showDownloadLinks}}"
                >Show data download links</paper-checkbox
              >
            </div>
            <div class="line-item">
              <paper-checkbox checked="{{_ignoreYOutliers}}"
                >Ignore outliers in chart scaling</paper-checkbox
              >
            </div>
            <div id="tooltip-sorting">
              <div id="tooltip-sorting-label">Tooltip sorting method:</div>
              <paper-dropdown-menu
                no-label-float=""
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
              max="1"
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
      <div class="center" slot="center" id="categories-container">
        <template is="dom-if" if="[[_dataNotFound]]">
          <div class="no-data-warning">
            <h3>The custom scalars dashboard is inactive.</h3>
            <p>Probable causes:</p>
            <ol>
              <li>You haven't laid out the dashboard.</li>
              <li>You haven’t written any scalar data to your event files.</li>
            </ol>

            <p>
              To lay out the dashboard, pass a <code>Layout</code> protobuffer
              to the <code>set_layout</code> method. For example,
            </p>
            <pre>
from tensorboard import summary
from tensorboard.plugins.custom_scalar import layout_pb2
...
# This action does not have to be performed at every step, so the action is not
# taken care of by an op in the graph. We only need to specify the layout once
# (instead of per step).
layout_summary = summary_lib.custom_scalar_pb(layout_pb2.Layout(
  category=[
    layout_pb2.Category(
      title='losses',
      chart=[
          layout_pb2.Chart(
              title='losses',
              multiline=layout_pb2.MultilineChartContent(
                tag=[r'loss.*'],
              )),
          layout_pb2.Chart(
              title='baz',
              margin=layout_pb2.MarginChartContent(
                series=[
                  layout_pb2.MarginChartContent.Series(
                    value='loss/baz/scalar_summary',
                    lower='baz_lower/baz/scalar_summary',
                    upper='baz_upper/baz/scalar_summary'),
                ],
              )),
      ]),
    layout_pb2.Category(
      title='trig functions',
      chart=[
          layout_pb2.Chart(
              title='wave trig functions',
              multiline=layout_pb2.MultilineChartContent(
                tag=[r'trigFunctions/cosine', r'trigFunctions/sine'],
              )),
          # The range of tangent is different. Let's give it its own chart.
          layout_pb2.Chart(
              title='tan',
              multiline=layout_pb2.MultilineChartContent(
                tag=[r'trigFunctions/tangent'],
              )),
      ],
      # This category we care less about. Let's make it initially closed.
      closed=True),
  ]))
writer.add_summary(layout_summary)
</pre
            >
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
          </div>
        </template>
        <template is="dom-if" if="[[!_dataNotFound]]">
          <template is="dom-repeat" items="[[_categories]]" as="category">
            <tf-category-paginated-view
              as="chart"
              category="[[category]]"
              disable-pagination
              initial-opened="[[category.metadata.opened]]"
            >
              <template>
                <template is="dom-if" if="[[chart.multiline]]">
                  <tf-custom-scalar-multi-line-chart-card
                    active="[[active]]"
                    request-manager="[[_requestManager]]"
                    runs="[[_selectedRuns]]"
                    title="[[chart.title]]"
                    x-type="[[_xType]]"
                    smoothing-enabled="[[_smoothingEnabled]]"
                    smoothing-weight="[[_smoothingWeight]]"
                    tooltip-sorting-method="[[tooltipSortingMethod]]"
                    ignore-y-outliers="[[_ignoreYOutliers]]"
                    show-download-links="[[_showDownloadLinks]]"
                    tag-regexes="[[chart.multiline.tag]]"
                  ></tf-custom-scalar-multi-line-chart-card>
                </template>
                <template is="dom-if" if="[[chart.margin]]">
                  <tf-custom-scalar-margin-chart-card
                    active="[[active]]"
                    request-manager="[[_requestManager]]"
                    runs="[[_selectedRuns]]"
                    title="[[chart.title]]"
                    x-type="[[_xType]]"
                    tooltip-sorting-method="[[tooltipSortingMethod]]"
                    ignore-y-outliers="[[_ignoreYOutliers]]"
                    show-download-links="[[_showDownloadLinks]]"
                    margin-chart-series="[[chart.margin.series]]"
                  ></tf-custom-scalar-margin-chart-card>
                </template>
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
    </style>
  `;

  @property({type: Object})
  _requestManager: RequestManager = new RequestManager(50);

  @property({type: Object})
  _canceller: Canceller = new Canceller();

  @property({type: Array})
  _selectedRuns: unknown[];

  @property({
    type: Boolean,
    notify: true,
    observer: '_showDownloadLinksObserver',
  })
  _showDownloadLinks: boolean = getBooleanInitializer('_showDownloadLinks', {
    defaultValue: false,
    useLocalStorage: true,
  }).call(this);

  @property({
    type: Number,
    notify: true,
    observer: '_smoothingWeightObserver',
  })
  _smoothingWeight: number = getNumberInitializer('_smoothingWeight', {
    defaultValue: 0.6,
  }).call(this);

  @property({
    type: Boolean,
    observer: '_ignoreYOutliersObserver',
  })
  _ignoreYOutliers: boolean = getBooleanInitializer('_ignoreYOutliers', {
    defaultValue: true,
    useLocalStorage: true,
  }).call(this);

  @property({type: String})
  _xType: string = 'step';

  @property({type: Object})
  _layout: Layout;

  @property({type: Boolean})
  _dataNotFound: boolean;

  @property({type: Object})
  _openedCategories: object;

  @property({type: Boolean})
  _active: boolean = true;

  @property({type: Boolean})
  reloadOnReady: boolean = true;

  ready() {
    super.ready();
    if (this.reloadOnReady) this.reload();
  }

  reload() {
    const url = getRouter().pluginsListing();
    const handlePluginsListingResponse = this._canceller.cancellable<
      string,
      void
    >((result) => {
      if (result.cancelled) {
        return;
      }
      this.set('_dataNotFound', !result.value['custom_scalars']);
      if (this._dataNotFound) {
        return;
      }
      this._retrieveLayoutAndData();
    });
    this._requestManager.request(url).then(handlePluginsListingResponse);
  }

  _reloadCharts() {
    const charts = this.root?.querySelectorAll(
      'tf-custom-scalar-margin-chart-card, ' +
        'tf-custom-scalar-multi-line-chart-card'
    );
    charts?.forEach(
      (
        chart: TfCustomScalarMarginChartCard | TfCustomScalarMultiLineChartCard
      ) => {
        chart.reload();
      }
    );
  }

  _retrieveLayoutAndData() {
    const url = getRouter().pluginRoute('custom_scalars', '/layout');
    const update = this._canceller.cancellable((result) => {
      if (result.cancelled) {
        return;
      }
      // This plugin is only active if data is available.
      this.set('_layout', result.value);
      if (!this._dataNotFound) {
        this._reloadCharts();
      }
    });
    this._requestManager.request(url).then(update);
  }

  _showDownloadLinksObserver = getBooleanObserver('_showDownloadLinks', {
    defaultValue: false,
    useLocalStorage: true,
  });

  _smoothingWeightObserver = getNumberObserver('_smoothingWeight', {
    defaultValue: 0.6,
  });

  _ignoreYOutliersObserver = getBooleanObserver('_ignoreYOutliers', {
    defaultValue: true,
    useLocalStorage: true,
  });

  @computed('_smoothingWeight')
  get _smoothingEnabled(): boolean {
    var _smoothingWeight = this._smoothingWeight;
    return _smoothingWeight > 0;
  }

  @computed('_layout')
  get _categories(): Category<unknown>[] {
    var layout = this._layout;
    if (!layout.category) {
      return [];
    }
    let firstTimeLoad = false;
    if (!this._openedCategories) {
      // This is the first time the user loads the categories. Start storing
      // which categories are open.
      firstTimeLoad = true;
      this._openedCategories = {};
    }
    const categories = layout.category.map((category) => {
      if (firstTimeLoad && !(category as any) /* ??? */.closed) {
        // Remember whether this category is currently open.
        this._openedCategories[category.title] = true;
      }
      return {
        name: category.title,
        items: category.chart,
        metadata: {
          type: CategoryType.PREFIX_GROUP,
          opened: !!this._openedCategories[category.title],
        },
      };
    });
    return categories;
  }

  _categoryOpenedToggled(event) {
    const pane = event.target;
    if (pane.opened) {
      this._openedCategories[pane.category.name] = true;
    } else {
      delete this._openedCategories[pane.category.name];
    }
  }
}
