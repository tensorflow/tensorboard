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
var tf_data_selector;
(function (tf_data_selector) {
    var CHANGE_EVENT_DEBOUNCE_MS = 250;
    var Type;
    (function (Type) {
        Type[Type["RUN"] = 1] = "RUN";
        Type[Type["TAG"] = 2] = "TAG";
    })(Type || (Type = {}));
    var STORAGE_ALL_VALUE = '$all';
    var STORAGE_NONE_VALUE = '$none';
    Polymer({
        is: 'tf-data-select-row',
        properties: {
            experiment: {
                type: Object,
                value: function () { return ({
                    id: null,
                    name: 'Unknown experiment',
                    startTime: null,
                }); },
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
            _runs: {
                type: Array,
                value: function () { return []; },
            },
            _runSelectionStateString: { type: String, value: '' },
            // ListItem requires `id` and it is synthesized from name when it is in the
            // `noExperiment` mode.
            _selectedRuns: {
                type: Array,
                value: function () { return []; },
            },
            _tagRegex: {
                type: String,
                value: '',
                observer: '_persistRegex',
            },
        },
        listeners: {
            'dom-change': '_synchronizeColors',
        },
        observers: [
            '_persistSelectedRuns(_selectedRuns)',
            '_fireChange(_selectedRuns, _tagRegex)',
        ],
        _getPersistenceKey: function (type) {
            var id = this.persistenceId;
            switch (type) {
                case Type.RUN:
                    // Prefix with 'g' to denote a group.
                    return "gr" + id;
                case Type.TAG:
                    return "gt" + id;
            }
        },
        attached: function () {
            var _this = this;
            if (this.persistenceId == null) {
                throw new RangeError('Required `persistenceId` missing');
            }
            var runInitializer = tf_storage.getStringInitializer(this._getPersistenceKey(Type.RUN), {
                defaultValue: STORAGE_ALL_VALUE,
                polymerProperty: '_runSelectionStateString',
            });
            runInitializer.call(this);
            var tagInitializer = tf_storage.getStringInitializer(this._getPersistenceKey(Type.TAG), { defaultValue: '', polymerProperty: '_tagRegex' });
            tagInitializer.call(this);
            this._fetchRunsAndTags().then(function () { return _this._isDataReady = true; });
        },
        _synchronizeColors: function () {
            var _this = this;
            var cb = this.$$('#checkbox');
            if (!cb)
                return;
            var color = this.checkboxColor;
            cb.customStyle['--paper-checkbox-checked-color'] = color;
            cb.customStyle['--paper-checkbox-checked-ink-color'] = color;
            cb.customStyle['--paper-checkbox-unchecked-color'] = color;
            cb.customStyle['--paper-checkbox-unchecked-ink-color'] = color;
            window.requestAnimationFrame(function () { return _this.updateStyles(); });
        },
        detached: function () {
            this._isDataReady = false;
            this.cancelDebouncer('fire');
        },
        _fetchRunsAndTags: function () {
            var _this = this;
            var requestManager = new tf_backend.RequestManager();
            if (this.noExperiment) {
                var fetchRuns = requestManager.request(tf_backend.getRouter().runs());
                return Promise.all([fetchRuns]).then(function (_a) {
                    var runs = _a[0];
                    _this.set('_runs', Array.from(new Set(runs)).map(function (runName) { return ({
                        id: null,
                        name: runName,
                        startedTime: null,
                    }); }));
                });
            }
            console.assert(this.experiment.id != null, 'Expected an experiment Id');
            var url = tf_backend.getRouter().runsForExperiment(this.experiment.id);
            return requestManager.request(url).then(function (runs) {
                _this.set('_runs', runs);
            });
        },
        _getRunOptions: function (_) {
            var _this = this;
            return this._runs.map(function (run) { return ({
                // /data/runs endpoint does not return ids. In case of logdir data source,
                // runs cannot have an id and, for filtered-checkbox-list, we need to
                // synthesize id from the name.
                id: _this._getSyntheticRunId(run),
                title: run.name,
            }); });
        },
        _getIsRunCheckboxesColored: function (_) {
            return this.noExperiment;
        },
        _persistSelectedRuns: function () {
            if (!this._isDataReady)
                return;
            var value = this._serializeValue(this._runs, this._selectedRuns.map(function (_a) {
                var id = _a.id;
                return id;
            }));
            tf_storage.setString(this._getPersistenceKey(Type.RUN), value, { defaultValue: '' });
        },
        _getRunsSelectionState: function () {
            var _this = this;
            var allIds = this._runs.map(function (r) { return _this._getSyntheticRunId(r); });
            var ids = this._deserializeValue(allIds, this._runSelectionStateString);
            var prevSelection = new Set(ids);
            var newSelection = {};
            allIds.forEach(function (id) { return newSelection[id] = prevSelection.has(id); });
            return newSelection;
        },
        _persistRegex: function () {
            if (!this._isDataReady)
                return;
            var value = this._tagRegex;
            tf_storage.setString(this._getPersistenceKey(Type.TAG), value, { defaultValue: '' });
        },
        _fireChange: function (_, __) {
            var _this = this;
            this.debounce('fire', function () {
                var runMap = new Map(_this._runs.map(function (run) { return [_this._getSyntheticRunId(run), run]; }));
                _this.fire('selection-changed', {
                    runs: _this._selectedRuns.map(function (_a) {
                        var id = _a.id;
                        return runMap.get(id);
                    })
                        .filter(Boolean)
                        .map(function (run) { return ({
                        id: run.id,
                        name: run.name,
                        startTime: run.startTime,
                        tags: run.tags,
                    }); }),
                    tagRegex: _this._tagRegex,
                });
            }, CHANGE_EVENT_DEBOUNCE_MS);
        },
        _removeRow: function () {
            // Clear persistance when being removed.
            tf_storage.setString(this._getPersistenceKey(Type.RUN), '', { defaultValue: '' });
            tf_storage.setString(this._getPersistenceKey(Type.TAG), '', { defaultValue: '' });
            this.fire('remove');
        },
        _serializeValue: function (source, selectedIds) {
            if (selectedIds.length == source.length)
                return STORAGE_ALL_VALUE;
            if (selectedIds.length == 0)
                return STORAGE_NONE_VALUE;
            return this.noExperiment ?
                selectedIds.join(',') :
                tf_data_selector.encodeIdArray(selectedIds);
        },
        _deserializeValue: function (allValues, str) {
            if (str == STORAGE_ALL_VALUE)
                return allValues;
            if (str == STORAGE_NONE_VALUE)
                return [];
            return this.noExperiment ?
                str.split(',') :
                tf_data_selector.decodeIdArray(str);
        },
        _getColoring: function () {
            return {
                getColor: this.noExperiment ?
                    function (item) { return tf_color_scale.runsColorScale(item.id); } :
                    function () { return ''; },
            };
        },
        _getSyntheticRunId: function (run) {
            return this.noExperiment ? run.name : run.id;
        },
        _fireCheckboxToggled: function () {
            this.fire('checkbox-toggle');
        },
    });
})(tf_data_selector || (tf_data_selector = {})); // namespace tf_data_selector
