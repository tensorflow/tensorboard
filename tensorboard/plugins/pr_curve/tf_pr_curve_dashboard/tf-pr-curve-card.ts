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
import {html, PolymerElement} from '@polymer/polymer';
import * as _ from 'lodash';
import * as Plottable from 'plottable';
import '../../../components/polymer/irons_and_papers';
import {Canceller} from '../../../components/tf_backend/canceller';
import {RequestManager} from '../../../components/tf_backend/requestManager';
import {getRouter} from '../../../components/tf_backend/router';
import {addParams} from '../../../components/tf_backend/urlPathHelpers';
import '../../../components/tf_card_heading/tf-card-heading';
import {runsColorScale} from '../../../components/tf_color_scale/colorScale';
import {RequestDataCallback} from '../../../components/tf_dashboard_common/data-loader-behavior';
import '../../../components/tf_line_chart_data_loader/tf-line-chart-data-loader';
import * as vz_chart_helpers from '../../../components/vz_chart_helpers/vz-chart-helpers';

type RunItem = string;

interface PrCurveDatum {
  wall_time: number;
  step: number;
  precision: number[];
  recall: number[];
}

@customElement('tf-pr-curve-card')
export class TfPrCurveCard extends PolymerElement {
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
      request-data="[[_requestData]]"
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
  runs: string[];

  @property({type: String})
  tag: string;

  @property({type: Object})
  tagMetadata: object;

  @property({type: Object})
  runToStepCap: object;

  @property({type: Object})
  requestManager: RequestManager;

  @property({type: Boolean})
  active: boolean;

  @property({
    type: Boolean,
    reflectToAttribute: true,
  })
  _expanded: boolean = false;

  @property({type: Object})
  _runToPrCurveEntry: object = {};

  @property({type: Object})
  _previousRunToPrCurveEntry: object = {};

  @property({type: Object})
  _runToDataOverTime: object;

  @property({type: Object})
  onDataChange: (unknown) => void;

  @property({type: Object})
  _colorScaleFunction: object = {scale: runsColorScale};

  @property({type: Object})
  _canceller: Canceller = new Canceller();

  @property({type: Boolean})
  _attached: boolean;

  @property({type: Object})
  _xComponentsCreationMethod = () => {
    const scale = new Plottable.Scales.Linear();
    return {
      scale: scale,
      axis: new Plottable.Axes.Numeric(scale, 'bottom'),
      accessor: (d) => d.recall,
    };
  };

  @property({type: Object})
  _yValueAccessor = (d) => d.precision;

  @property({type: Array})
  _tooltipColumns: unknown[] = (() => {
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
  })();

  @property({type: Array})
  _seriesDataFields: string[] = [
    'thresholds',
    'precision',
    'recall',
    'true_positives',
    'false_positives',
    'true_negatives',
    'false_negatives',
  ];

  @property({type: Array})
  _defaultXRange: number[] = [-0.05, 1.05];

  @property({type: Array})
  _defaultYRange: number[] = [-0.05, 1.05];

  @property({type: Object})
  _requestData: RequestDataCallback<RunItem, PrCurveDatum[]> = (
    items,
    onLoad,
    onFinish
  ) => {
    const router = getRouter();
    const baseUrl = router.pluginRoute('pr_curves', '/pr_curves');
    Promise.all(
      items.map((item) => {
        const run = item;
        const tag = this.tag;
        const url = addParams(baseUrl, {tag, run});
        return this.requestManager
          .request(url)
          .then((data) => void onLoad({item, data}));
      })
    ).finally(() => void onFinish());
  };

  @property({type: Boolean})
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
    return runsColorScale(run);
  }

  connectedCallback() {
    super.connectedCallback();
    // Defer reloading until after we're attached, because that ensures that
    // the requestManager has been set from above. (Polymer is tricky
    // sometimes)
    this._attached = true;
    this.reload();
  }

  _getChartDataLoader() {
    // tslint:disable-next-line:no-unnecessary-type-assertion
    return this.shadowRoot?.querySelector('tf-line-chart-data-loader') as any; // TfLineChartDataLoader
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
    this._getChartDataLoader().reload();
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
      if (!setOfRelevantRuns[run as string]) {
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
    const loader = this._getChartDataLoader();
    loader.setSeriesData(run, seriesData);
    loader.commitChanges();
  }

  _clearSeriesData(run) {
    // Clears data for a run in the chart.
    const loader = this._getChartDataLoader();
    loader.setSeriesData(run, []);
    loader.commitChanges();
  }

  @observe('_runToDataOverTime', 'runToStepCap')
  _updateRunToPrCurveEntry() {
    var runToDataOverTime = this._runToDataOverTime;
    var runToStepCap = this.runToStepCap;
    const runToEntry = {};
    _.forOwn(runToDataOverTime, (entries, run) => {
      if (!entries || !(entries as unknown[]).length) {
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
      _.sortedIndex(
        entries.map((entry) => entry.step),
        stepCap
      ),
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
      setOfRelevantRuns[run as string] = true;
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
    this._getChartDataLoader().resetDomain();
  }

  redraw() {
    this._getChartDataLoader().redraw();
  }
}
