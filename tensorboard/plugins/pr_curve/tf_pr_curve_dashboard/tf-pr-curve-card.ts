/* Copyright 2017 The TensorFlow Authors. All Rights Reserved.

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

"use strict";
import {Canceller} from "../tf-backend/canceller.js";
import {getRouter} from "../tf-backend/router.js";
import {runsColorScale} from "../tf-color-scale/colorScale.js";
import * as ChartHelpers from '../vz-line-chart/vz-chart-helpers.js';

interface PrCurvePoint {
  scalar: number;
  recall: number;
}

Polymer({
  is: "tf-pr-curve-card",
  properties: {
    runs: Array,
    tag: String,
    // For each run, the card will display the PR curve at this step or the one
    // closest to it, but less than it.
    stepCapPerRun: Object,
    // This maps a run to the actual step that is presented in the PR curve.
    _actualStepPerRun: {
      type: Object,
      value: {},
    },
    // A list of runs with an available step. Used to populate the table of
    // steps per run.
    _runsWithStepAvailable: {
      type: Array,
      computed: "_computeRunsWithStepAvailable(_actualStepPerRun)",
    },
    _runToData: Object,
    /** @type {Function} */
    _colorScaleFunction: {
      type: Object,  // function: string => string
      value: () => ({scale: runsColorScale}),
    },
    requestManager: Object,
    _canceller: {
      type: Object,
      value: () => new Canceller(),
    },
    _attached: Boolean,
    // The value field is a function that returns a function because Polymer
    // will actually call the value field if the field is a function. However,
    // we actually want the value itself to be a function.
    _xComponentsCreationMethod: {
      type: Object,
      value: () => (() => {
        const scale = new Plottable.Scales.Linear();
        return {
          scale: scale,
          axis: new Plottable.Axes.Numeric(scale, 'bottom'),
          accessor: (d: PrCurvePoint) => d.recall,
        };
      }),
      readOnly: true,
    },
  },
  observers: [
      'reload(run, tag)',
      '_runsChanged(_attached, runs.*)',
      '_setChartData(_runToData, stepCapPerRun)',
  ],
  _computeRunColor(run) {
    return this._colorScaleFunction(run);
  },
  attached() {
    // Defer reloading until after we're attached, because that ensures that
    // the requestManager has been set from above. (Polymer is tricky
    // sometimes)
    this._attached = true;
    this.reload();
  },
  reload() {
    if (!this._attached) {
      return;
    }
    this._canceller.cancelAll();
    const router = getRouter();
    let url = router.pluginRoute('pr_curves', '/pr_curves');
    url += url.indexOf('?') > -1 ? '&' : '?';
    const urlRunsPortion = this.runs.map(r => `run=${r}`).join('&');
    url += `tag=${this.tag}&${urlRunsPortion}`;
    const updateData = this._canceller.cancellable(result => {
      if (result.cancelled) {
        return;
      }

      const runToData = result.value;
      this.set('_runToData', runToData);
      this.fire('data-updated', {
        'runToData': runToData,
      });
    });
    this.requestManager.request(url).then(updateData);
  },
  _setChartData(runToData, stepCapPerRun) {
    if (!runToData) {
      return;
    }

    _.forOwn(runToData, (entries, run) => {
      if (!entries || !entries.length) {
        return;
      }

      const stepCap = stepCapPerRun[run];
      let entriesIndex = entries.length - 1;
      while (entriesIndex > 0) {
        if (entries[entriesIndex].step <= stepCap) {
          // This is the rightmost entry closest (or equal to) the step cap.
          break;
        }
        entriesIndex--;
      }
      const entry = entries[entriesIndex];

      if (this._actualStepPerRun[run] != entry.step) {
        // Update the step shown for this run within the card.
        this._actualStepPerRun[run] = entry.step;
        this.set('_actualStepPerRun', this._actualStepPerRun);
      }

      // Reverse the values so they are plotted in order, which allows for
      // tool tips.
      const precision = entry.precision.slice().reverse();
      const recall = entry.recall.slice().reverse();

      let seriesData: PrCurvePoint[] = [];
      for (let i = 0; i < entry.precision.length; i++) {
        seriesData.push({
          scalar: precision[i],
          recall: recall[i],
        });
      }
      this.$$('vz-line-chart').setSeriesData(run, seriesData);
    });
  },
  _runsChanged(attached, runsUpdateRecord) {
    if (!attached) {
      return;
    }
    this.$$('vz-line-chart').setVisibleSeries(this.runs);
    this.reload();
  },
  _computeRunsWithStepAvailable(actualStepPerRun) {
    return _.keys(actualStepPerRun).sort();
  },
  _computeCurrentStepForRun(actualStepPerRun, run) {
    return actualStepPerRun[run];
  },
});
