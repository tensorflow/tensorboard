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

enum Type {
  RUN = 1,
  TAG,
}

Polymer({
  is: 'tf-data-select-row',
  properties: {
    experiment: {
      type: Object,
      value: () => ({
        id: null,
        name: 'Unknown experiment',
        startTime: null,
      }),
    },

    // Required field.
    persistenceNumber: Number,

    noExperiment: {
      type: Boolean,
      value: false,
    },

    _runs: {
      type: Array,
      value: () => [],
    },

    _tags: {
      type: Array,
      value: () => [],
    },

    selection: {
      type: Array,
      notify: true,
      computed: '_computeSelection(_selectedRuns, _selectedTags)',
    },

    _runSelectionStateString: {type: String, value: ''},

    _selectedRuns: {
      type: Array,
      value: () => [],
    },

    _tagSelectionStateString: {type: String, value: ''},

    _selectedTags: {
      type: Array,
      value: () => [],
    },
  },

  observers: [
    '_persistSelectedRuns(_selectedRuns)',
    '_persistSelectedTags(_selectedTags)',
  ],

  _getPersistenceKey(type: Type): string {
    const number = this.persistenceNumber || 0;
    switch (type) {
      case Type.RUN:
        // Prefix with 'g' to denote a group.
        return `g${number}r`;
      case Type.TAG:
        return `g${number}t`;
    }
  },

  ready() {
    if (this.persistenceNumber == null) return;

    const runInitializer = tf_storage.getStringInitializer(
        this._getPersistenceKey(Type.RUN),
        {defaultValue: '', polymerProperty: '_runSelectionStateString'});
    runInitializer.call(this);

    const tagInitializer = tf_storage.getStringInitializer(
        this._getPersistenceKey(Type.TAG),
        {defaultValue: '', polymerProperty: '_tagSelectionStateString'});
    tagInitializer.call(this);
  },

  attached() {
    this._fetchRunsAndTags().then(() => this._isDataReady = true);
  },

  detached() {
    this._isDataReady = false;
  },

  _fetchRunsAndTags() {
    const requestManager = new tf_backend.RequestManager();
    if (this.noExperiment) {
      const fetchRuns = requestManager.request(tf_backend.getRouter().runs());
      return Promise.all([fetchRuns]).then(([runs]) => {
        this.set('_runs', Array.from(new Set(runs)).map(runName => ({
          id: runName,
          name: runName,
          startedTime: null,
        })));
      });
    } else if (this.experiment.id) {
      const url = tf_backend.getRouter().runsForExperiment(this.experiment.id);
      return requestManager.request(url).then(runs => {
        this.set('_runs', runs);
        // Flatten the tags.
        const tagSet = new Map();
        runs.forEach(({tags}) => {
          tags.forEach(tag => tagSet.set(tag.id, tag));
        })
        this.set('_tags', Array.from(tagSet.values()));
      });
    }
  },

  _getRunOptions(_) {
    return this._runs.map(run => ({
      id: run.id,
      title: run.name,
    }));
  },

  _getTagOptions(_) {
    return this._tags.map(tag => ({
      id: tag.id,
      title: tag.name,
    }));
  },

  _getIsRunCheckboxesColored(_) {
    return this.noExperiment;
  },

  _computeSelection(_, __) {
    // TODO(stephanlee): Compute the real selection.
    return [];
  },

  _persistSelectedRuns() {
    if (!this._isDataReady) return;
    const value = serializeValue(
        this._runs, this._selectedRuns.map(({id}) => id));
    tf_storage.setString(this._getPersistenceKey(Type.RUN), value);
  },

  _getRunsSelectionState() {
    return this._getSelectionState(this._runSelectionStateString,
        this._runs.map(({id}) => id));
  },

  _persistSelectedTags() {
    if (!this._isDataReady) return;
    const value = serializeValue(
        this._tags, this._selectedTags.map(({id}) => id));
    tf_storage.setString(this._getPersistenceKey(Type.TAG), value);
  },

  _getTagsSelectionState() {
    return this._getSelectionState(this._tagSelectionStateString,
        this._tags.map(({id}) => id));
  },

  _getSelectionState(persistedString: string, allIds: Array<number>): Object {
    const ids = deserializeValue(persistedString, allIds);
    const prevSelection = new Set(ids);
    const newSelection = {};
    allIds.forEach(id => newSelection[id] = prevSelection.has(id));
    return newSelection;
  },
});

function serializeValue(source, selectedIds) {
  if (selectedIds.length == source.length) return '$all';
  if (selectedIds.length == 0) return '$none';
  return  tf_data_selector.encodeIdArray(selectedIds);
}

function deserializeValue(str: string, allValues: Array<number>) {
  if (str == '$all') return allValues;
  if (str == '$none') return [];
  return tf_data_selector.decodeIdArray(str);
}

}  // namespace tf_data_selector
