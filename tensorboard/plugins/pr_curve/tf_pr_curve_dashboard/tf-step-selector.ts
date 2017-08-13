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

Polymer({
  is: "tf-step-selector",
  properties: {
    // An array of numbers that are step values.
    steps: Array,
    // The current step. Other components should 2-way bind to this property.
    currentStep: {
      type: Number,
      notify: true,
      computed: '_computeCurrentStep(_stepIndex)',
    },
    _stepText: {
      type: String,
      computed: '_computeStepText(currentStep)',
    },
    _maxStepIndex: {
      type: Number,
      computed: '_computeMaxStepIndex(steps)',
    },
    _stepIndex: Number,
  },
  observers: [
    '_stepsListChanged(steps)',
  ],
  _computeCurrentStep(steps, stepIndex) {
    if (!steps || stepIndex >= steps.length) {
      return null;
    }
    return this.steps[stepIndex];
  },
  _computeStepText(currentStep) {
    if (_.isNumber(currentStep)) {
      return String(currentStep);
    }
    return '';
  },
  _stepsListChanged(steps) {
    if (!steps || !steps.length) {
      return;
    }
    // Set to the last index.
    this.set('_stepIndex', steps.length - 1);
  },
  _computeMaxStepIndex(steps) {
    return steps && steps.length ? steps.length - 1 : 0;
  },
});
