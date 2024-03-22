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

import {customElement, observe, property} from '@polymer/decorators';
import {html, PolymerElement} from '@polymer/polymer';
import * as _ from 'lodash';
import '../../../components/polymer/irons_and_papers';
import {LegacyElementMixin} from '../../../components/polymer/legacy_element_mixin';
import {Canceller} from '../../../components/tf_backend/canceller';
import '../tf_hparams_utils/hparams-split-layout';
import * as tf_hparams_utils from '../tf_hparams_utils/tf-hparams-utils';

interface MinMax {
  minValue: number | 'Infinity' | '-Infinity';
  maxValue: number | 'Infinity' | '-Infinity';
}

interface ColumnHparam {
  hparam: string;
  filterDiscrete?: any[];
  filterInterval?: MinMax | null;
  filterRegexp?: string;
  order?: string;
  includeInResult: boolean;
}

interface ColumnMetric {
  metric: string;
  filterInterval?: MinMax | null;
  order?: string;
  includeInResult: boolean;
}

const MAX_DOMAIN_DISCRETE_LIST_LEN = 10;

/**
 * The tf-hparams-query-pane element implements controls for querying the
 * server for a list of session groups. It provides filtering, and
 * sorting controls.
 *
 * TODO(erez): Add aggregation controls for repeated sessions.
 */
@customElement('tf-hparams-query-pane')
class TfHparamsQueryPane extends LegacyElementMixin(PolymerElement) {
  static readonly template = html`
    <hparams-split-layout orientation="vertical">
      <div slot="content" class="section hyperparameters">
        <div class="section-title">Hyperparameters</div>
        <template is="dom-if" if="[[_TooManyHparams]]">
          <div class="too-many-hparams">
            Warning: There were too many hparams to load all of them
            efficiently. Only [[_maxNumHparamsToLoad]] were loaded.
          </div>
        </template>
        <template is="dom-repeat" items="{{_hparams}}" as="hparam">
          <div class="hparam">
            <paper-checkbox
              checked="{{hparam.displayed}}"
              class="hparam-checkbox"
            >
              [[_hparamName(hparam.info)]]
            </paper-checkbox>
            <!-- Precisely one of the templates below will be stamped.-->
            <!-- 1. A list of checkboxes -->
            <template is="dom-if" if="[[hparam.filter.domainDiscrete]]">
              <template
                is="dom-repeat"
                items="[[hparam.filter.domainDiscrete]]"
              >
                <paper-checkbox
                  checked="{{item.checked}}"
                  class="discrete-value-checkbox"
                  on-change="_queryServer"
                >
                  [[_prettyPrint(item.value)]]
                </paper-checkbox>
              </template>
            </template>
            <!-- 2. A numeric interval -->
            <template is="dom-if" if="[[hparam.filter.interval]]">
              <paper-input
                label="Min"
                value="{{hparam.filter.interval.min.value}}"
                allowed_pattern="[0-9.e\\-]"
                on-value-changed="_queryServer"
                error-message="Invalid input"
                invalid="[[hparam.filter.interval.min.invalid]]"
                placeholder="-infinity"
              >
              </paper-input>
              <paper-input
                label="Max"
                value="{{hparam.filter.interval.max.value}}"
                allowed_pattern="[0-9.e\\-]"
                on-value-changed="_queryServer"
                error-message="Invalid input"
                invalid="[[hparam.filter.interval.max.invalid]]"
                placeholder="+infinity"
              >
              </paper-input>
            </template>
            <!-- 3. A regexp -->
            <template is="dom-if" if="[[_hasRegexpFilter(hparam)]]">
              <paper-input
                label="Regular expression"
                value="{{hparam.filter.regexp}}"
                on-value-changed="_queryServer"
              >
              </paper-input>
            </template>
          </div>
        </template>
      </div>
      <div slot="content" class="section metrics">
        <div class="section-title">Metrics</div>
        <template is="dom-repeat" items="{{_metrics}}" as="metric">
          <div class="metric">
            <!-- TODO(erez): Make it easier to handle a large number of
                  metrics:
                  1. Add an 'isolator' radio-button to select just one
                  metric and
                  hide all the rest
                  2. Add a 'toggle-all' button that will hide/unhide
                    all the
                  metrics.
                  Use similar logic/appearance to the run-selector of
                  scalars.-->
            <paper-checkbox
              checked="{{metric.displayed}}"
              class="metric-checkbox"
            >
              [[_metricName(metric.info)]]
            </paper-checkbox>
            <div class="inline-element">
              <paper-input
                label="Min"
                value="{{metric.filter.interval.min.value}}"
                allowed-pattern="[0-9.e\\-]"
                on-value-changed="_queryServer"
                error-message="Invalid input"
                invalid="{{metric.filter.interval.min.invalid}}"
                placeholder="-infinity"
              >
              </paper-input>
            </div>
            <div class="inline-element">
              <paper-input
                label="Max"
                allowed-pattern="[0-9.e\\-]"
                value="{{metric.filter.interval.max.value}}"
                on-value-changed="_queryServer"
                error-message="Invalid input"
                invalid="{{metric.filter.interval.max.invalid}}"
                placeholder="+infinity"
              >
              </paper-input>
            </div>
          </div>
        </template>
      </div>
      <div slot="content" class="section status">
        <div class="section-title">Status</div>
        <template is="dom-repeat" items="[[_statuses]]" as="status">
          <paper-checkbox checked="{{status.allowed}}" on-change="_queryServer">
            [[status.displayName]]
          </paper-checkbox>
        </template>
      </div>
      <div slot="content" class="section sorting">
        <div class="section-title">Sorting</div>
        <paper-dropdown-menu
          label="Sort by"
          on-selected-item-changed="_queryServer"
          horizontal-align="left"
        >
          <paper-listbox
            class="dropdown-content"
            slot="dropdown-content"
            selected="{{_sortByIndex}}"
            on-selected-item-changed="_queryServer"
          >
            <template is="dom-repeat" items="[[_hparams]]" as="hparam">
              <paper-item> [[_hparamName(hparam.info)]] </paper-item>
            </template>
            <template is="dom-repeat" items="[[_metrics]]" as="metric">
              <paper-item> [[_metricName(metric.info)]] </paper-item>
            </template>
          </paper-listbox>
        </paper-dropdown-menu>
        <paper-dropdown-menu
          label="Direction"
          on-selected-item-changed="_queryServer"
          horizontal-align="left"
        >
          <paper-listbox
            class="dropdown-content"
            slot="dropdown-content"
            selected="{{_sortDirection}}"
          >
            <paper-item>Ascending</paper-item>
            <paper-item>Descending</paper-item>
          </paper-listbox>
        </paper-dropdown-menu>
      </div>
      <div slot="content" class="section paging">
        <div class="section-title">Paging</div>
        <div>
          Number of matching session groups: [[_totalSessionGroupsCountStr]]
        </div>
        <div class="inline-element page-number-input">
          <paper-input
            label="Page #"
            value="{{_pageNumberInput.value}}"
            allowed-pattern="[0-9]"
            error-message="Invalid input"
            invalid="[[_pageNumberInput.invalid]]"
            on-value-changed="_queryServer"
          >
            <div slot="suffix" class="page-suffix">/ [[_pageCountStr]]</div>
          </paper-input>
        </div>
        <div class="inline-element page-size-input">
          <paper-input
            label="Max # of session groups per page:"
            value="{{_pageSizeInput.value}}"
            allowed-pattern="[0-9]"
            error-message="Invalid input"
            invalid="[[_pageSizeInput.invalid]]"
            on-value-changed="_queryServer"
          >
          </paper-input>
        </div>
      </div>
      <div slot="content" class="section download">
        <template is="dom-if" if="[[_sessionGroupsRequest]]">
          Download data as
          <span>
            <a
              id="csvLink"
              download="hparams_table.csv"
              href="[[_csvUrl(_sessionGroupsRequest, configuration)]]"
              >CSV</a
            >
            <a
              id="jsonLink"
              download="hparams_table.json"
              href="[[_jsonUrl(_sessionGroupsRequest, configuration)]]"
              >JSON</a
            >
            <a
              id="latexLink"
              download="hparams_table.tex"
              href="[[_latexUrl(_sessionGroupsRequest, configuration)]]"
              >LaTeX</a
            >
          </span>
        </template>
      </div>
    </hparams-split-layout>
    <style>
      .section {
        padding: 10px;
      }
      .section-title {
        display: block;
        font-weight: bold;
        text-decoration: underline;
        margin-bottom: 7px;
      }
      .too-many-hparams {
        color: var(--tb-orange-dark);
        font-size: 13px;
        font-style: italic;
        margin: 12px 0;
      }
      .discrete-value-checkbox,
      .metric-checkbox,
      .hparam-checkbox {
        display: block;
      }
      .discrete-value-checkbox {
        margin-left: 20px;
      }
      .hparam,
      .metric {
        display: block;
      }
      .inline-element {
        display: inline-block;
        width: 40%;
        margin-left: 10px;
      }
      .page-number-input {
        width: 20%;
      }
      .page-size-input {
        width: 60%;
      }
      vaadin-split-layout {
        height: 100%;
      }
      paper-listbox {
        max-height: 15em;
      }
      .page-suffix {
        white-space: nowrap;
      }
    </style>
  `;
  // An object for making HParams API requests to the backend.@property({type: Object})
  backend: any;
  // The name of the experiment to use. Will be passed as is to
  // the /experiment HTTP endpoint.
  @property({type: String})
  experimentName: string;
  // Contains the schema and columns visibility status.
  // We use a single object we call 'configuration' to hold both of
  // these properties, since Polymer (v1) doesn't allow atomic
  // changes to multiple properties (that is, sending the notification
  // to downstream consumers only after all properties have been updated).
  //
  // Properties:
  // -----------
  // schema.hparamColumns[i].hparamInfo contains the HParamInfo protocol
  // buffer representing the ith hparam.
  // schema.metricColumns[i].metricInfo contains the MetricInfo protocol
  // buffer representing the ith metric.
  //
  // columnsVisibility[].
  // A boolean array whose ith entry is true if
  // the ith column is visible (selected to be displayed by the user).
  // Columns are indexed by listing the hyperparameters first in
  // the order they are represented by schema.hparamColumns, followed
  // by the metrics in the order they are represented by
  // schema.metricColumns.
  //
  // visibleSchema.
  // DEPRECATED. New code should use the schema and columnVisibile
  // properties instead.
  // TODO(): Remove when all consumers are migrated to use the
  // schema and columnVisibile fields.
  // Contains arrays of HParamInfo and MetricInfo protocol buffers
  // consisting of only the visible hyperparameters and metrics,
  // respectively.
  /**
   * @type {{
   *    schema: {
   *      hparamColumns: Array<{hparamInfo: Object}>,
   *      metricColumns: Array<{metricInfo: Object}>,
   *    },
   *    columnsVisibility: Array<Boolean>,
   *    visibleSchema: {
   *      hparamInfos: Array<Object>,
   *      metricInfos: Array<Object>,
   *    }
   * }}
   */
  @property({
    type: Object,
    notify: true,
  })
  configuration = {
    schema: {
      hparamColumns: Array<any>(),
      metricColumns: Array<any>(),
    },
    columnsVisibility: Array<any>(),
    visibleSchema: {
      hparamInfos: Array<any>(),
      metricInfos: Array<any>(),
    },
  };
  // The latest list of session groups received from the server.
  // See the comments in the _buildListSessionGroupsRequest() methods for
  // more details.
  @property({
    type: Array,
    notify: true,
  })
  sessionGroups = [];
  // We track both "data found" and "data not found", because this
  // makes it expedient to display nothing until the initial fetch is
  // complete.  In the absence of this "undefined" case, we would end up
  // briefly displaying the "no data" message before the data arrives.
  // Note that, in the context of a dom-if condition, we cannot easily
  // distinguish between false and undefined.
  @property({
    type: Boolean,
    notify: true,
  })
  dataLoadedWithNonEmptyHparams: boolean = false;
  // Note that `dataLoadedWithEmptyHparams = false` means that we don't
  // know yet whether data will be found or not (i.e., the fetch has not
  // yet returned).  `dataLoadedWithEmptyHparams = true` means the fetch
  // completed, and there really is no data.
  @property({
    type: Boolean,
    notify: true,
  })
  dataLoadedWithEmptyHparams: boolean = false;
  // The experiment object returned by the backend. See the definition of
  // the Experiment protocol buffer in api.proto.
  @property({type: Object})
  _experiment: any;
  // An array of objects--each storing information about the user settings
  // for a single hparam. Each object has the following fields:
  // info: The HParamInfo object returned by the backend in the
  //   experiment object. Not strictly a user-setting, but we need it
  //   for displaying the name in the element.
  // displayed: Whether the hparam is displayed or not (the value of
  //   the checkbox next to the hparam).
  // filter: The current filter settings of the hparam. Only session
  //   groups whose hparam values pass this filter will be displayed in
  //   the session groups table. The object stored in this field depends
  //   on the type of filter used as follows:
  //
  //   1. For a discrete filter, the object will have the form:
  //   domainDiscrete: [
  //     {value:v1, checked: bool_1},
  //     {value:v2, checked: bool_2}, ...
  //   ], namely an array with entries corresponding to the discrete
  //   domain of the hparam. The 'value' field for each entry stores the
  //   discrete value corresponding to the entry, and 'checked' is a
  //   boolean denoting whether the value is allowed (true) or not
  //   (false)
  //
  //   2. For an interval, the object will have the form:
  //   interval: {min: {value: string invalid: boolean},
  //              max: {value: string invalid: boolean} },
  //   where each 'value' field denote the corresponding input-box's
  //   current value and 'invalid' is the input-box' invalid property.
  //
  //   3. Finally for a regexp filter, the object will have a single
  //   'regexp' string field containing the filtering regexp.
  @property({type: Array})
  _hparams: any[];
  // The limit to the number of hparams we will load. Loading too many will slow
  // down the UI noticeably and possibly crash it.
  @property({type: Number}) _maxNumHparamsToLoad: number = 1000;
  // Tracks whether we loaded the maximum number of allowed hparams as defined
  // by _maxNumHparamsToLoad.
  @property({type: Boolean}) _tooManyHparams: boolean = false;
  // An array of objects--each storing information about the user
  // setting for a single metric. Each object has the following fields:
  // info: The MetricInfo object returned by the backend in the
  //   experiment object. Not strictly a user-setting, but we need it
  //   for displaying the name in the element.
  // filter: The current filter "settings" of the metric. Only session
  //   groups whose metric values pass this filter will be displayed in
  //   the session groups table. The object stored in this field has the
  //   form:
  //   interval: {min: {value: string invalid: boolean},
  //              max: {value: string invalid: boolean} },
  //   where each 'value' field denote the corresponding input-box's
  //   current value and 'invalid' is the input-box' invalid property.

  // displayed: Whether the metric is displayed or not (can be toggled
  //   by the user by a checkbox next to the metric.)
  @property({type: Array})
  _metrics: any[];
  // An array of objects each representing information about a session
  // status and whether it is currently allowed by the user.
  @property({
    type: Array,
  })
  _statuses = [
    {value: 'STATUS_UNKNOWN', displayName: 'Unknown', allowed: true},
    {value: 'STATUS_SUCCESS', displayName: 'Success', allowed: true},
    {value: 'STATUS_FAILURE', displayName: 'Failure', allowed: true},
    {value: 'STATUS_RUNNING', displayName: 'Running', allowed: true},
  ];
  // A promise that resolves after the initial getExperiment network RPC
  // resolves. Used for unit-test to allow testing to run after the
  // element has initialized.
  @property({
    type: Object,
  })
  _getExperimentResolved = new Promise((resolve) => {
    this._resolveGetExperiment = resolve;
  });
  // The resolve() callback for the _getExperimentResolved promise.
  // See the _getExperimentResolved property.
  @property({type: Object})
  _resolveGetExperiment: Function;
  // A tf_backend.canceller used to keep track of pending
  // ListSessionGroups requests and cancel their resulting UI updates
  // when a new ListSessionGroups request is made.
  @property({
    type: Object,
  })
  _listSessionGroupsCanceller = new Canceller();
  // The index of the "column" by which to sort. HParams column indices
  // are the hparams indices in the _hparams array. Metrics column indices
  // are their index in the _metrics array offset by this._hparams.length.
  // See also the method _metricSortByIndex() below.
  @property({type: Number})
  _sortByIndex: number;
  // The sort direction (ascending/descending).
  // 0 means ascending, 1 means descending.
  @property({type: Number})
  _sortDirection: number;
  // The value and invalid properties of the 'page-size' input box.
  @property({
    type: Object,
  })
  _pageSizeInput = {value: '100', invalid: false};
  // The value and invalid properties of the 'page-number' input box.
  @property({
    type: Object,
  })
  _pageNumberInput = {value: '1', invalid: false};
  // The string displaying the total number of pages or '?' if unknown.
  @property({
    type: String,
  })
  _pageCountStr: string = '?';
  // The string displaying the total number of session groups matched
  // by the query, or 'unknown' if the server didn't send that
  // information.
  @property({type: String})
  _totalSessionGroupsCountStr: string;
  // Computed query that is send to the backend when panes are updated to
  // create ListSessionGroupsRequest and retrieve the response
  @property({type: Object})
  _sessionGroupsRequest: object;
  reload() {
    this._queryServer();
  }
  _csvUrl(request, configuration) {
    return this._downloadDataUrl(request, configuration, 'csv');
  }
  _jsonUrl(request, configuration) {
    return this._downloadDataUrl(request, configuration, 'json');
  }
  _latexUrl(request, configuration) {
    return this._downloadDataUrl(request, configuration, 'latex');
  }
  _downloadDataUrl(request, configuration, format) {
    const visibility = configuration.columnsVisibility;
    return this.backend.getDownloadUrl(format, request, visibility);
  }
  @observe('backend', 'experimentName')
  // Sends a request for experiment to the server, and updates
  // the state of this element accordingly. Currently, only called
  // once on element initialization.
  _computeExperimentAndRelatedProps() {
    const utils = tf_hparams_utils;
    if (
      utils.isNullOrUndefined(this.backend) ||
      utils.isNullOrUndefined(this.experimentName)
    ) {
      return;
    }
    const experimentRequest = {
      experimentName: this.experimentName,
      hparamsLimit: this._maxNumHparamsToLoad,
    };
    this.backend
      .getExperiment(experimentRequest)
      .then((experiment) => {
        if (_.isEqual(experiment, this._experiment)) {
          // No need to update anything if there are no changes.
          return;
        }
        this.set('_experiment', experiment);
        this._computeHParams();
        this._computeMetrics();
        this._queryServer();
        this._resolveGetExperiment();
      })
      .finally(() => {
        this._computeDataFound();
      });
  }
  _computeDataFound() {
    const result = Boolean(
      this._experiment &&
        this._experiment.hparamInfos &&
        this._experiment.hparamInfos.length > 0
    );
    this.set('dataLoadedWithNonEmptyHparams', result);
    this.set('dataLoadedWithEmptyHparams', !result);
  }
  // Updates the _hparams property from the _experiment property.
  _computeHParams() {
    const result: any[] = [];
    this._experiment.hparamInfos.forEach((anInfo) => {
      const hparam = {
        info: anInfo as any,
        // Controls whether the hparam is chosen for display in the main view.
        // Set later.
        displayed: false,
        filter: {} as any,
      };
      if (hparam.info.hasOwnProperty('domainDiscrete')) {
        // Handle a discrete domain. Could be of any data type.
        if (hparam.info.domainDiscrete.length < MAX_DOMAIN_DISCRETE_LIST_LEN) {
          hparam.filter.domainDiscrete = [];
          hparam.info.domainDiscrete.forEach((val: any) => {
            hparam.filter.domainDiscrete.push({
              value: val,
              checked: true,
            });
          });
        } else {
          // Don't show long lists of values. If the list surpasses a certain
          // threshold then the user instead specifies regex filters.
          hparam.filter.regexp = '';
        }
      } else if (hparam.info.type === 'DATA_TYPE_FLOAT64') {
        // Handle a float interval domain.
        hparam.filter.interval = {
          min: {
            value: '',
            invalid: false,
          },
          max: {
            value: '',
            invalid: false,
          },
        };
      } else {
        console.warn(
          'cannot process domain type %s without discrete domain values',
          hparam.info.type
        );
      }
      result.push(hparam);
    });
    // Reorder by moving hparams with 'differs === true' to the top of the list.
    result.sort((x, y) => {
      if (x.info.differs === y.info.differs) {
        return 0;
      }

      return x.info.differs ? -1 : 1;
    });
    // Choose to display the first 5 hparams in the main view initially.
    const kNumHParamsToDisplayByDefault = 5;
    const numHparamsToDisplay = Math.min(
      kNumHParamsToDisplayByDefault,
      result.length
    );
    for (let i = 0; i < numHparamsToDisplay; i++) {
      result[i].displayed = true;
    }
    this.set('_hparams', result);
    this.set('_TooManyHparams', result.length >= this._maxNumHparamsToLoad);
  }
  // Updates the _metrics property from the _experiment property.
  _computeMetrics() {
    const result: any[] = [];
    // By default we display the first kNumMetricsToDisplayByDefault metrics
    // and not the rest.
    const kNumMetricsToDisplayByDefault = 5;
    this._experiment.metricInfos.forEach((info, index) => {
      const metric = {
        info: info,
        filter: {
          interval: {
            min: {
              value: '',
              invalid: false,
            },
            max: {
              value: '',
              invalid: false,
            },
          },
        },
        displayed: index < kNumMetricsToDisplayByDefault,
      };
      result.push(metric);
    });
    this.set('_metrics', result);
  }
  _computeSchema() {
    if (!this._hparams || !this._metrics) {
      return {hparamColumns: [], metricColumns: []};
    }
    return {
      hparamColumns: this._hparams.map((hparam) => ({
        hparamInfo: hparam.info,
      })),
      metricColumns: this._metrics.map((metric) => ({
        metricInfo: metric.info,
      })),
    };
  }
  @observe('_hparams.*', '_metrics.*')
  _updateConfiguration() {
    this.debounce('_updateConfiguration', () => {
      this.configuration = {
        schema: this._computeSchema(),
        columnsVisibility: this._computeColumnsVisibility(),
        visibleSchema: this._computeVisibleSchema(),
      };
    });
  }
  _computeColumnsVisibility() {
    if (!this._hparams || !this._metrics) return [];
    return this._hparams
      .map((hparam) => hparam.displayed)
      .concat(this._metrics.map((metric) => metric.displayed));
  }
  _computeVisibleSchema() {
    if (!this._hparams || !this._metrics) {
      return {hparamInfos: [], metricInfos: []};
    }
    const newHParamInfos = this._hparams
      .filter((hparam) => hparam.displayed)
      .map((hparam) => hparam.info);
    const newMetricInfos = this._metrics
      .filter((metric) => metric.displayed)
      .map((metric) => metric.info);
    return {
      hparamInfos: newHParamInfos,
      metricInfos: newMetricInfos,
    };
  }
  // Determines if a regex filter should be rendered.
  _hasRegexpFilter(hparam) {
    return hparam.filter.regexp !== undefined;
  }
  // Sends a query to the server for the list of session groups.
  // Asynchronously updates the sessionGroups property with the response.
  _queryServer() {
    this.debounce('queryServer', () => this._queryServerNoDebounce(), 100);
  }
  // Directly queries the server without a debounce, called in queryServer()
  // above. Returns a promise, for use in unit-tests, that resolves (with
  // 'undefined') when the ListSessionGroups RPC returns.
  _queryServerNoDebounce() {
    if (!this._hparams || !this._metrics) {
      return;
    }
    return this._sendListSessionGroupsRequest().then(
      this._listSessionGroupsCanceller.cancellable(
        ({value, cancelled}: any) => {
          if (cancelled) {
            return;
          }
          // The server may not support a "totalSize" field in
          // which case this field would be negative, and we
          // populate the page count with a "?".
          if (value.totalSize >= 0) {
            const pageSize = +this._pageSizeInput.value;
            this.set(
              '_pageCountStr',
              String(Math.ceil(value.totalSize / pageSize))
            );
            this.set('_totalSessionGroupsCountStr', value.totalSize);
          } else {
            this.set('_pageCountStr', '?');
            this.set('_totalSessionGroupsCountStr', 'Unknown');
          }
          tf_hparams_utils.setArrayObservably(
            this,
            'sessionGroups',
            value.sessionGroups
          );
        }
      )
    );
  }
  _sendListSessionGroupsRequest() {
    const request = this._buildListSessionGroupsRequest();
    if (request === null) {
      // If query configuration is not valid don't send a request.
      return;
    }
    this.set('_sessionGroupsRequest', request);
    // Note that the responses to the RPCs sent
    // to the backend may return in a different order than the order in
    // which they were sent. If we just update sessionGroups in the
    // order of responses received, we can end up
    // with a sessionGroups object that doesn't match the filtering and
    // sorting configuration. For example, if the last response received
    // was for a query belonging to the penultimate filtering and
    // sorting configuration. To solve this, we use tf_backend.canceller
    // to cancel all the pending promises from previous queries for which
    // we haven't received a response yet.
    this._listSessionGroupsCanceller.cancelAll();
    return this.backend.listSessionGroups(request);
  }
  // Reads the values of the properties bound to the query elements
  // and builds the corresponding ListSessionGroupsRequest.
  // If the user settings are invalid (e.g. an input-box doesn't containt
  // a parsable number), marks the corresponding elements (if they exist,
  // see next paragraph) as invalid so that they will display an
  // error message and returns null.
  //
  // Note, that this method can be called before the elements have
  // been rendered (when the tf-hparams-query is first created), in which
  // case it will not try to mark the elements as invalid.
  _buildListSessionGroupsRequest() {
    const _this = this;
    // Will be set to false if we encounter any invalid inputs.
    let queryValid = true;
    // Determines if an interval has been set to any range of values other than
    // the default.
    function isIntervalSet(interval) {
      return interval.min.value !== '' || interval.max.value !== '';
    }
    // Parses an inputInterval object of the form:
    // {min: {value: string, invalid: boolean},
    //  max: {value: string  invalid: boolean}}. Returns an object
    // of the form: {minValue: number, maxValue: number} suitable to
    // be included as an interval in ListSessionGroupsRequest. If the
    // min or max values cannot be parsed, returns null. In both cases
    // sets the 'invalid' fields to denote whether the inputs is invalid.
    //
    // The inputIntervalPath should be a Polymer path for the inputInterval
    // object. We work with paths, rather than the object, so that we
    // can make observable changes.
    function parseInputInterval(inputIntervalPath): MinMax | null {
      const minValueStr = _this.get(inputIntervalPath + '.min.value');
      console.assert(minValueStr !== undefined);
      // The protobuffer JSON mapping maps the strings "-Infinity" and
      // "Infinity" to the floating-point infinity and -infinity values.
      const minValue = minValueStr === '' ? '-Infinity' : +minValueStr;
      const minValueIsNan = isNaN(minValue as number);
      _this.set(inputIntervalPath + '.min.invalid', minValueIsNan);
      queryValid = queryValid && !minValueIsNan;
      const maxValueStr = _this.get(inputIntervalPath + '.max.value');
      console.assert(maxValueStr !== undefined);
      const maxValue = maxValueStr === '' ? 'Infinity' : +maxValueStr;
      const maxValueIsNan = isNaN(maxValue as number);
      _this.set(inputIntervalPath + '.max.invalid', maxValueIsNan);
      queryValid = queryValid && !maxValueIsNan;
      if (minValueIsNan || maxValueIsNan) {
        return null;
      }
      return {minValue: minValue, maxValue: maxValue};
    }
    // Parses the value of an input object of the form:
    // {value: string, invalid: boolean} as a positive integer and returns
    // the integer or null if the parsing fails.
    // If parsing fails, also sets the 'invalid' property of the input
    // object to false.
    //
    // The inputPath should be a Polymer path to input object. We work
    // with paths, rather than the object, so that we can make observable
    // changes.
    function parseInputAsPositiveInt(inputPath) {
      const inputValueStr = _this.get(inputPath + '.value');
      console.assert(inputValueStr !== undefined);
      const result = +inputValueStr;
      const validResult = Number.isInteger(result) && result > 0;
      _this.set(inputPath + '.invalid', !validResult);
      queryValid = queryValid && validResult;
      if (validResult) {
        return result;
      }
      return null;
    }
    // Build the allowed status filters.
    const allowedStatuses = this._statuses
      .filter((s) => s.allowed)
      .map((s) => s.value);
    let colParams: (ColumnHparam | ColumnMetric)[] = [];
    // Build the hparams filters in the request.
    this._hparams.forEach((hparam, index) => {
      let colParam: ColumnHparam = {
        hparam: hparam.info.name,
        includeInResult: true,
      };
      if (hparam.filter.domainDiscrete) {
        const allChecked = hparam.filter.domainDiscrete.every(
          (filterVal) => filterVal.checked
        );
        if (!allChecked) {
          colParam.filterDiscrete = [];
          hparam.filter.domainDiscrete.forEach((filterVal) => {
            if (filterVal.checked) {
              colParam.filterDiscrete!.push(filterVal.value);
            }
          });
        }
      } else if (hparam.filter.interval) {
        if (isIntervalSet(hparam.filter.interval)) {
          colParam.filterInterval = parseInputInterval(
            '_hparams.' + index + '.filter.interval'
          );
        }
      } else if (hparam.filter.regexp) {
        colParam.filterRegexp = hparam.filter.regexp;
      }

      colParams.push(colParam);
    });
    // Build the metric filters in the request.
    this._metrics.forEach((metric, index) => {
      let colParam: ColumnMetric = {
        metric: metric.info.name,
        includeInResult: true,
      };
      if (isIntervalSet(metric.filter.interval)) {
        colParam.filterInterval = parseInputInterval(
          '_metrics.' + index + '.filter.interval'
        );
      }
      colParams.push(colParam);
    });
    // Sorting.
    // TODO(erez): Support sorting by multiple columns.
    if (this._sortByIndex !== undefined && this._sortDirection !== undefined) {
      if (!(this._sortByIndex in colParams)) {
        console.error(
          'No column in colParams with index sortByIndex: %s',
          this._sortByIndex
        );
        return null;
      }
      colParams[this._sortByIndex].order =
        this._sortDirection === 0 ? 'ORDER_ASC' : 'ORDER_DESC';
    }
    // Paging.
    const pageNum = parseInputAsPositiveInt('_pageNumberInput') || 0;
    const pageSize = parseInputAsPositiveInt('_pageSizeInput') || 0;
    if (!queryValid) {
      return null;
    }
    const startIndex = pageSize * (pageNum - 1);
    return {
      experimentName: this.experimentName,
      allowedStatuses: allowedStatuses,
      colParams: colParams,
      startIndex: startIndex,
      sliceSize: pageSize,
    };
  }
  // We allow sorting by any column of a session group. A column is either a
  // metric or a hyperparameter.
  // For the purpose of sorting, we identify each such column by its index
  // in the list formed by concatenating the metric in _metrics after the
  // hparams in _hparams. This method computes this sorting index of the
  // metric column represented by _metrics[metricIndex].
  _metricSortByIndex(metricIndex) {
    return metricIndex + this._hparams.length;
  }
  _hparamName = tf_hparams_utils.hparamName;
  _metricName = tf_hparams_utils.metricName;
  _prettyPrint = tf_hparams_utils.prettyPrint;
}
