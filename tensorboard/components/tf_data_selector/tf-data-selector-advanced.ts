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
  is: 'tf-data-selector-advanced',
  properties: {
    _allExperimentsFetched: {
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
      value: (): Array<tf_backend.Experiment> => [],
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

    _canCompareExperiments: {
      type: Boolean,
      value: false
    },

    _shouldColorRuns: {
      type: Boolean,
      computed: '_computeShouldColorRuns(_experiments.*)',
    },

  },

  behaviors: [
    tf_dashboard_common.ArrayUpdateHelper,
  ],

  observers: [
    '_updateExperiments(_allExperiments, _experimentIds)',
    '_pruneSelections(_experimentIds.*)',
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
    this._updateExpKey = tf_backend.experimentsStore.addListener(() => {
      this._allExperiments = tf_backend.experimentsStore.getExperiments();
      this._allExperimentsFetched = true;
    });
    this._allExperiments = tf_backend.experimentsStore.getExperiments();
    this._allExperimentsFetched = tf_backend.experimentsStore.initialized;

    this._updateEnvKey = tf_backend.environmentStore.addListener(() => {
      this._canCompareExperiments = tf_backend.Mode.DB ==
          tf_backend.environmentStore.getMode();
    });
    this._canCompareExperiments = tf_backend.Mode.DB ==
        tf_backend.environmentStore.getMode();
  },

  detached() {
    tf_backend.experimentsStore.removeListenerByKey(this._updateExpKey);
    tf_backend.environmentStore.removeListenerByKey(this._updateEnvKey);
  },

  _getPersistenceId(experiment) {
    return tf_data_selector.encodeId(experiment.id);
  },

  _isExperimentEnabled(experiment) {
    const enabledExperimentIds = new Set(this._enabledExperimentIds);
    return enabledExperimentIds.has(experiment.id);
  },

  _getExperimentColor(experiment: tf_backend.Experiment): string {
    return tf_color_scale.experimentsColorScale(experiment.name);
  },

  _computeShouldColorRuns() {
    return this._experiments.length <= 1;
  },

  /**
   * Prunes away an experiment that has been removed from `_experiments` from
   * the selection.
   */
  _pruneSelections() {
    if (!this._selections) return;
    const experimentIds = new Set(this._experimentIds);
    const newSelections = new Map(this._selections);
    newSelections.forEach((_, id) => {
      // No experiment selection is still a valid selection. Do not prune.
      if (id == NO_EXPERIMENT_ID) return;
      if (!experimentIds.has(id)) newSelections.delete(id);
    });
    this._selections = newSelections;
  },

  _pruneExperimentIds() {
    if (!this._allExperimentsFetched) return;
    const allExpIds = new Set(this._allExperiments.map(({id}) => id));
    this._experimentIds = this._experimentIds.filter(id => allExpIds.has(id));
  },

  _pruneEnabledExperiments() {
    // When the component never fully loaded the list of experiments, it
    // cannot correctly prune/adjust the enabledExperiments.
    if (!this._allExperimentsFetched) return;
    const expIds = new Set(this._experimentIds);
    this._enabledExperimentIds = this._enabledExperimentIds
        .filter(id => expIds.has(id));
  },

  _computeSelection() {
    if (this._canCompareExperiments) {
      const activePluginNames = new Set(this.activePlugins);
      const selections = this._enabledExperimentIds
          .filter(id => this._selections.has(id))
          .map(id => this._selections.get(id) as Selection)
          .map(selection => {
            const updatedSelection = Object.assign({}, selection);
            updatedSelection.runs = selection.runs.map(run => {
              return Object.assign({}, run, {
                tags: run.tags
                    .filter(tag => activePluginNames.has(tag.pluginName)),
              });
            }).filter(run => run.tags.length);
            return updatedSelection;
          });

      // Single selection: one experimentful selection whether it is enabled or
      // not.
      // NOTE: `_selections` can contain not only selections for experiment
      // diffing but also one for no-experiment mode. If it contains one,
      // "remove" the size by one.
      const isSingleSelection = this._selections.size ==
          1 + Number(this._selections.has(NO_EXPERIMENT_ID));
      return {
        type: isSingleSelection ?
            tf_data_selector.Type.SINGLE : tf_data_selector.Type.COMPARISON,
        selections,
      };
    }
    return {
      type: tf_data_selector.Type.WITHOUT_EXPERIMENT,
      selections: [this._selections.get(NO_EXPERIMENT_ID)],
    };
  },

  _selectionChanged(event) {
    event.stopPropagation();
    if (!this.isAttached || !event.target.isAttached) return;
    const {runs, tagRegex} = event.detail;
    const experiment = event.target.experiment;
    const expId = experiment.id != null ? experiment.id : NO_EXPERIMENT_ID;

    // Check if selction change event was triggered from a removed row. Removal
    // triggers change in persistence (clears the value) and this causes
    // property to change which in turn triggers an event. If there is any
    // asynchronity in propagating the change from the row, below condition is
    // truthy.
    if (expId != NO_EXPERIMENT_ID && !this._experimentIds.includes(expId)) {
      return;
    }

    const newSelections = new Map(this._selections);
    newSelections.set(expId, {experiment, runs, tagRegex});

    // Ignore the selection changed event if it makes no tangible difference to
    // the _selections.
    if (_.isEqual(newSelections, this._selections)) return;

    this._selections = newSelections;
  },

  _updateExperiments() {
    const lookup = new Map(this._allExperiments.map(e => [e.id, e]));
    const experiments = this._experimentIds
        .filter(id => lookup.has(id))
        .map(id => lookup.get(id));

    this.updateArrayProp('_experiments', experiments, exp => exp.id);
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
      this._enabledExperimentIds = uniqueAdd(
          this._enabledExperimentIds,
          [newId]);
    } else {
      this._enabledExperimentIds = this._enabledExperimentIds
          .filter(id => id != newId);
    }
  },

  _getAddComparisonVisible() {
    return this._canCompareExperiments &&
        this._allExperiments.length > this._experiments.length;
  },

  _getAddComparisonAlwaysExpanded() {
    return this._canCompareExperiments && !this._experiments.length;
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
