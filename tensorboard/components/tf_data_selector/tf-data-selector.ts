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

// Ids are positive longs.
const NO_EXPERIMENT_ID = -1;

Polymer({
  is: 'tf-data-selector',
  properties: {
    _dataReady: {
      type: Boolean,
      value: false,
    },

    _allExperiments: {
      type: Array,
      value: (): Array<tf_backend.Experiment> => [],
    },

    _experimentsString: {
      type: String,
      // e = Experiments.
      value: tf_storage.getStringInitializer('e',
          {defaultValue: '', polymerProperty: '_experimentsString'}),
    },

    // Subset of allExperiments user chose and added.
    _experiments: {
      type: Array,
      computed: '_getExperiments(_experimentsString, _allExperiments.*)',
    },

    _enabledExperimentsString: {
      type: String,
      // ee = Enabled Experiments.
      value: tf_storage.getStringInitializer('ee',
          {defaultValue: '', polymerProperty: '_enabledExperimentsString'}),
    },

    _enabledExperiments: {
      type: Object,
      computed: '_getEnabledGroups(_enabledExperimentsString)',
    },

    // TODO(stephanwlee): Add list of active plugin from parent and filter out
    // the unused tag names in the list of selection.

    _allSelections: {
      type: Object,
      value: (): Map<tf_backend.ExperimentId, tf_data_selector.Selection> => {
        return new Map();
      },
    },

    // Output property. It has subset of _allSelections.
    selection: {
      type: Object,
      notify: true,
      readOnly: true,
      value: (): DataSelection => ({
        type: tf_data_selector.Type.WITHOUT_EXPERIMENT,
        selections: [],
      }),
    },
  },

  observers: [
    '_groupStringObserver(_experimentsString)',
    '_enabledExperimentsStringObserver(_enabledExperimentsString)',
    '_pruneAllSelection(_experiments.*)',
    '_setSelectionValue(_enabledExperiments.*, _allSelections.*)',
    '_updateEnabledExperimentsString(_allExperiments.*)',
  ],

  _groupStringObserver: tf_storage.getStringObserver('e',
      {defaultValue: '', polymerProperty: '_experimentsString'}),

  _enabledExperimentsStringObserver: tf_storage.getStringObserver('ee',
      {defaultValue: '', polymerProperty: '_enabledExperimentsString'}),

  attached() {
    this._updateExpKey = tf_backend.experimentsStore
        .addListener(() => this._updateExps());
    this._updateExps();
  },

  detached() {
    tf_backend.experimentsStore.removeListenerByKey(this._updateExpKey);
  },

  _updateExps() {
    this._dataReady = true;
    this.set('_allExperiments', tf_backend.experimentsStore.getExperiments());
  },

  _getExperiments() {
    const lookup = new Map(this._allExperiments.map(e => [e.id, e]));
    const ids = tf_data_selector.decodeIdArray(this._experimentsString);
    return ids.filter(id => lookup.has(id)).map(id => lookup.get(id));
  },

  _getEnabledGroups() {
    const ids = tf_data_selector.decodeIdArray(this._enabledExperimentsString);
    return new Set(ids);
  },

  _canCompareExperiments(): boolean {
    // TODO(stephanwlee): change this to be based on whether user is using
    // logdir or db.
    return Boolean(this._experiments.length);
  },

  _getPersistenceId(experiment) {
    return tf_data_selector.encodeId(experiment.id);
  },

  /**
   * Prunes away an experiment that has been removed from `_experiments` from
   * the selection.
   */
  _pruneAllSelection() {
    if (!this._allSelections) return;
    const experimentIds = new Set(this._experiments.map(({id}) => id));
    const newAllSelctions = new Map(this._allSelections);
    newAllSelctions.forEach((_, id) => {
      // No experiment selection is still a valid selection. Do not prune.
      if (id == NO_EXPERIMENT_ID) return;
      if (!experimentIds.has(id)) newAllSelctions.delete(id);
    });
    this.set('_allSelections', newAllSelctions);
  },

  _setSelectionValue() {
    if (this._canCompareExperiments()) {
      // Make a copy of the all selections.
      const newSelection = new Map(this._allSelections);
      // Now, filter out disabled experiments from next `selection`.
      newSelection.forEach((_, id) => {
        if (!this._enabledExperiments.has(id)) newSelection.delete(id);
      });
      this._setSelection({
        type: tf_data_selector.Type.WITH_EXPERIMENT,
        selections: Array.from(newSelection.values()),
      });
    } else {
      this._setSelection({
        type: tf_data_selector.Type.WITHOUT_EXPERIMENT,
        selections: [this._allSelections.get(NO_EXPERIMENT_ID)],
      });
    }
  },

  _selectionChanged(event) {
    event.stopPropagation();
    const {runs, tagRegex} = event.detail;
    const expId = event.target.experiment.id != null ?
      event.target.experiment.id :
      NO_EXPERIMENT_ID;
    const newAllSelctions = new Map(this._allSelections);
    newAllSelctions.set(expId, {
      experiment: this._experiments.find(({id}) => expId == id),
      runs,
      tagRegex,
    });
    this.set('_allSelections', newAllSelctions);
  },

  _addExperiments(event) {
    const newExperiments = event.detail;
    const newGroupIds = this._experiments
        .concat(newExperiments).map(({id}) => id);
    this._experimentsString = tf_data_selector.encodeIdArray(newGroupIds);

    // Enable newly added experiments by default.
    this._mutateEnabledExperiment({added: newExperiments.map(({id}) => id)});
  },

  _removeExperiment(event) {
    const expId = event.target.experiment.id;
    const newGroupIds = this._experiments
        .filter(({id}) => id != expId)
        .map(({id}) => id);
    this._experimentsString = tf_data_selector.encodeIdArray(newGroupIds);

    this._mutateEnabledExperiment({removed: [expId]});
  },

  _getExperimentColor(experiment: tf_backend.Experiment): string {
    return tf_color_scale.experimentsColorScale(experiment.name);
  },

  _shouldShowAddComparison() {
    return this._allExperiments.length > this._experiments.length;
  },

  _updateEnabledExperimentsString() {
    // When the component never fully loaded the list of experiments, it
    // cannot correctly prune/adjust the enabledExperiments.
    if (!this._dataReady) return;
    const experimentIds = new Set(this._allExperiments.map(({id}) => id));
    const removed = Array.from(this._enabledExperiments)
        .filter(id => !experimentIds.has(id));
    this._mutateEnabledExperiment({removed});
  },

  _isExperimentEnabled(experiment) {
    return this._enabledExperiments.has(experiment.id);
  },

  _experimentCheckboxToggled(e) {
    const added = e.target.enabled ? [e.target.experiment.id] : [];
    const removed = !e.target.enabled ? [e.target.experiment.id] : [];
    this._mutateEnabledExperiment({added, removed});
  },

  _mutateEnabledExperiment({
    added = [],
    removed = [],
  }) {
    const enabledIds = new Set(
        tf_data_selector.decodeIdArray(this._enabledExperimentsString));
    added.forEach(id => enabledIds.add(id));
    removed.forEach(id => enabledIds.delete(id));
    this.set(
        '_enabledExperimentsString',
        tf_data_selector.encodeIdArray(Array.from(enabledIds)));
  },
});

}  // namespace tf_data_selector
