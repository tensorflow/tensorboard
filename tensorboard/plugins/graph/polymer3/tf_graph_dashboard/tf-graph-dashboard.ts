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
import {DO_NOT_SUBMIT} from '../tf-imports/polymer.html';
import {DO_NOT_SUBMIT} from '../tf-backend/tf-backend.html';
import {DO_NOT_SUBMIT} from '../tf-dashboard-common/tf-dashboard-layout.html';
import {DO_NOT_SUBMIT} from '../tf-graph-board/tf-graph-board.html';
import {DO_NOT_SUBMIT} from '../tf-graph-controls/tf-graph-controls.html';
import {DO_NOT_SUBMIT} from '../tf-graph-loader/tf-graph-dashboard-loader.html';
import {DO_NOT_SUBMIT} from '../tf-storage/tf-storage.html';
import {DO_NOT_SUBMIT} from '../tf-tensorboard/registry.html';
import {DO_NOT_SUBMIT} from '../vz-sorting/vz-sorting.html';
import {DO_NOT_SUBMIT} from '../tf-imports/polymer.html';
import {DO_NOT_SUBMIT} from '../tf-backend/tf-backend.html';
import {DO_NOT_SUBMIT} from '../tf-dashboard-common/tf-dashboard-layout.html';
import {DO_NOT_SUBMIT} from '../tf-graph-board/tf-graph-board.html';
import {DO_NOT_SUBMIT} from '../tf-graph-controls/tf-graph-controls.html';
import {DO_NOT_SUBMIT} from '../tf-graph-loader/tf-graph-dashboard-loader.html';
import {DO_NOT_SUBMIT} from '../tf-storage/tf-storage.html';
import {DO_NOT_SUBMIT} from '../tf-tensorboard/registry.html';
import {DO_NOT_SUBMIT} from '../vz-sorting/vz-sorting.html';
const RUN_STORAGE_KEY = 'run';
/**
 * TODO(stephanwlee): Convert this to proper type when converting to TypeScript.
 * @typedef {{
 *   tag: ?string,
 *   displayName: string,
 *   conceptualGraph: boolean,
 *   opGraph: boolean,
 *   profile: boolean,
 * }}
 */
const TagItem = {};
/**
 * TODO(stephanwlee): Convert this to proper type when converting to TypeScript.
 * @typedef {{
 *   name: string,
 *   tags: !Array<!TagItem>,
 * }}
 */
const RunItem = {};
@customElement('tf-graph-dashboard')
class TfGraphDashboard extends PolymerElement {
  static readonly template = html`
    <paper-dialog id="error-dialog" with-backdrop=""></paper-dialog>
    <template
      is="dom-if"
      if="[[_datasetsState(_datasetsFetched, _datasets, 'EMPTY')]]"
    >
      <div style="max-width: 540px; margin: 80px auto 0 auto;">
        <h3>No graph definition files were found.</h3>
        <p>
          To store a graph, create a
          <code>tf.summary.FileWriter</code>
          and pass the graph either via the constructor, or by calling its
          <code>add_graph()</code> method. You may want to check out the
          <a href="https://www.tensorflow.org/get_started/graph_viz"
            >graph visualizer tutorial</a
          >.
        </p>

        <p>
          If you’re new to using TensorBoard, and want to find out how to add
          data and set up your event files, check out the
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
    <template
      is="dom-if"
      if="[[_datasetsState(_datasetsFetched, _datasets, 'PRESENT')]]"
    >
      <tf-dashboard-layout>
        <tf-graph-controls
          id="controls"
          class="sidebar"
          slot="sidebar"
          devices-for-stats="{{_devicesForStats}}"
          color-by-params="[[_colorByParams]]"
          stats="[[_stats]]"
          color-by="{{_colorBy}}"
          datasets="[[_datasets]]"
          render-hierarchy="[[_renderHierarchy]]"
          selection="{{_selection}}"
          selected-file="{{_selectedFile}}"
          selected-node="{{_selectedNode}}"
          health-pills-feature-enabled="[[_debuggerDataEnabled]]"
          health-pills-toggled-on="{{healthPillsToggledOn}}"
          on-fit-tap="_fit"
          trace-inputs="{{_traceInputs}}"
        ></tf-graph-controls>
        <div class="center" slot="center">
          <tf-graph-dashboard-loader
            id="loader"
            datasets="[[_datasets]]"
            selection="[[_selection]]"
            selected-file="[[_selectedFile]]"
            out-graph-hierarchy="{{_graphHierarchy}}"
            out-graph="{{_graph}}"
            out-stats="{{_stats}}"
            progress="{{_progress}}"
            hierarchy-params="[[_hierarchyParams]]"
            compatibility-provider="[[_compatibilityProvider]]"
          ></tf-graph-dashboard-loader>
          <tf-graph-board
            id="graphboard"
            devices-for-stats="[[_devicesForStats]]"
            color-by="[[_colorBy]]"
            color-by-params="{{_colorByParams}}"
            graph-hierarchy="[[_graphHierarchy]]"
            graph="[[_graph]]"
            hierarchy-params="[[_hierarchyParams]]"
            progress="[[_progress]]"
            debugger-data-enabled="[[_debuggerDataEnabled]]"
            are-health-pills-loading="[[_areHealthPillsLoading]]"
            debugger-numeric-alerts="[[_debuggerNumericAlerts]]"
            node-names-to-health-pills="[[_nodeNamesToHealthPills]]"
            all-steps-mode-enabled="{{allStepsModeEnabled}}"
            specific-health-pill-step="{{specificHealthPillStep}}"
            health-pill-step-index="[[_healthPillStepIndex]]"
            render-hierarchy="{{_renderHierarchy}}"
            selected-node="{{_selectedNode}}"
            stats="[[_stats]]"
            trace-inputs="[[_traceInputs]]"
          ></tf-graph-board>
        </div>
      </tf-dashboard-layout>
    </template>
    <style>
      :host /deep/ {
        font-family: 'Roboto', sans-serif;
      }

      .sidebar {
        display: flex;
        height: 100%;
      }

      .center {
        position: relative;
        height: 100%;
      }

      paper-dialog {
        padding: 20px;
      }
    </style>
  `;
  @property({
    type: Array,
  })
  _datasets: unknown[] = () => [];
  @property({
    type: Boolean,
  })
  _datasetsFetched: boolean = false;
  @property({
    type: Number,
  })
  _selectedDataset: number = 0;
  @property({type: Object, observer: '_renderHierarchyChanged'})
  _renderHierarchy: object;
  @property({
    type: Object,
  })
  _requestManager: object = () => new tf_backend.RequestManager();
  @property({
    type: Object,
  })
  _canceller: object = () => new tf_backend.Canceller();
  @property({type: Boolean})
  _debuggerDataEnabled: boolean;
  @property({type: Boolean})
  allStepsModeEnabled: boolean;
  @property({type: Number})
  specificHealthPillStep: number = 0;
  @property({
    type: Boolean,
    observer: '_healthPillsToggledOnChanged',
  })
  healthPillsToggledOn: boolean = false;
  @property({
    type: String,
    notify: true,
  })
  selectedNode: string;
  @property({type: Boolean})
  _isAttached: boolean;
  @property({type: Boolean})
  _initialized: boolean;
  @property({type: Boolean})
  _areHealthPillsLoading: boolean;
  @property({
    type: Array,
    notify: true,
  })
  _debuggerNumericAlerts: unknown[] = [];
  @property({
    type: Object,
  })
  _nodeNamesToHealthPills: object = {};
  @property({type: Number})
  _healthPillStepIndex: number;
  @property({type: Number})
  _healthPillRequestId: number = 1;
  @property({type: Number})
  _healthPillStepRequestTimerId: number;
  @property({
    type: Number,
    readOnly: true,
  })
  _healthPillStepRequestTimerDelay: number = 500;
  @property({type: Array})
  runs: unknown[];
  @property({
    type: String,
    notify: true,
    observer: '_runObserver',
  })
  run: string = tf_storage.getStringInitializer(RUN_STORAGE_KEY, {
    defaultValue: '',
    useLocalStorage: false,
  });
  @property({
    type: Object,
  })
  _selection: object;
  @property({type: Object})
  _compatibilityProvider: object;
  @property({type: Boolean})
  _traceInputs: boolean;
  attached() {
    this.set('_isAttached', true);
  }
  detached() {
    this.set('_isAttached', false);
  }
  reload() {
    if (!this._debuggerDataEnabled) {
      // Check if the debugger plugin is enabled now.
      this._requestManager
        .request(tf_backend.getRouter().pluginsListing())
        .then(
          this._canceller.cancellable((result) => {
            if (result.cancelled) {
              return;
            }
            if (result.value['debugger']) {
              // The debugger plugin is enabled. Request debugger-related
              // data. Perhaps the debugger plugin had been disabled
              // beforehand because no bad values (NaN, -/+ Inf) had been
              // found and muted_if_healthy had been on.
              this.set('_debuggerDataEnabled', true);
            }
          })
        );
    }
    this._maybeFetchHealthPills();
  }
  _fit() {
    this.$$('#graphboard').fit();
  }
  _runObserver = tf_storage.getStringObserver(RUN_STORAGE_KEY, {
    defaultValue: '',
    polymerProperty: 'run',
    useLocalStorage: false,
  });
  _fetchDataset() {
    return this._requestManager.request(
      tf_backend.getRouter().pluginRoute('graphs', '/info')
    );
  }
  /*
   * See also _maybeFetchHealthPills, _initiateNetworkRequestForHealthPills.
   * This function returns a promise with the raw health pill data.
   */
  _fetchHealthPills(nodeNames, step) {
    const postData = {
      node_names: JSON.stringify(nodeNames),
      // Events files with debugger data fall under this special run.
      run: '__debugger_data__',
    };
    if (step !== undefined) {
      // The user requested health pills for a specific step. This request
      // might be slow since the backend reads events sequentially from disk.
      postData['step'] = step;
    }
    const url = tf_backend.getRouter().pluginRoute('debugger', '/health_pills');
    return this._requestManager.request(url, postData);
  }
  _fetchDebuggerNumericsAlerts() {
    return this._requestManager.request(
      tf_backend.getRouter().pluginRoute('debugger', '/numerics_alert_report')
    );
  }
  _graphUrl(run, limitAttrSize, largeAttrsKey) {
    return tf_backend.getRouter().pluginRoute(
      'graphs',
      '/graph',
      new URLSearchParams({
        run: run,
        limit_attr_size: limitAttrSize,
        large_attrs_key: largeAttrsKey,
      })
    );
  }
  _shouldRequestHealthPills() {
    // Do not load debugger data if the feature is disabled, if the user toggled off the feature,
    // or if the graph itself has not loaded yet. We need the graph to load so that we know which
    // nodes to request health pills for.
    return (
      this._debuggerDataEnabled &&
      this.healthPillsToggledOn &&
      this._renderHierarchy &&
      this._datasetsState(this._datasetsFetched, this._datasets, 'PRESENT')
    );
  }
  @observe('_isAttached')
  _maybeInitializeDashboard() {
    var isAttached = this._isAttached;
    if (this._initialized || !isAttached) {
      // Either this dashboard is already initialized ... or we are not yet ready to initialize.
      return;
    }
    this.set(
      '_compatibilityProvider',
      new tf.graph.op.TpuCompatibilityProvider()
    );
    // Set this to true so we only initialize once.
    this._initialized = true;
    this._fetchDataset().then((dataset) => {
      const runNames = Object.keys(dataset);
      // Transform raw data into UI friendly data.
      this._datasets = runNames
        .sort(vz_sorting.compareTagNames)
        .map((runName) => {
          const runData = dataset[runName];
          const tagNames = Object.keys(runData.tags).sort(
            vz_sorting.compareTagNames
          );
          const tags = tagNames
            .map((name) => runData.tags[name])
            .map(({tag, conceptual_graph, op_graph, profile}) => ({
              tag,
              displayName: tag,
              conceptualGraph: conceptual_graph,
              opGraph: op_graph,
              profile,
            }));
          // Translate a run-wide GraphDef into specially named (without a tag) op graph
          // to abstract the difference between run_graph vs. op_graph from other
          // components.
          const tagsWithV1Graph = runData.run_graph
            ? [
                {
                  tag: null,
                  displayName: 'Default',
                  conceptualGraph: false,
                  opGraph: true,
                  profile: false,
                },
                ...tags,
              ]
            : tags;
          return {name: runName, tags: tagsWithV1Graph};
        });
      this._datasetsFetched = true;
    });
  }
  @observe('_datasetsFetched', '_datasets', 'run')
  _determineSelectedDataset() {
    var datasetsFetched = this._datasetsFetched;
    var datasets = this._datasets;
    var run = this.run;
    // By default, load the first dataset.
    if (!run) {
      // By default, load the first dataset.
      this.set('_selectedDataset', 0);
      return;
    }
    // If the URL specifies a dataset, load it.
    const dataset = datasets.findIndex((d) => d.name === run);
    if (dataset === -1) {
      if (datasetsFetched) {
        // Tell the user if the dataset cannot be found to avoid misleading
        // the user.
        const dialog = this.$$('#error-dialog');
        dialog.textContent = `No dataset named "${run}" could be found.`;
        dialog.open();
      }
      return;
    }
    this.set('_selectedDataset', dataset);
  }
  @observe('_datasetsFetched', '_datasets', '_selectedDataset')
  _updateSelectedDatasetName() {
    var datasetsFetched = this._datasetsFetched;
    var datasets = this._datasets;
    var selectedDataset = this._selectedDataset;
    if (!datasetsFetched) return;
    // Cannot update `run` to update the hash in case datasets for graph is empty.
    if (datasets.length <= selectedDataset) return;
    this.set('run', datasets[selectedDataset].name);
  }
  _requestHealthPills() {
    this.set('_areHealthPillsLoading', true);
    var requestId = ++this._healthPillRequestId;
    if (this._healthPillStepRequestTimerId !== null) {
      // A request for health pills is already scheduled to be initiated. Clear it, and schedule a
      // new request.
      window.clearTimeout(this._healthPillStepRequestTimerId);
      this._healthPillStepRequestTimerId = null;
    }
    if (this.allStepsModeEnabled) {
      // This path may be slow. Schedule network requests to start some time later. If another
      // request is scheduled in the mean time, drop this current request.
      this._healthPillStepRequestTimerId = setTimeout(
        function() {
          this._healthPillStepRequestTimerId = null;
          this._initiateNetworkRequestForHealthPills(requestId);
        }.bind(this),
        this._healthPillStepRequestTimerDelay
      );
    } else {
      // The user is fetching sampled steps. This path is fast, so no need to throttle. Directly
      // fetch the health pills across the network.
      this._initiateNetworkRequestForHealthPills(requestId);
    }
  }
  // Initiates the network request for health pills. Do not directly call this method - network
  // requests may be throttled. Instead, call _requestHealthPills, which uses this method.
  _initiateNetworkRequestForHealthPills(requestId) {
    if (this._healthPillRequestId !== requestId) {
      // This possibly scheduled request was outdated before it was even sent across the network. Do
      // not bother initiating it.
      return;
    }
    const specificStep = this.allStepsModeEnabled
      ? this.specificHealthPillStep
      : undefined;
    const healthPillsPromise = this._fetchHealthPills(
      this._renderHierarchy.getNamesOfRenderedOps(),
      specificStep
    );
    const alertsPromise = this._fetchDebuggerNumericsAlerts();
    Promise.all([healthPillsPromise, alertsPromise]).then(
      function(result) {
        var healthPillsResult = result[0];
        var alertsResult = result[1];
        if (!this.healthPillsToggledOn) {
          // The user has opted to hide health pills via the toggle button.
          return;
        }
        if (requestId !== this._healthPillRequestId) {
          // This response is no longer relevant.
          return;
        }
        // Set the index for which step to show for the health pills. By default, show the last step.
        // A precondition we assume (that Tensorboard's reservoir sampling guarantees) is that all
        // node names should be mapped to the same number of steps.
        for (var nodeName in healthPillsResult) {
          this.set(
            '_healthPillStepIndex',
            healthPillsResult[nodeName].length - 1
          );
          break;
        }
        this.set('_debuggerNumericAlerts', alertsResult);
        this.set('_nodeNamesToHealthPills', healthPillsResult);
        this.set('_areHealthPillsLoading', false);
        this.set('_healthPillStepRequestTimerId', null);
      }.bind(this)
    );
  }
  _datasetsState(datasetsFetched, datasets, state) {
    if (!datasetsFetched) return state === 'NOT_LOADED';
    if (!datasets || !datasets.length) return state === 'EMPTY';
    return state === 'PRESENT';
  }
  _renderHierarchyChanged(renderHierarchy) {
    // Reload any data on the graph when the render hierarchy (which determines which nodes are
    // rendered) changes.
    this.reload();
  }
  _handleNodeToggleExpand() {
    // Nodes were toggled. We may need to request health pills for more nodes.
    this._maybeFetchHealthPills();
  }
  _healthPillsToggledOnChanged(healthPillsToggledOn) {
    if (healthPillsToggledOn) {
      // Load health pills.
      this.reload();
    } else {
      // Remove all health pills by setting an empty mapping.
      this.set('_nodeNamesToHealthPills', {});
    }
  }
  // Fetch health pills for a specific step if applicable.
  _maybeFetchHealthPills() {
    if (!this._shouldRequestHealthPills()) {
      return;
    }
    this._requestHealthPills();
  }
}
