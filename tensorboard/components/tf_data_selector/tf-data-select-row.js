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
    var Type;
    (function (Type) {
        Type[Type["RUN"] = 1] = "RUN";
        Type[Type["TAG"] = 2] = "TAG";
    })(Type || (Type = {}));
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
            // Required field.
            persistenceNumber: Number,
            noExperiment: {
                type: Boolean,
                value: false,
            },
            _runs: {
                type: Array,
                value: function () { return []; },
            },
            _tags: {
                type: Array,
                value: function () { return []; },
            },
            selection: {
                type: Array,
                notify: true,
                computed: '_computeSelection(_selectedRuns, _selectedTags)',
            },
            _runSelectionStateString: { type: String, value: '' },
            _selectedRuns: {
                type: Array,
                value: function () { return []; },
            },
            _tagSelectionStateString: { type: String, value: '' },
            _selectedTags: {
                type: Array,
                value: function () { return []; },
            },
        },
        observers: [
            '_persistSelectedRuns(_selectedRuns)',
            '_persistSelectedTags(_selectedTags)',
        ],
        _getPersistenceKey: function (type) {
            var number = this.persistenceNumber || 0;
            switch (type) {
                case Type.RUN:
                    return "g" + number + "r";
                case Type.TAG:
                    return "g" + number + "t";
            }
        },
        ready: function () {
            if (this.persistenceNumber == null)
                return;
            var runInitializer = tf_storage.getStringInitializer(this._getPersistenceKey(Type.RUN), { defaultValue: '', polymerProperty: '_runSelectionStateString' });
            runInitializer.call(this);
            var tagInitializer = tf_storage.getStringInitializer(this._getPersistenceKey(Type.TAG), { defaultValue: '', polymerProperty: '_tagSelectionStateString' });
            tagInitializer.call(this);
        },
        attached: function () {
            var _this = this;
            this._fetchRunsAndTags().then(function () { return _this._isDataReady = true; });
        },
        detached: function () {
            this._isDataReady = false;
        },
        _fetchRunsAndTags: function () {
            var _this = this;
            var requestManager = new tf_backend.RequestManager();
            if (this.noExperiment) {
                var fetchRuns = requestManager.request(tf_backend.getRouter().runs());
                return Promise.all([fetchRuns]).then(function (_a) {
                    var runs = _a[0];
                    _this.set('_runs', Array.from(new Set(runs)).map(function (runName) { return ({
                        id: runName,
                        name: runName,
                        startedTime: null,
                    }); }));
                });
            }
            else if (this.experiment.id) {
                var url = tf_backend.getRouter().runsForExperiment(this.experiment.id);
                return requestManager.request(url).then(function (runs) {
                    _this.set('_runs', runs);
                    // Flatten the tags.
                    var tagSet = new Map();
                    runs.forEach(function (_a) {
                        var tags = _a.tags;
                        tags.forEach(function (tag) { return tagSet.set(tag.id, tag); });
                    });
                    _this.set('_tags', Array.from(tagSet.values()));
                });
            }
        },
        _getRunOptions: function (_) {
            return this._runs.map(function (run) { return ({
                id: run.id,
                title: run.name,
            }); });
        },
        _getTagOptions: function (_) {
            return this._tags.map(function (tag) { return ({
                id: tag.id,
                title: tag.name,
            }); });
        },
        _getIsRunCheckboxesColored: function (_) {
            return this.noExperiment;
        },
        _computeSelection: function (_, __) {
            return [];
        },
        _persistSelectedRuns: function () {
            if (!this._isDataReady)
                return;
            var value = serializeValue(this._runs, this._selectedRuns.map(function (_a) {
                var id = _a.id;
                return id;
            }));
            tf_storage.setString(this._getPersistenceKey(Type.RUN), value);
        },
        _getRunsSelectionState: function () {
            return this._getSelectionState(this._runSelectionStateString, this._runs.map(function (_a) {
                var id = _a.id;
                return id;
            }));
        },
        _persistSelectedTags: function () {
            if (!this._isDataReady)
                return;
            var value = serializeValue(this._tags, this._selectedTags.map(function (_a) {
                var id = _a.id;
                return id;
            }));
            tf_storage.setString(this._getPersistenceKey(Type.TAG), value);
        },
        _getTagsSelectionState: function () {
            return this._getSelectionState(this._tagSelectionStateString, this._tags.map(function (_a) {
                var id = _a.id;
                return id;
            }));
        },
        _getSelectionState: function (persistedString, allIds) {
            var ids = deserializeValue(persistedString, allIds);
            var prevSelection = new Set(ids);
            var newSelection = {};
            allIds.forEach(function (id) { return newSelection[id] = prevSelection.has(id); });
            return newSelection;
        },
    });
    function serializeValue(source, selectedIds) {
        if (selectedIds.length == source.length)
            return '$all';
        if (selectedIds.length == 0)
            return '$none';
        return tf_data_selector.encodeIdArray(selectedIds);
    }
    function deserializeValue(str, allValues) {
        if (str == '$all')
            return allValues;
        if (str == '$none')
            return [];
        return tf_data_selector.decodeIdArray(str);
    }
})(tf_data_selector || (tf_data_selector = {})); // namespace tf_data_selector
