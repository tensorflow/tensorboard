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

Polymer({
  is: 'tf-data-selector-simple',
  properties: {
    _allExperiments: {
      type: Array,
      value: (): tf_backend.Experiment[] => [],
    },

    _allRuns: {
      type: Array,
      value: (): string[] => [],
    },

    _selectedExperimentIds: {
      type: Array,
      value: getIdInitializer('e', {
        defaultValue: [],
        polymerProperty: '_selectedExperimentIds',
      }),
    },

    _selectedExperiments: {
      type: Array,
      observer: '_persistExperimentIds',
    },

    _selectedRunNames: {
      type: Array,
      value: tf_storage.getObjectInitializer('runs', {
        defaultValue: [],
        polymerProperty: '_selectedRunNames',
      }),
    },

    _selectedRuns: {
      type: Array,
      observer: '_persistRunNames',
    },

    _expToRunsAndTags: {
      type: Object,
      value: () => null,
    },

    _tagRegex: {
      type: String,
      value: tf_storage.getStringInitializer(
          'tagFilter', {defaultValue: '', polymerProperty: '_tagRegex'}),
      observer: '_persistTagFilter',
    },

    _requestManager: {
      type: Object,
      value: () => new tf_backend.RequestManager(),
    },

    // Output property. It has subset of _selections.
    selection: {
      type: Object,
      notify: true,
      computed: '_computeSelection(_selectedExperiments, _expToRunsAndTags, _selectedRuns, _tagRegex)',
    },
  },

  observers: [
    '_fetchNewRunsAndTags(_selectedExperiments)',
  ],

  _persistExperimentIds() {
    const value = this._selectedExperiments.map(({id}) => id);
    setId('e', value, {defaultValue: []});
  },

  _persistRunNames() {
    const value = this._selectedRuns.map(({id}) => id);
    tf_storage.setObject('runs', value, {defaultValue: []});
  },

  _persistTagFilter: tf_storage.getStringObserver(
      'tagFilter', {defaultValue: '', polymerProperty: '_tagRegex'}),

  attached() {
    this._updateExpKey = tf_backend.experimentsStore.addListener(() => {
      this._allExperiments = tf_backend.experimentsStore.getExperiments();
    });
    this._allExperiments = tf_backend.experimentsStore.getExperiments();

    this._updateRunKey = tf_backend.runsStore.addListener(() => {
      this._allRuns = Array.from(new Set(tf_backend.runsStore.getRuns()));
    });
    this._allRuns = Array.from(new Set(tf_backend.runsStore.getRuns()));
  },

  detached() {
    tf_backend.experimentsStore.removeListenerByKey(this._updateExpKey);
    tf_backend.experimentsStore.removeListenerByKey(this._updateRunKey);
  },

  _getExperimentColor() {
    return {
      getColor:
          (item: tf_dashboard_common.FilterableCheckboxListItem): string =>
              tf_color_scale.experimentsColorScale(item.title),
    };
  },

  _getRunColor() {
    return {
      getColor:
          (item: tf_dashboard_common.FilterableCheckboxListItem): string =>
              tf_color_scale.runsColorScale(item.title),
    };
  },

  _getRunsUsesCheckboxColors(): boolean {
    return this._selectedExperiments.length <= 1;
  },

  _getExperimentOptions(_): tf_dashboard_common.FilterableCheckboxListItem[] {
    return this._allExperiments
        .map(experiment => ({
          id: experiment.id,
          title: experiment.name,
          subtitle: getShortDateString(new Date(experiment.startTime)),
        }));
  },

  _getRunOptions(): tf_dashboard_common.FilterableCheckboxListItem[] {
    return this._allRuns.map(run => ({id: run, title: run}));
  },

  _getExperimentsSelectionState() {
    const allIds = this._allExperiments.map(({id}) => id);
    const selectedIds = new Set(this._selectedExperimentIds);
    const state = {};
    allIds.forEach(id => state[id] = selectedIds.has(id));
    return state;
  },

  _getRunsSelectionState() {
    const allIds = this._allRuns;
    const selectedIds = new Set(this._selectedRunNames);
    const state = {};
    allIds.forEach(id => state[id] = selectedIds.has(id));
    return state;
  },

  _computeSelection() {
    const expMap = new Map(this._allExperiments.map(exp => [exp.id, exp]));
    const selectedRunNames = new Set(
        this._selectedRuns.map(({title}) => title));

    const completeExps = this._selectedExperiments
        .filter(({id}) => (this._expToRunsAndTags || new Map()).has(id))
        .map(({id}) => expMap.get(id));

    const selections = completeExps.map(experiment => {
      return {
        experiment,
        runs: this._expToRunsAndTags.get(experiment.id)
            .filter(run => selectedRunNames.has(run.name)),
        tagRegex: this._tagRegex,
      };
    });

    return {
      type: selections.length == 1 ?
          tf_data_selector.Type.SINGLE : tf_data_selector.Type.COMPARISON,
      selections,
    };
  },

  _fetchNewRunsAndTags() {
    const expMap = new Map(this._allExperiments.map(exp => [exp.id, exp]));
    const expsToFetch = this._selectedExperiments
        .filter(({id}) => !(this._expToRunsAndTags || new Map()).has(id))
        .map(({id}) => expMap.get(id));

    const fetches = expsToFetch.map(exp => this._fetchRunsAndTags(exp));
    Promise.all(fetches).then(results => {
      const newExpToRunsAndTags = new Map(this._expToRunsAndTags);
      results.forEach((runs, index) => {
        const exp = expsToFetch[index];
        newExpToRunsAndTags.set(exp.id, runs);
      });
      this._expToRunsAndTags = newExpToRunsAndTags;
    });
  },

  _fetchRunsAndTags(exp: tf_backend.Experiment): Promise<void> {
    const id = exp.id;
    console.assert(id != null, 'Expected an experiment Id');

    const url = tf_backend.getRouter().runsForExperiment(id);
    return this._requestManager.request(url);
  },

});

function getShortDateString(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  });
}

}  // namespace tf_data_selector
