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
import {getTags} from '../../../components/tf_backend/backend';
import {RequestManager} from '../../../components/tf_backend/requestManager';
import {getRouter} from '../../../components/tf_backend/router';
import {
  categorizeRunTagCombinations,
  RunToTag,
} from '../../../components/tf_categorization_utils/categorizationUtils';
import '../../../components/tf_dashboard_common/dashboard-style';
import '../../../components/tf_dashboard_common/tf-dashboard-layout';
import '../../../components/tf_paginated_view/tf-category-paginated-view';
import '../../../components/tf_runs_selector/tf-runs-selector';
import './mesh-loader';
import {TfMeshLoader} from './mesh-loader';

@customElement('mesh-dashboard')
class MeshDashboard extends PolymerElement {
  static readonly template = html`
    <tf-dashboard-layout>
      <div slot="sidebar" class="all-controls">
        <div class="settings">
          <div class="sidebar-section view-control">
            <h3 class="title">Point of view</h3>
            <div>
              <paper-radio-group
                id="view-radio-group"
                selected="{{_selectedView}}"
              >
                <paper-radio-button id="all-radio-button" name="all">
                  Display all points
                </paper-radio-button>
                <paper-tooltip
                  animation-delay="0"
                  for="all-radio-button"
                  position="right"
                  offset="0"
                >
                  Zoom and center camera to display all points at once. Note,
                  that some points could be too far (i.e. too small) to be
                  visible.
                </paper-tooltip>
                <paper-radio-button id="user-radio-button" name="user">
                  Current view
                </paper-radio-button>
                <paper-tooltip
                  animation-delay="0"
                  for="user-radio-button"
                  position="right"
                  offset="0"
                >
                  Keep current camera position and zoom level.
                </paper-tooltip>
                <paper-radio-button id="share-radio-button" name="share">
                  Share viewpoint
                </paper-radio-button>
                <paper-tooltip
                  animation-delay="0"
                  for="share-radio-button"
                  position="right"
                  offset="0"
                >
                  Share viewpoint among all cameras.
                </paper-tooltip>
              </paper-radio-group>
            </div>
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
            <h3>No point cloud data was found.</h3>
            <p>Probable causes:</p>
            <ul>
              <li>
                You haven’t written any point cloud data to your event files.
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
                <tf-mesh-loader
                  active="[[active]]"
                  selected-view="[[_selectedView]]"
                  run="[[item.run]]"
                  tag="[[item.tag]]"
                  sample="[[item.sample]]"
                  of-samples="[[item.ofSamples]]"
                  request-manager="[[_requestManager]]"
                  class="tf-mesh-loader-container"
                  on-camera-position-change="_onCameraPositionChanged"
                >
                </tf-mesh-loader>
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
      paper-radio-button {
        display: block;
        padding: 5px;
      }
      .sidebar-section h3 {
        margin: 0;
        font-weight: normal;
        font-size: 14px;
        margin-bottom: 5px;
      }

      .runs-selector {
        flex-grow: 1;
      }

      tf-runs-selector {
        display: flex;
      }

      .view-control {
        display: block !important;
      }

      .view-control h3.title {
        padding-top: 16px;
        padding-bottom: 16px;
      }

      .allcontrols .view-control paper-radio-group {
        margin-top: 5px;
      }
      /* Layout must be horizontal, i.e. items arranged in a row. If items cannot fit in a row,
       * they should be moved to next line. All items must be square at all times. Minimum size of
       * the item is 480px. This means that maximum size of the item must be 480px + 479px = 959px.
       * */
      .horizontal {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
      }
      tf-mesh-loader {
        width: 480px;
        flex-basis: 480px;
        flex-grow: 1;
        display: block;
      }
    </style>
  `;

  @property({type: Boolean})
  reloadOnReady: boolean = true;

  @property({type: Array})
  _selectedRuns: string[];

  @property({type: Object})
  _runToTagInfo: object;

  @property({type: Boolean})
  _dataNotFound: boolean;

  @property({type: String})
  _tagFilter: string = '.*';

  @property({
    type: String,
    notify: true,
  })
  _selectedView: string = 'all';

  @property({type: Object})
  _requestManager = new RequestManager();

  constructor() {
    super();
    window.addEventListener(
      'resize',
      () => {
        this._handleWindowResize();
      },
      false
    );
    if (this.reloadOnReady) this.reload();
  }

  _getAllChildren() {
    return Array.from(
      this.shadowRoot?.querySelectorAll('tf-mesh-loader')!
    ) as TfMeshLoader[];
  }

  _onCameraPositionChanged(event) {
    if (this._selectedView == 'share') {
      this._getAllChildren().forEach((g) => {
        if (event.target == g) return; // Do not update trigger camera.
        (g as any).setCameraViewpoint(
          event.detail.position,
          event.detail.far,
          event.detail.target
        );
      });
    }
  }

  _shouldOpen(index) {
    return index <= 2;
  }

  reload() {
    this._fetchTags().then(this._reloadMeshes.bind(this));
  }

  _handleWindowResize() {
    this._getAllChildren().forEach((g) => {
      (g as TfMeshLoader).redraw();
    });
  }

  _fetchTags() {
    const url = getRouter().pluginRoute('mesh', '/tags');
    return this._requestManager.request(url).then((runToTagInfo) => {
      if (_.isEqual(runToTagInfo, this._runToTagInfo)) {
        // No need to update anything if there are no changes.
        return;
      }
      const runToTag = _.mapValues(runToTagInfo, (x) => Object.keys(x));
      const tags = getTags(runToTag);
      this._dataNotFound = tags.length === 0;
      this._runToTagInfo = runToTagInfo;
    });
  }
  _reloadMeshes() {
    this._getAllChildren().forEach((g) => {
      g.reload();
    });
  }

  @computed('_runToTagInfo', '_selectedRuns', '_tagFilter')
  get _categories(): unknown[] {
    var runToTagInfo = this._runToTagInfo;
    var selectedRuns = this._selectedRuns;
    var tagFilter = this._tagFilter;
    const runToTag = _.mapValues(runToTagInfo, (x) => Object.keys(x));
    const baseCategories = categorizeRunTagCombinations(
      runToTag as RunToTag,
      selectedRuns,
      tagFilter
    );

    function explodeItem(item) {
      const samples = runToTagInfo[item.run][item.tag].samples;
      return _.range(samples).map((i) =>
        Object.assign({}, item, {
          sample: i,
          ofSamples: samples,
        })
      );
    }

    const withSamples = baseCategories.map((category) =>
      Object.assign({}, category, {
        items: [].concat.apply([], category.items.map(explodeItem)),
      })
    );
    return withSamples;
  }
}
