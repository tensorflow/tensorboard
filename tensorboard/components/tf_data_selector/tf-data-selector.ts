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

const NO_EXPERIMENT_ID = null;
export const {
  getInitializer: getIdInitializer,
  getObserver: getIdObserver,
} = tf_storage.makeBindings(
    (str: string): number[] => tf_data_selector.decodeIdArray(str),
    (ids: number[]): string => tf_data_selector.encodeIdArray(ids));

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

    // Subset of allExperiments user chose and added.
    _experimentIds: {
      type: Array,
      value: getIdInitializer('e', {
        defaultValue: [],
        polymerProperty: '_experimentIds',
      }),
    },

    _experiments: {
      type: Array,
      computed: '_computeExperiments(_allExperiments.*, _experimentIds.*)',
    },

    _enabledExperimentIds: {
      type: Array,
      value: getIdInitializer('ee', {
        defaultValue: [],
        polymerProperty: '_enabledExperimentIds',
      }),
    },

    // TODO(stephanwlee): Add list of active plugin from parent and filter out
    // the unused tag names in the list of selection.

    _selections: {
      type: Object,
      value: (): Map<tf_backend.ExperimentId, tf_data_selector.Selection> => {
        return new Map();
      },
    },

    // Output property. It has subset of _selections.
    selection: {
      type: Object,
      notify: true,
      computed: '_computeSelection(_enabledExperimentIds.*, _selections.*)',
    },
  },

  observers: [
    '_pruneAllSelection(_experiments.*)',
    '_updateEnabledExperiments(_allExperiments.*)',
    '_persistExperimentIds(_experimentIds.*)',
    '_persistEnabledExperiments(_enabledExperimentIds.*)',
  ],

  _persistExperimentIds: getIdObserver('e', {
    defaultValue: [],
    polymerProperty: '_experimentIds',
  }),

  _persistEnabledExperiments: getIdObserver('ee', {
    defaultValue: [],
    polymerProperty: '_enabledExperimentIds',
  }),

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

  _canCompareExperiments(): boolean {
    // TODO(stephanwlee): change this to be based on whether user is using
    // logdir or db.
    return Boolean(this._experiments.length);
  },

  _shouldShowAddComparison() {
    return this._allExperiments.length > this._experiments.length;
  },

  _isExperimentEnabled(experiment) {
    const enabledExperimentIds = new Set(this._enabledExperimentIds);
    return enabledExperimentIds.has(experiment.id);
  },

  _getPersistenceId(experiment) {
    return tf_data_selector.encodeId(experiment.id);
  },

  _getExperimentColor(experiment: tf_backend.Experiment): string {
    return tf_color_scale.experimentsColorScale(experiment.name);
  },

  /**
   * Prunes away an experiment that has been removed from `_experiments` from
   * the selection.
   */
  _pruneAllSelection() {
    if (!this._selections) return;
    const experimentIds = new Set(this._experiments.map(({id}) => id));
    const newAllSelections = new Map(this._selections);
    newAllSelections.forEach((_, id) => {
      // No experiment selection is still a valid selection. Do not prune.
      if (id == NO_EXPERIMENT_ID) return;
      if (!experimentIds.has(id)) newAllSelections.delete(id);
    });
    this.set('_selections', newAllSelections);
  },

  _computeSelection() {
    if (this._canCompareExperiments()) {
      const enabledExperiments = new Set(this._enabledExperimentIds);
      // Make a copy of the all selections.
      const newSelection = new Map(this._selections);
      // Now, filter out disabled experiments from next `selection`.
      newSelection.forEach((_, id) => {
        if (!enabledExperiments.has(id)) newSelection.delete(id);
      });
      return {
        type: tf_data_selector.Type.WITH_EXPERIMENT,
        selections: Array.from(newSelection.values()),
      };
    }
    return {
      type: tf_data_selector.Type.WITHOUT_EXPERIMENT,
      selections: [this._selections.get(NO_EXPERIMENT_ID)],
    };
  },

  _selectionChanged(event) {
    event.stopPropagation();
    const {runs, tagRegex} = event.detail;
    const experiment = event.target.experiment;
    const expId = experiment.id != null ? experiment.id : NO_EXPERIMENT_ID;
    const newSelections = new Map(this._selections);
    newSelections.set(expId, {experiment, runs, tagRegex});
    this.set('_selections', newSelections);
  },

  _computeExperiments() {
    const lookup = new Map(this._allExperiments.map(e => [e.id, e]));
    return this._experimentIds
        .filter(id => lookup.has(id))
        .map(id => lookup.get(id));
  },

  _addExperiments(event) {
    const addedIds = event.detail.map(({id}) => id);
    this._experimentIds = this._experimentIds.concat(addedIds);

    // Enable newly added experiments by default.
    this._mutateEnabledExperiment({added: addedIds});
  },

  _removeExperiment(event) {
    const removedId = event.target.experiment.id;
    this._experimentIds = this._experimentIds.filter(id => id != removedId);

    this._mutateEnabledExperiment({removed: [removedId]});
  },

  _updateEnabledExperiments() {
    // When the component never fully loaded the list of experiments, it
    // cannot correctly prune/adjust the enabledExperiments.
    if (!this._dataReady) return;
    const experimentIds = new Set(this._allExperiments.map(({id}) => id));
    const removed = this._enabledExperimentIds
        .filter(id => !experimentIds.has(id));
    this._mutateEnabledExperiment({removed});
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
    const enabledIds = new Set(this._enabledExperimentIds);
    added.forEach(id => enabledIds.add(id));
    removed.forEach(id => enabledIds.delete(id));
    this.set('_enabledExperimentIds', Array.from(enabledIds));
  },
});

}  // namespace tf_data_selector
