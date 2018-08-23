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

    _selections: {
      type: Object,
      value: (): Map<tf_backend.ExperimentId, tf_data_selector.Selection> => {
        return new Map();
      },
    },

    activePlugins: {
      type: Array,
      value: (): string[] => [],
    },

    // Output property. It has subset of _selections.
    selection: {
      type: Object,
      notify: true,
      computed: '_computeSelection(_enabledExperimentIds.*, _selections.*, activePlugins.*)',
    },
  },

  observers: [
    '_pruneSelections(_experiments.*)',
    '_pruneExperimentIds(_allExperiments.*)',
    '_pruneEnabledExperiments(_experimentIds.*)',
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
    this._allExperiments = tf_backend.experimentsStore.getExperiments();
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
  _pruneSelections() {
    if (!this._selections) return;
    const experimentIds = new Set(this._experiments.map(({id}) => id));
    const newSelections = new Map(this._selections);
    newSelections.forEach((_, id) => {
      // No experiment selection is still a valid selection. Do not prune.
      if (id == NO_EXPERIMENT_ID) return;
      if (!experimentIds.has(id)) newSelections.delete(id);
    });
    this._selections = newSelections;
  },

  _pruneExperimentIds() {
    if (!this._dataReady) return;
    const allExpIds = new Set(this._allExperiments.map(({id}) => id));
    this._experimentIds = this._experimentIds.filter(id => allExpIds.has(id));
  },

  _pruneEnabledExperiments() {
    // When the component never fully loaded the list of experiments, it
    // cannot correctly prune/adjust the enabledExperiments.
    if (!this._dataReady) return;
    const expIds = new Set(this._experimentIds);
    this._enabledExperimentIds = this._enabledExperimentIds
        .filter(id => expIds.has(id));
  },

  _computeSelection() {
    if (this._canCompareExperiments()) {
      const enabledExperiments = new Set(this._enabledExperimentIds);

      // Make a copy of the all selections.
      const newSelections = new Map(this._selections);

      // Filter out disabled experiments from next `selection`.
      newSelections.forEach((_, id) => {
        if (!enabledExperiments.has(id)) newSelections.delete(id);
      });

      const activePluginNames = new Set(this.activePlugins);
      newSelections.forEach((sel, id) => {
        const selection = sel as Selection;
        const updatedSelection = Object.assign({}, selection);
        updatedSelection.runs = selection.runs.map(run => {
          return Object.assign({}, run, {
            tags: run.tags.filter(tag => activePluginNames.has(tag.pluginName)),
          });
        }).filter(run => run.tags.length);

        newSelections.set(id, updatedSelection);
      });

      return {
        type: tf_data_selector.Type.WITH_EXPERIMENT,
        selections: Array.from(newSelections.values()),
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
    this._selections = newSelections;
  },

  _computeExperiments() {
    const lookup = new Map(this._allExperiments.map(e => [e.id, e]));
    return this._experimentIds
        .filter(id => lookup.has(id))
        .map(id => lookup.get(id));
  },

  _addExperiments(event) {
    const addedIds = event.detail.map(({id}) => id);
    this._experimentIds = uniqueAdd(this._experimentIds, addedIds);

    // Enable newly added experiments by default
    this._enabledExperimentIds = uniqueAdd(
        this._enabledExperimentIds,
        addedIds);
  },

  _removeExperiment(event) {
    const removedId = event.target.experiment.id;
    // Changing _experimentIds will remove the id from _enabledExperimentIds.
    this._experimentIds = this._experimentIds.filter(id => id != removedId);
  },

  _experimentCheckboxToggled(e) {
    const newId = e.target.experiment.id;
    if (e.target.enabled) {
      this._experimentIds = uniqueAdd(this._experimentIds, [newId]);
    } else {
      this._experimentIds = this._experimentIds.filter(id => id != newId);
    }
  },
});

/**
 * Append items to an array without duplicate entries.
 */
function uniqueAdd<T>(to: T[], items: T[]): T[] {
  const toSet = new Set(to);
  items.forEach(item => toSet.add(item));
  return Array.from(toSet);
}

}  // namespace tf_data_selector
