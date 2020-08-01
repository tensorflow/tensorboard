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
import '@polymer/paper-checkbox';
import '@polymer/paper-dropdown-menu';
import '@polymer/paper-listbox';
import '@polymer/paper-input';
import '@polymer/paper-item';
import {DO_NOT_SUBMIT} from '../tf-imports/polymer.html';
import {DO_NOT_SUBMIT} from '../tf-backend/tf-backend.html';
import {DO_NOT_SUBMIT} from '../tf-hparams-utils/tf-hparams-utils.html';
import {DO_NOT_SUBMIT} from '../tf-imports/lodash.html';
import {DO_NOT_SUBMIT} from '../tf-imports/vaadin-split-layout.html';
import '@polymer/paper-checkbox';
import '@polymer/paper-dropdown-menu';
import '@polymer/paper-listbox';
import '@polymer/paper-input';
import '@polymer/paper-item';
import {DO_NOT_SUBMIT} from '../tf-imports/polymer.html';
import {DO_NOT_SUBMIT} from '../tf-backend/tf-backend.html';
import {DO_NOT_SUBMIT} from '../tf-hparams-utils/tf-hparams-utils.html';
import {DO_NOT_SUBMIT} from '../tf-imports/lodash.html';
import {DO_NOT_SUBMIT} from '../tf-imports/vaadin-split-layout.html';
'use strict';
@customElement('tf-hparams-query-pane')
class TfHparamsQueryPane extends PolymerElement {
  static readonly template = html`
    <div class="pane">
      <vaadin-split-layout vertical="">
        <vaadin-split-layout vertical="" id="hyperparameters-metrics-statuses">
          <vaadin-split-layout vertical="" id="hyperparameters-metrics">
            <div class="section hyperparameters">
              <div class="section-title">Hyperparameters</div>
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
                  <template is="dom-if" if="[[hparam.filter.regexp]]">
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
            <div class="section metrics">
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
          </vaadin-split-layout>
          <div class="section status">
            <div class="section-title">Status</div>
            <template is="dom-repeat" items="[[_statuses]]" as="status">
              <paper-checkbox
                checked="{{status.allowed}}"
                on-change="_queryServer"
              >
                [[status.displayName]]
              </paper-checkbox>
            </template>
          </div>
        </vaadin-split-layout>
        <vaadin-split-layout vertical="" id="sorting-paging">
          <div class="section sorting">
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
                  <paper-item>
                    [[_hparamName(hparam.info)]]
                  </paper-item>
                </template>
                <template is="dom-repeat" items="[[_metrics]]" as="metric">
                  <paper-item>
                    [[_metricName(metric.info)]]
                  </paper-item>
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
          <vaadin-split-layout vertical="" id="paging-download">
            <div class="section paging">
              <div class="section-title">Paging</div>
              <div>
                Number of matching session groups:
                [[_totalSessionGroupsCountStr]]
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
                  <div slot="suffix" class="page-suffix">
                    / [[_pageCountStr]]
                  </div>
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
            <div class="section download">
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
          </vaadin-split-layout>
        </vaadin-split-layout>
      </vaadin-split-layout>
    </div>
    <style>
      .pane {
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      .section {
        margin: 5px 10px 5px 10px;
        overflow-y: auto;
      }
      .section-title {
        display: block;
        font-weight: bold;
        text-decoration: underline;
        margin-bottom: 7px;
      }
      #hyperparameters-metrics-statuses {
        flex-basis: 70%;
        flex-shrink: 1;
        flex-grow: 1;
      }
      #hyperparameters-metrics {
        flex-basis: 90%;
        flex-shrink: 1;
        flex-grow: 1;
      }
      .hyperparameters {
        flex-basis: auto;
        flex-shrink: 1;
        flex-grow: 1;
      }
      .metrics {
        flex-basis: auto;
        flex-shrink: 1;
        flex-grow: 1;
      }
      .statuses {
        flex-basis: auto;
        flex-shrink: 0;
        flex-grow: 0;
      }
      #sorting-paging {
        flex-basis: 30%;
        flex-shrink: 0;
        flex-grow: 0;
      }
      #paging-download {
        flex-basis: 90%;
        flex-shrink: 1;
        flex-grow: 1;
      }
      .sorting {
        flex-basis: auto;
        flex-shrink: 0;
        flex-grow: 0;
      }
      .paging {
        flex-basis: auto;
        flex-shrink: 0;
        flex-grow: 0;
      }
      .download {
        flex-basis: auto;
        flex-shrink: 0;
        flex-grow: 0;
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
  @property({type: Object})
  backend: object;
  @property({type: String})
  experimentName: string;
  @property({
    type: Object,
    readOnly: true,
    notify: true,
  })
  configuration: object = () => {
    return {
      schema: {
        hparamColumns: [],
        metricColumns: [],
      },
      columnsVisibility: [],
      visibleSchema: {
        hparamInfos: [],
        metricInfos: [],
      },
    };
  };
  @property({
    type: Array,
    readOnly: true,
    notify: true,
  })
  sessionGroups: unknown[] = () => [];
  @property({
    type: Boolean,
    notify: true,
  })
  dataLoadedWithNonEmptyHparams: boolean = false;
  @property({
    type: Boolean,
    notify: true,
  })
  dataLoadedWithEmptyHparams: boolean = false;
  @property({type: Object})
  _experiment: object;
  @property({type: Array})
  _hparams: unknown[];
  @property({type: Array})
  _metrics: unknown[];
  @property({
    type: Array,
  })
  _statuses: unknown[] = () => {
    return [
      {value: 'STATUS_UNKNOWN', displayName: 'Unknown', allowed: true},
      {value: 'STATUS_SUCCESS', displayName: 'Success', allowed: true},
      {value: 'STATUS_FAILURE', displayName: 'Failure', allowed: true},
      {value: 'STATUS_RUNNING', displayName: 'Running', allowed: true},
    ];
  };
  @property({
    type: Object,
  })
  _getExperimentResolved: object = function() {
    return new Promise((resolve) => {
      this._resolveGetExperiment = resolve;
    });
  };
  @property({type: Function})
  _resolveGetExperiment: object;
  @property({
    type: Object,
  })
  _listSessionGroupsCanceller: object = () => {
    return new tf_backend.Canceller();
  };
  @property({type: Number})
  _sortByIndex: number;
  @property({type: Number})
  _sortDirection: number;
  @property({
    type: Object,
  })
  _pageSizeInput: object = {value: '100', invalid: false};
  @property({
    type: Object,
  })
  _pageNumberInput: object = {value: '1', invalid: false};
  @property({
    type: String,
  })
  _pageCountStr: string = '?';
  @property({type: String})
  _totalSessionGroupsCountStr: string;
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
    const utils = tf.hparams.utils;
    if (
      utils.isNullOrUndefined(this.backend) ||
      utils.isNullOrUndefined(this.experimentName)
    ) {
      return;
    }
    const experimentRequest = {
      experimentName: this.experimentName,
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
        this._experiment.hparamInfos.length > 0 &&
        this._experiment.metricInfos &&
        this._experiment.metricInfos.length > 0
    );
    this.set('dataLoadedWithNonEmptyHparams', result);
    this.set('dataLoadedWithEmptyHparams', !result);
  }
  // Updates the _hparams property from the _experiment property.
  _computeHParams() {
    const result = [];
    const kNumHParamsToDisplayByDefault = 5;
    this._experiment.hparamInfos.forEach((anInfo, index) => {
      const hparam = {
        info: anInfo,
        displayed: index < kNumHParamsToDisplayByDefault,
        filter: {},
      };
      if (hparam.info.hasOwnProperty('domainDiscrete')) {
        hparam.filter.domainDiscrete = [];
        hparam.info.domainDiscrete.forEach((val) => {
          hparam.filter.domainDiscrete.push({
            value: val,
            checked: true,
          });
        });
      } else if (hparam.info.type === 'DATA_TYPE_BOOL') {
        hparam.filter.domainDiscrete = [
          {
            value: false,
            checked: true,
          },
          {
            value: true,
            checked: true,
          },
        ];
      } else if (hparam.info.type === 'DATA_TYPE_FLOAT64') {
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
      } else if (hparam.info.type === 'DATA_TYPE_STRING') {
        hparam.filter.regexp = '';
      } else {
        console.warn('unknown hparam.info.type: %s', hparam.info.type);
      }
      result.push(hparam);
    });
    this.set('_hparams', result);
  }
  // Updates the _metrics property from the _experiment property.
  _computeMetrics() {
    const result = [];
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
      this._setConfiguration({
        schema: this._computeSchema(),
        columnsVisibility: this._computeColumnsVisibility(),
        visibleSchema: this._computeVisibleSchema(),
      });
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
      this._listSessionGroupsCanceller.cancellable(({value, cancelled}) => {
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
        tf.hparams.utils.setArrayObservably(
          this,
          'sessionGroups',
          value.sessionGroups
        );
      })
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
    function parseInputInterval(inputIntervalPath) {
      const minValueStr = _this.get(inputIntervalPath + '.min.value');
      console.assert(minValueStr !== undefined);
      // The protobuffer JSON mapping maps the strings "-Infinity" and
      // "Infinity" to the floating-point infinity and -infinity values.
      const minValue = minValueStr === '' ? '-Infinity' : +minValueStr;
      _this.set(inputIntervalPath + '.min.invalid', isNaN(minValue));
      queryValid = queryValid && !isNaN(minValue);
      const maxValueStr = _this.get(inputIntervalPath + '.max.value');
      console.assert(maxValueStr !== undefined);
      const maxValue = maxValueStr === '' ? 'Infinity' : +maxValueStr;
      _this.set(inputIntervalPath + '.max.invalid', isNaN(maxValue));
      queryValid = queryValid && !isNaN(maxValue);
      if (isNaN(minValue) || isNaN(maxValue)) {
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
    let colParams = [];
    // Build the hparams filters in the request.
    this._hparams.forEach((hparam, index) => {
      let colParam = {hparam: hparam.info.name};
      if (hparam.filter.domainDiscrete) {
        colParam.filterDiscrete = [];
        hparam.filter.domainDiscrete.forEach((filterVal) => {
          if (filterVal.checked) {
            colParam.filterDiscrete.push(filterVal.value);
          }
        });
      } else if (hparam.filter.interval) {
        colParam.filterInterval = parseInputInterval(
          '_hparams.' + index + '.filter.interval'
        );
      } else if (hparam.filter.regexp) {
        colParam.filterRegexp = hparam.filter.regexp;
      } else {
        console.error(
          'hparam.filter with no domainDiscrete, interval or regexp' +
            ' properties set: %s',
          hparam
        );
        return null;
      }
      colParams.push(colParam);
    });
    // Build the metric filters in the request.
    this._metrics.forEach((metric, index) => {
      let colParam = {
        metric: metric.info.name,
        filterInterval: parseInputInterval(
          '_metrics.' + index + '.filter.interval'
        ),
      };
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
    const pageNum = parseInputAsPositiveInt('_pageNumberInput');
    const pageSize = parseInputAsPositiveInt('_pageSizeInput');
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
  _hparamName: tf.hparams.utils.hparamName;
  _metricName: tf.hparams.utils.metricName;
  _prettyPrint: tf.hparams.utils.prettyPrint;
}
