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

const MAX_RUNS_TO_ENABLE_BY_DEFAULT = 20;

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

    enabled: {
      type: Boolean,
      notify: true,
      value: true,
    },

    checkboxColor: {
      type: String,
      value: '',
    },

    // Required field.
    persistenceId: String,

    noExperiment: {
      type: Boolean,
      value: false,
    },

    shouldColorRuns: {
      type: Boolean,
      value: false,
    },

    _coloring: {
      type: Object,
      computed: '_getColoring(shouldColorRuns)',
    },

    _runs: {
      type: Array,
      value: (): Array<tf_backend.Run> => [],
    },

    _runSelectionStateString: {type: String, value: ''},

    // ListItem requires `id` and it is synthesized from name when it is in the
    // `noExperiment` mode.
    _selectedRuns: {
      type: Array,
      value: (): Array<tf_dashboard_common.FilterableCheckboxListItem> => [],
    },

    _tagRegex: {
      type: String,
      value: '',
      observer: '_persistRegex',
    },

    _storageBinding: {
      type: Object,
      value: () => null,
    },
  },

  listeners: {
    'dom-change': '_synchronizeColors',
  },

  observers: [
    '_immutablePropInvarianceViolated(persistenceId.*)',
    '_immutablePropInvarianceViolated(experiment.*)',
    '_synchronizeColors(checkboxColor)',
    '_persistSelectedRuns(_selectedRuns)',
    '_fireChange(_selectedRuns, _tagRegex)',
  ],

  _getPersistenceKey(type: Type): string {
    const id = this.persistenceId;
    switch (type) {
      case Type.RUN:
        // Prefix with 'g' to denote a group.
        return `gr${id}`;
      case Type.TAG:
        return `gt${id}`;
    }
  },

  attached(): void {
    if (this.persistenceId == null) {
      throw new RangeError('Required `persistenceId` missing');
    }

    this._initFromStorage();
    this._initRunsAndTags()
        .then(() => {
          if (this._runSelectionStateString) return;
          const val = this._runs.length <= MAX_RUNS_TO_ENABLE_BY_DEFAULT ?
              STORAGE_ALL_VALUE : STORAGE_NONE_VALUE;
          this._storageBinding.set(this._getPersistenceKey(Type.RUN), val,
              {defaultValue: ''});
          this._runSelectionStateString = val;
        });
  },

  detached(): void {
    this._isDataReady = false;
    if (this._storageBinding) this._storageBinding.disposeBinding();
  },

  _initFromStorage() {
    if (this._storageBinding) this._storageBinding.disposeBinding();
    this._storageBinding = tf_storage.makeBindings(x => x, x => x);
    const runInitializer = this._storageBinding.getInitializer(
        this._getPersistenceKey(Type.RUN),
        {
          defaultValue: '',
          polymerProperty: '_runSelectionStateString',
        });
    runInitializer.call(this);
    const tagInitializer = this._storageBinding.getInitializer(
        this._getPersistenceKey(Type.TAG),
        {defaultValue: '', polymerProperty: '_tagRegex'});
    tagInitializer.call(this);
  },

  _initRunsAndTags(): Promise<void> {
    this._isDataReady = false;
    return this._fetchRunsAndTags()
        .then(() => {
          this._isDataReady = true;
        });
  },

  _immutablePropInvarianceViolated(change) {
    // We allow property to change many times before the component is attached
    // to DOM.
    if (this.isAttached) {
      throw new Error(`Invariance Violation: ` +
          `Expected property '${change.path}' not to change.`);
    }
  },

  _synchronizeColors() {
    const cb = this.$$('#checkbox');
    if (!cb) return;

    const color = this.checkboxColor;
    cb.customStyle['--paper-checkbox-checked-color'] = color;
    cb.customStyle['--paper-checkbox-checked-ink-color'] = color;
    cb.customStyle['--paper-checkbox-unchecked-color'] = color;
    cb.customStyle['--paper-checkbox-unchecked-ink-color'] = color;

    window.requestAnimationFrame(() => this.updateStyles());
  },

  _fetchRunsAndTags(): Promise<void> {
    const requestManager = new tf_backend.RequestManager();
    if (this.noExperiment) {
      const fetchRuns = requestManager.request(tf_backend.getRouter().runs());
      return Promise.all([fetchRuns]).then(([runs]) => {
        this.set('_runs', Array.from(new Set(runs)).map(runName => ({
          id: null,
          name: runName,
          startedTime: null,
        })));
      });
    }

    console.assert(this.experiment.id != null, 'Expected an experiment Id');

    const url = tf_backend.getRouter().runsForExperiment(this.experiment.id);
    return requestManager.request(url).then(runs => {
      this.set('_runs', runs);
    });
  },

  _getRunOptions(_): Array<tf_dashboard_common.FilterableCheckboxListItem> {
    return this._runs.map(run => ({
      // /data/runs endpoint does not return ids. In case of logdir data source,
      // runs cannot have an id and, for filtered-checkbox-list, we need to
      // synthesize id from the name.
      id: this._getSyntheticRunId(run),
      title: run.name,
    }));
  },

  _persistSelectedRuns(): void {
    if (!this._isDataReady) return;
    const value = this._serializeValue(
        this._runs,
        this._selectedRuns.map(({id}) => id));
    this._storageBinding.set(this._getPersistenceKey(Type.RUN), value,
        {defaultValue: ''});
  },

  _getRunsSelectionState(): Object {
    const allIds = this._runs.map(r => this._getSyntheticRunId(r));
    const ids = this._deserializeValue(allIds, this._runSelectionStateString);
    const prevSelection = new Set(ids);
    const newSelection = {};
    allIds.forEach(id => newSelection[id] = prevSelection.has(id));
    return newSelection;
  },

  _persistRegex(): void {
    if (!this._isDataReady) return;
    const value = this._tagRegex;
    this._storageBinding.set(this._getPersistenceKey(Type.TAG), value,
        {defaultValue: ''});
  },

  _fireChange(_, __): void {
    const runMap = new Map(
        this._runs.map(run => [this._getSyntheticRunId(run), run]));
    this.fire('selection-changed', {
      runs: this._selectedRuns.map(({id}) => runMap.get(id))
          .filter(Boolean)
          .map(run => ({
            id: run.id,
            name: run.name,
            startTime: run.startTime,
            tags: run.tags,
          })),
      tagRegex: this._tagRegex,
    });
  },

  _removeRow(): void {
    // Clear persistence when being removed.
    this._storageBinding.set(
        this._getPersistenceKey(Type.RUN), '', {defaultValue: ''});
    this._storageBinding.set(
        this._getPersistenceKey(Type.TAG), '', {defaultValue: ''});
    this.fire('remove');
  },

  _serializeValue(
      source: Array<number|string>, selectedIds: Array<number|string>) {
    if (selectedIds.length == source.length) return STORAGE_ALL_VALUE;
    if (selectedIds.length == 0) return STORAGE_NONE_VALUE;

    return this.noExperiment ?
        JSON.stringify(selectedIds) :
        tf_data_selector.encodeIdArray((selectedIds as Array<number>));
  },

  _deserializeValue(allValues: Array<number|string>, str: string) {
    if (str == STORAGE_ALL_VALUE) return allValues;
    if (str == STORAGE_NONE_VALUE) return [];
    if (!this.noExperiment) return tf_data_selector.decodeIdArray(str);
    let parsed = [];
    try {
      parsed = JSON.parse(str);
    } catch (e) {
      /* noop */
    }
    return Array.isArray(parsed) ? parsed : [];
  },

  _getColoring() {
    return {
      getColor: this.shouldColorRuns ?
          (item) => tf_color_scale.runsColorScale(item.title) :
          () => '',
    };
  },

  _getSyntheticRunId(run) {
    return this.noExperiment ? run.name : run.id;
  },

  _fireCheckboxToggled() {
    this.fire('checkbox-toggle');
  },
});

}  // namespace tf_data_selector
