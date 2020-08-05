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
import '@polymer/paper-icon-button';
import {DO_NOT_SUBMIT} from '../tf-imports/polymer.html';
import {DO_NOT_SUBMIT} from '../tf-backend/tf-backend.html';
import {DO_NOT_SUBMIT} from '../tf-card-heading/tf-card-heading.html';
import {DO_NOT_SUBMIT} from '../tf-color-scale/tf-color-scale.html';
import {DO_NOT_SUBMIT} from '../tf-imports/lodash.html';
import {DO_NOT_SUBMIT} from '../tf-line-chart-data-loader/tf-line-chart-data-loader.html';
import '@polymer/paper-icon-button';
import {DO_NOT_SUBMIT} from '../tf-imports/polymer.html';
import {DO_NOT_SUBMIT} from '../tf-backend/tf-backend.html';
import {DO_NOT_SUBMIT} from '../tf-card-heading/tf-card-heading.html';
import {DO_NOT_SUBMIT} from '../tf-color-scale/tf-color-scale.html';
import {DO_NOT_SUBMIT} from '../tf-imports/lodash.html';
import {DO_NOT_SUBMIT} from '../tf-line-chart-data-loader/tf-line-chart-data-loader.html';
@customElement('tf-pr-curve-card')
class TfPrCurveCard extends PolymerElement {
  static readonly template = html`
    <tf-card-heading
      tag="[[tag]]"
      display-name="[[tagMetadata.displayName]]"
      description="[[tagMetadata.description]]"
    ></tf-card-heading>

    <tf-line-chart-data-loader
      x-components-creation-method="[[_xComponentsCreationMethod]]"
      y-value-accessor="[[_yValueAccessor]]"
      tooltip-columns="[[_tooltipColumns]]"
      color-scale="[[_colorScaleFunction]]"
      default-x-range="[[_defaultXRange]]"
      default-y-range="[[_defaultYRange]]"
      smoothing-enabled="[[_smoothingEnabled]]"
      request-manager="[[requestManager]]"
      data-to-load="[[runs]]"
      data-series="[[runs]]"
      load-key="[[tag]]"
      get-data-load-url="[[_dataUrl]]"
      load-data-callback="[[_createProcessDataFunction()]]"
      active="[[active]]"
    ></tf-line-chart-data-loader>

    <div id="buttons-row">
      <paper-icon-button
        selected$="[[_expanded]]"
        icon="fullscreen"
        on-tap="_toggleExpanded"
      ></paper-icon-button>
      <paper-icon-button
        icon="settings-overscan"
        on-tap="_resetDomain"
        title="Reset axes to [0, 1]."
      ></paper-icon-button>
    </div>

    <div id="step-legend">
      <template is="dom-repeat" items="[[_runsWithStepAvailable]]" as="run">
        <div class="legend-row">
          <div
            class="color-box"
            style="background: [[_computeRunColor(run)]];"
          ></div>
          [[run]] is at
          <span class="step-label-text">
            step [[_computeCurrentStepForRun(_runToPrCurveEntry, run)]] </span
          ><br />
          <span class="wall-time-label-text">
            ([[_computeCurrentWallTimeForRun(_runToPrCurveEntry, run)]])
          </span>
        </div>
      </template>
    </div>

    <style>
      :host {
        display: flex;
        flex-direction: column;
        width: 500px;
        margin-right: 10px;
        margin-bottom: 25px;
      }
      :host([_expanded]) {
        width: 100%;
      }
      tf-line-chart-data-loader {
        height: 300px;
        position: relative;
      }
      :host([_expanded]) tf-line-chart-data-loader {
        height: 600px;
      }
      #buttons-row {
        display: flex;
        flex-direction: row;
      }
      #buttons-row paper-icon-button {
        color: #2196f3;
        border-radius: 100%;
        width: 32px;
        height: 32px;
        padding: 4px;
      }
      #buttons-row paper-icon-button[selected] {
        background: var(--tb-ui-light-accent);
      }
      #step-legend {
        box-sizing: border-box;
        font-size: 0.8em;
        max-height: 200px;
        overflow-y: auto;
        padding: 0 0 0 10px;
        width: 100%;
      }
      .legend-row {
        margin: 5px 0 5px 0;
        width: 100%;
      }
      .color-box {
        display: inline-block;
        border-radius: 1px;
        width: 10px;
        height: 10px;
      }
      .step-label-text {
        font-weight: bold;
      }
      .wall-time-label-text {
        color: #888;
        font-size: 0.8em;
      }
    </style>
  `;

  @property({type: Array})
  runs: unknown[];

  @property({type: String})
  tag: string;

  @property({type: Object})
  tagMetadata: object;

  @property({type: Object})
  runToStepCap: object;

  @property({type: Object})
  requestManager: object;

  @property({type: Boolean})
  active: boolean;

  @property({
    type: Boolean,
    reflectToAttribute: true,
  })
  _expanded: boolean = false;

  @property({type: Object})
  _runToPrCurveEntry: object = () => ({});

  @property({type: Object})
  _previousRunToPrCurveEntry: object = () => ({});

  @property({type: Object})
  _runToDataOverTime: object;

  @property({type: Function})
  onDataChange: object;

  @property({type: Object})
  _colorScaleFunction: object = () => ({scale: tf_color_scale.runsColorScale});

  @property({type: Object})
  _canceller: object = () => new tf_backend.Canceller();

  @property({type: Boolean})
  _attached: boolean;

  @property({
    type: Object,
    readOnly: true,
  })
  _xComponentsCreationMethod: object = () => () => {
    const scale = new Plottable.Scales.Linear();
    return {
      scale: scale,
      axis: new Plottable.Axes.Numeric(scale, 'bottom'),
      accessor: (d) => d.recall,
    };
  };

  @property({
    type: Object,
    readOnly: true,
  })
  _yValueAccessor: object = () => (d) => d.precision;

  @property({
    type: Array,
    readOnly: true,
  })
  _tooltipColumns: unknown[] = () => {
    const valueFormatter = vz_chart_helpers.multiscaleFormatter(
      vz_chart_helpers.Y_TOOLTIP_FORMATTER_PRECISION
    );
    const formatValueOrNaN = (x) => (isNaN(x) ? 'NaN' : valueFormatter(x));
    return [
      {
        title: 'Run',
        evaluate: (d) => d.dataset.metadata().name,
      },
      {
        title: 'Threshold',
        evaluate: (d) => formatValueOrNaN(d.datum.thresholds),
      },
      {
        title: 'Precision',
        evaluate: (d) => formatValueOrNaN(d.datum.precision),
      },
      {
        title: 'Recall',
        evaluate: (d) => formatValueOrNaN(d.datum.recall),
      },
      {
        title: 'TP',
        evaluate: (d) => d.datum.true_positives,
      },
      {
        title: 'FP',
        evaluate: (d) => d.datum.false_positives,
      },
      {
        title: 'TN',
        evaluate: (d) => d.datum.true_negatives,
      },
      {
        title: 'FN',
        evaluate: (d) => d.datum.false_negatives,
      },
    ];
  };

  @property({
    type: Array,
    readOnly: true,
  })
  _seriesDataFields: unknown[] = [
    'thresholds',
    'precision',
    'recall',
    'true_positives',
    'false_positives',
    'true_negatives',
    'false_negatives',
  ];

  @property({
    type: Array,
    readOnly: true,
  })
  _defaultXRange: unknown[] = [-0.05, 1.05];

  @property({
    type: Array,
    readOnly: true,
  })
  _defaultYRange: unknown[] = [-0.05, 1.05];

  @property({type: Function})
  _dataUrl: object = function() {
    return (run) => {
      const tag = this.tag;
      return tf_backend.addParams(
        tf_backend.getRouter().pluginRoute('pr_curves', '/pr_curves'),
        {tag, run}
      );
    };
  };

  @property({
    type: Boolean,
    readOnly: true,
  })
  _smoothingEnabled: boolean = false;
  _createProcessDataFunction() {
    // This function is called when data is received from the backend.
    return (chart, run, data) => {
      // The data maps a single run to a series of data. We merge that data
      // with the data already fetched.
      this.set(
        '_runToDataOverTime',
        Object.assign({}, this._runToDataOverTime, data)
      );
    };
  }
  _computeRunColor(run) {
    return this._colorScaleFunction.scale(run);
  }
  attached() {
    // Defer reloading until after we're attached, because that ensures that
    // the requestManager has been set from above. (Polymer is tricky
    // sometimes)
    this._attached = true;
    this.reload();
  }
  @observe('runs', 'tag')
  reload() {
    if (!this._attached) {
      return;
    }
    if (this.runs.length === 0) {
      // There are no selected runs.
      this.set('_runToDataOverTime', {});
      return;
    }
    this.$$('tf-line-chart-data-loader').reload();
  }
  @observe(
    '_runToPrCurveEntry',
    '_previousRunToPrCurveEntry',
    '_setOfRelevantRuns'
  )
  _setChartData() {
    var runToPrCurveEntry = this._runToPrCurveEntry;
    var previousRunToPrCurveEntry = this._previousRunToPrCurveEntry;
    var setOfRelevantRuns = this._setOfRelevantRuns;
    _.forOwn(runToPrCurveEntry, (entry, run) => {
      const previousEntry = previousRunToPrCurveEntry[run];
      if (previousEntry && runToPrCurveEntry[run].step === previousEntry.step) {
        // The PR curve for this run does not need to be updated.
        return;
      }
      if (!setOfRelevantRuns[run]) {
        // Clear this dataset - the user has unselected it.
        this._clearSeriesData(run);
        return;
      }
      this._updateSeriesDataForRun(run, entry);
    });
  }
  _updateSeriesDataForRun(run, entryForOneStep) {
    // Reverse the values so they are plotted in order. The logic within
    // the line chart for associating information to show in the tooltip
    // with points in the chart assumes that the series data is ordered
    // by the variable on the X axis. If the values are not in order,
    // tooltips will not work because the tooltip will always be stuck on
    // one side of the chart.
    const fieldsToData = _.reduce(
      this._seriesDataFields,
      (result, field) => {
        result[field] = entryForOneStep[field].slice().reverse();
        return result;
      },
      {}
    );
    // The number of series data is equal to the number of entries in any of
    // the fields. We just use the first field to gauge the length.
    const seriesData = new Array(
      fieldsToData[this._seriesDataFields[0]].length
    );
    // Create a list of data for visualization.
    for (let i = 0; i < seriesData.length; i++) {
      seriesData[i] = _.mapValues(fieldsToData, (values) => values[i]);
    }
    const loader = this.$$('tf-line-chart-data-loader');
    loader.setSeriesData(run, seriesData);
    loader.commitChanges();
  }
  _clearSeriesData(run) {
    // Clears data for a run in the chart.
    const loader = this.$$('tf-line-chart-data-loader');
    loader.setSeriesData(run, []);
    loader.commitChanges();
  }
  @observe('_runToDataOverTime', 'runToStepCap')
  _updateRunToPrCurveEntry() {
    var runToDataOverTime = this._runToDataOverTime;
    var runToStepCap = this.runToStepCap;
    const runToEntry = {};
    _.forOwn(runToDataOverTime, (entries, run) => {
      if (!entries || !entries.length) {
        return;
      }
      runToEntry[run] = this._computeEntryClosestOrEqualToStepCap(
        runToStepCap[run],
        entries
      );
    });
    // Set the previous PR curve entry so we can later compare and only
    // redraw for runs that changed in step.
    this.set('_previousRunToPrCurveEntry', this._runToPrCurveEntry);
    this.set('_runToPrCurveEntry', runToEntry);
  }
  @observe('_runToDataOverTime')
  _notifyDataChange() {
    var runToDataOverTime = this._runToDataOverTime;
    if (this.onDataChange) {
      this.onDataChange(runToDataOverTime);
    }
  }
  _computeEntryClosestOrEqualToStepCap(stepCap, entries) {
    const entryIndex = Math.min(
      _.sortedIndex(entries.map((entry) => entry.step), stepCap),
      entries.length - 1
    );
    return entries[entryIndex];
  }
  @computed('runs', '_runToPrCurveEntry')
  get _runsWithStepAvailable(): unknown[] {
    var runs = this.runs;
    var actualPrCurveEntryPerRun = this._runToPrCurveEntry;
    return _.filter(runs, (run) => actualPrCurveEntryPerRun[run]).sort();
  }
  @computed('_runsWithStepAvailable')
  get _setOfRelevantRuns(): object {
    var runsWithStepAvailable = this._runsWithStepAvailable;
    const setOfRelevantRuns = {};
    _.forEach(runsWithStepAvailable, (run) => {
      setOfRelevantRuns[run] = true;
    });
    return setOfRelevantRuns;
  }
  _computeCurrentStepForRun(runToPrCurveEntry, run) {
    // If there is no data for the run, then the run is not being shown, so
    // the return value is not used. We return null as a reasonable value.
    const entry = runToPrCurveEntry[run];
    return entry ? entry.step : null;
  }
  _computeCurrentWallTimeForRun(runToPrCurveEntry, run) {
    const entry = runToPrCurveEntry[run];
    // If there is no data for the run, then the run is not being shown, so
    // the return value is not used. We return null as a reasonable value.
    if (!entry) {
      return null;
    }
    return new Date(entry.wall_time * 1000).toString();
  }
  _toggleExpanded(e) {
    this.set('_expanded', !this._expanded);
    this.redraw();
  }
  _resetDomain() {
    this.$$('tf-line-chart-data-loader').resetDomain();
  }
  redraw() {
    this.$$('tf-line-chart-data-loader').redraw();
  }
}
