/* Copyright 2018 The TensorFlow Authors. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the 'License');
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an 'AS IS' BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/
namespace tf_data_selector {

Polymer({
  is: 'tf-data-selector',
  properties: {
    experiments: Array,

    experimentColors: {
      type: Array,
      value: () => [],
    },

    // TODO(stephanwlee): Figure out how to communicate group selection to
    // plugins. It should be some data structure, not experiments, runs, and
    // tags all separted.
    runs: Array,

    runsColors: {
      type: Array,
      value: () => [],
    },

    selectedRuns: {
      type: Array,
      notify: true,
      value: () => [],
    },

    runSelectionState: {
      type: Object,
      observer: '_storeRunSelectionState',
      value: () => tf_storage.getObject('runSelectionState') || {},
    },

    runRegexInput: {
      type: String,
      value: tf_storage.getStringInitializer('regexInput', {defaultValue: ''}),
      observer: '_runRegexInput',
    },
  },

  get expsStore() {
    return tf_backend.experimentsStore;
  },

  get runsStore() {
    return tf_backend.runsStore;
  },

  attached() {
    this._updateExpKey = this.expsStore.addListener(() => this._updateExps());
    this._updateRunKey = this.runsStore.addListener(() => this._updateRuns());

    this._updateExps();
    this._updateRuns();
  },

  detached() {
    this.expsStore.removeListenerByKey(this._updateExpKey);
    this.runsStore.removeListenerByKey(this._updateRunKey);
  },

  _updateExps() {
    const expNames = this.expsStore.getExperiments().map(({name}) => name);
    this.set('experiments', expNames);
  },

  _updateRuns() {
    const runNames = this.runsStore.getRuns();
    this.set('runs', runNames);
  },

  _storeRunSelectionState:
      tf_storage.getObjectObserver('runSelectionState', {defaultValue: {}}),

  _runRegexInput:
      tf_storage.getStringObserver('regexInput', {defaultValue: ''}),

});

}  // namespace tf_data_selector
