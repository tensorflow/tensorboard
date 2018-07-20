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
    _showExperimentAdder: {
      reflectToAttribute: true,
      type: Boolean,
      value: false,
    },

    _experiments: Array,

    _experimentColoring: {
      type: Object,
      value: {
        getColor: tf_color_scale.experimentsColorScale,
      },
    },

    _selectedExperiments: {
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
  },

  get expsStore() {
    return tf_backend.experimentsStore;
  },

  attached() {
    this._updateExpKey = this.expsStore.addListener(() => this._updateExps());
    this._updateExps();
  },

  detached() {
    this.expsStore.removeListenerByKey(this._updateExpKey);
  },

  _updateExps() {
    const expNames = this.expsStore.getExperiments().map(({name}) => name);
    this.set('_experiments', expNames);
  },

  _toggleExperimentAdder() {
    this._showExperimentAdder = !this._showExperimentAdder;
  },

  _addExperiments() {
    this._showExperimentAdder = false;
  },

  _getAddLabel(_) {
    switch (this._selectedExperiments.length) {
      case 0:
      case 1:
        return 'Add';
      default:
        return 'Add All'
    }
  },

});

}  // namespace tf_data_selector
