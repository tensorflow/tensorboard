<!--
@license
Copyright 2017 The TensorFlow Authors. All Rights Reserved.
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

<link rel="import" href="../paper-slider/paper-slider.html" />
<link rel="import" href="../tf-imports/polymer.html" />
<link rel="import" href="../tf-card-heading/tf-card-heading.html" />
<link rel="import" href="../tf-color-scale/tf-color-scale.html" />
<link rel="import" href="../tf-imports/lodash.html" />

<!--
  Renders a UI for selecting a step.
-->
<dom-module id="tf-pr-curve-steps-selector">
  <template>
    <template is="dom-repeat" items="[[_runsWithSliders]]" as="run">
      <div class="run-widget">
        <div class="run-display-container">
          <div
            class="run-color-box"
            style="background:[[_computeColorForRun(run)]];"
          ></div>
          <div class="run-text">
            [[run]]
          </div>
        </div>
        <div class="step-display-container">
          [[_computeTimeTextForRun(runToAvailableTimeEntries, _runToStepIndex,
          run, timeDisplayType)]]
        </div>
        <paper-slider
          data-run$="[[run]]"
          step="1"
          type="number"
          min="0"
          max="[[_computeMaxStepIndexForRun(runToAvailableTimeEntries, run)]]"
          value="[[_getStep(_runToStepIndex, run)]]"
          on-immediate-value-changed="_sliderValueChanged"
        ></paper-slider>
      </div>
    </template>
    <style>
      .run-widget {
        margin: 10px 0 0 0;
      }
      paper-slider {
        margin: -8px 0 0 -15px;
        width: 100%;
      }
      .step-display-container {
        font-size: 0.9em;
        margin: 0 15px 0 0;
      }
      .run-text {
        display: inline-block;
      }
      .run-color-box {
        width: 12px;
        height: 12px;
        border-radius: 3px;
        display: inline-block;
      }
    </style>
  </template>
  <script>
    Polymer({
      is: 'tf-pr-curve-steps-selector',
      properties: {
        // A list of selected runs.
        runs: Array,
        // A mapping between run and list of steps to use for the slider for that
        // run. This component indexes into this object to retrieve the steps.
        runToAvailableTimeEntries: Object,
        // The object mapping run to step. This object is updated by this
        // component when the selected step for the run changes, so this property
        // should be upward bound.
        runToStep: {
          type: Object,
          notify: true,
          computed:
            '_computeRunToStep(runToAvailableTimeEntries, _runToStepIndex)',
        },
        timeDisplayType: String,
        // A mapping between run and slider index.
        _runToStepIndex: {
          type: Object,
          value: () => ({}),
        },
        _runsWithSliders: {
          type: Array,
          computed: '_computeRunsWithSliders(runs, runToAvailableTimeEntries)',
        },
      },
      observers: ['_updateStepsForNewRuns(runToAvailableTimeEntries)'],
      _computeColorForRun(run) {
        return tf_color_scale.runsColorScale(run);
      },
      _computeTimeTextForRun(
        runToAvailableTimeEntries,
        runToStepIndex,
        run,
        timeDisplayType
      ) {
        const stepIndex = runToStepIndex[run];
        if (!_.isNumber(stepIndex)) {
          // The step is not known yet.
          return '';
        }

        const entries = runToAvailableTimeEntries[run];
        if (!entries) {
          // No PR curve data has been received from the server yet.
          return '';
        }

        const value = entries[stepIndex][timeDisplayType];
        if (timeDisplayType === 'step') {
          return `step ${value}`;
        } else if (timeDisplayType === 'relative') {
          // Return the time using the units that are most apt.
          if (value < 1) {
            return `${(value * 1000).toFixed(2)} ms`;
          }
          return `${value.toFixed(2)} s`;
        } else if (timeDisplayType === 'wall_time') {
          return new Date(value * 1000).toString();
        }
        throw new Error(
          `The display type of ${timeDisplayType} is not recognized.`
        );
      },
      _sliderValueChanged(event) {
        const run = event.target.dataset.run;
        const val = event.target.immediateValue;
        const newRunToStepIndex = Object.assign({}, this._runToStepIndex);
        // Slider emits a changed event before it goes away with an
        // immediateValue of NaN.
        if (isNaN(val)) {
          delete newRunToStepIndex[run];
        } else {
          newRunToStepIndex[run] = event.target.immediateValue;
        }
        this._runToStepIndex = newRunToStepIndex;
      },
      _computeMaxStepIndexForRun(runToAvailableTimeEntries, run) {
        const entries = runToAvailableTimeEntries[run];
        return entries && entries.length ? entries.length - 1 : 0;
      },
      _updateStepsForNewRuns(runToAvailableTimeEntries) {
        // The mapping from run to available time entries just changed.
        const newRunToStepIndex = Object.assign({}, this._runToStepIndex);
        _.forOwn(runToAvailableTimeEntries, (entries, run) => {
          if (!_.isNumber(newRunToStepIndex[run])) {
            // This run had previously lacked a slider. Initially set the slider
            // for the run to point to the last step.
            newRunToStepIndex[run] = entries.length - 1;
          }
        });
        this._runToStepIndex = newRunToStepIndex;
      },
      _getStep(runToStepIndex, run) {
        if (!this._runToStepIndex) return 0;
        return this._runToStepIndex[run];
      },
      _computeRunToStep(runToAvailableTimeEntries, runToStepIndex) {
        const runToStep = {};
        _.forOwn(runToStepIndex, (index, run) => {
          const entries = runToAvailableTimeEntries[run];
          if (!entries) {
            return;
          }
          runToStep[run] = entries[index].step;
        });
        return runToStep;
      },
      _computeRunsWithSliders(runs, runToAvailableTimeEntries) {
        // Only create sliders for selected runs with steps available.
        return runs.filter((r) => runToAvailableTimeEntries[r]);
      },
    });
  </script>
</dom-module>
