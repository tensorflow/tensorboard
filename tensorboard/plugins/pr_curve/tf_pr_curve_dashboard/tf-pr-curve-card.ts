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
/* tslint:disable:no-namespace variable-name */

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

    // The card will display the PR curve at this step or the one closest to it,
    // but less than it.
    stepCap: Number,
    
    _runToData: Object,
    /** @type {Function} */
    _colorScaleFunction: {
      type: Object,  // function: string => string
      value: () => ({scale: runsColorScale}),
    },
    _runColor: {
      type: String,
      computed: "_computeRunColor(run)",
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
    }
  },
  observers: [
      "reload(run, tag)",
      "_runsChanged(_attached, runs.*)",
      "_setChartData(_runToData, stepCap)",
  ],
  _computeRunColor(run) {
    return this._colorScaleFunction(run);
  },
  _serializedRunToPrCurveData(runToPrCurveData) {
    return JSON.stringify(runToPrCurveData);
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
    let url = router.pluginRoute("pr_curve", "/pr_curves");
    url += url.indexOf('?') > -1 ? '&' : '?';
    url += `tag=${this.tag}&runs=${this.runs.join(',')}`;
    const updateData = this._canceller.cancellable(result => {
      if (result.cancelled) {
        return;
      }

      // This is a mapping between run and data.
      const runToData = result.value;
      this.set('_runToData', runToData);
      this.fire('data-updated', {
        'runToData': runToData,
      });
    });
    this.requestManager.request(url).then(updateData);
  },
  _setChartData(runToData, stepCap) {
    if (!runToData || !_.isNumber(stepCap)) {
      return;
    }

    _.forOwn(runToData, (entries, run) => {
      if (!entries || !entries.length) {
        return;
      }

      let seriesData: PrCurvePoint[] = [];
      let entriesIndex = entries.length - 1;
      while (entriesIndex > 0) {
        if (entries[entriesIndex].step <= stepCap) {
          // This is the rightmost entry closest (or equal to) the step cap.
          break;
        }
        entriesIndex--;
      }
      const entry = entries[entriesIndex];
      this.fire('run-step-updated', {
        'run': run,
        'step': entry.step,
      });

      // Reverse the values so they are plotted in order, which allows for
      // tool tips.
      entry.precision.reverse();
      entry.recall.reverse();

      for (let i = 0; i < entry.precision.length; i++) {
        seriesData.push({
          scalar: entry.precision[i],
          recall: entry.recall[i],
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
  _computeLineChartStyle(loading) {
    return loading ? 'opacity: 0.3;' : '';
  },
});
