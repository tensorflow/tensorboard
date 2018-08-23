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
    var _a;
    var NO_EXPERIMENT_ID = null;
    _a = tf_storage.makeBindings(function (str) { return tf_data_selector.decodeIdArray(str); }, function (ids) { return tf_data_selector.encodeIdArray(ids); }), tf_data_selector.getIdInitializer = _a.getInitializer, tf_data_selector.getIdObserver = _a.getObserver;
    Polymer({
        is: 'tf-data-selector',
        properties: {
            _dataReady: {
                type: Boolean,
                value: false,
            },
            _allExperiments: {
                type: Array,
                value: function () { return []; },
            },
            // Subset of allExperiments user chose and added.
            _experimentIds: {
                type: Array,
                value: tf_data_selector.getIdInitializer('e', {
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
                value: tf_data_selector.getIdInitializer('ee', {
                    defaultValue: [],
                    polymerProperty: '_enabledExperimentIds',
                }),
            },
            _selections: {
                type: Object,
                value: function () {
                    return new Map();
                },
            },
            activePlugins: {
                type: Array,
                value: function () { return []; },
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
        _persistExperimentIds: tf_data_selector.getIdObserver('e', {
            defaultValue: [],
            polymerProperty: '_experimentIds',
        }),
        _persistEnabledExperiments: tf_data_selector.getIdObserver('ee', {
            defaultValue: [],
            polymerProperty: '_enabledExperimentIds',
        }),
        attached: function () {
            var _this = this;
            this._updateExpKey = tf_backend.experimentsStore
                .addListener(function () { return _this._updateExps(); });
            this._updateExps();
        },
        detached: function () {
            tf_backend.experimentsStore.removeListenerByKey(this._updateExpKey);
        },
        _updateExps: function () {
            this._dataReady = true;
            this._allExperiments = tf_backend.experimentsStore.getExperiments();
        },
        _canCompareExperiments: function () {
            // TODO(stephanwlee): change this to be based on whether user is using
            // logdir or db.
            return Boolean(this._experiments.length);
        },
        _shouldShowAddComparison: function () {
            return this._allExperiments.length > this._experiments.length;
        },
        _isExperimentEnabled: function (experiment) {
            var enabledExperimentIds = new Set(this._enabledExperimentIds);
            return enabledExperimentIds.has(experiment.id);
        },
        _getPersistenceId: function (experiment) {
            return tf_data_selector.encodeId(experiment.id);
        },
        _getExperimentColor: function (experiment) {
            return tf_color_scale.experimentsColorScale(experiment.name);
        },
        /**
         * Prunes away an experiment that has been removed from `_experiments` from
         * the selection.
         */
        _pruneSelections: function () {
            if (!this._selections)
                return;
            var experimentIds = new Set(this._experiments.map(function (_a) {
                var id = _a.id;
                return id;
            }));
            var newSelections = new Map(this._selections);
            newSelections.forEach(function (_, id) {
                // No experiment selection is still a valid selection. Do not prune.
                if (id == NO_EXPERIMENT_ID)
                    return;
                if (!experimentIds.has(id))
                    newSelections.delete(id);
            });
            this._selections = newSelections;
        },
        _pruneExperimentIds: function () {
            if (!this._dataReady)
                return;
            var allExpIds = new Set(this._allExperiments.map(function (_a) {
                var id = _a.id;
                return id;
            }));
            this._experimentIds = this._experimentIds.filter(function (id) { return allExpIds.has(id); });
        },
        _pruneEnabledExperiments: function () {
            // When the component never fully loaded the list of experiments, it
            // cannot correctly prune/adjust the enabledExperiments.
            if (!this._dataReady)
                return;
            var expIds = new Set(this._experimentIds);
            this._enabledExperimentIds = this._enabledExperimentIds
                .filter(function (id) { return expIds.has(id); });
        },
        _computeSelection: function () {
            if (this._canCompareExperiments()) {
                var enabledExperiments_1 = new Set(this._enabledExperimentIds);
                // Make a copy of the all selections.
                var newSelections_1 = new Map(this._selections);
                // Filter out disabled experiments from next `selection`.
                newSelections_1.forEach(function (_, id) {
                    if (!enabledExperiments_1.has(id))
                        newSelections_1.delete(id);
                });
                var activePluginNames_1 = new Set(this.activePlugins);
                newSelections_1.forEach(function (sel, id) {
                    var selection = sel;
                    var updatedSelection = Object.assign({}, selection);
                    updatedSelection.runs = selection.runs.map(function (run) {
                        return Object.assign({}, run, {
                            tags: run.tags.filter(function (tag) { return activePluginNames_1.has(tag.pluginName); }),
                        });
                    }).filter(function (run) { return run.tags.length; });
                    newSelections_1.set(id, updatedSelection);
                });
                return {
                    type: tf_data_selector.Type.WITH_EXPERIMENT,
                    selections: Array.from(newSelections_1.values()),
                };
            }
            return {
                type: tf_data_selector.Type.WITHOUT_EXPERIMENT,
                selections: [this._selections.get(NO_EXPERIMENT_ID)],
            };
        },
        _selectionChanged: function (event) {
            event.stopPropagation();
            var _a = event.detail, runs = _a.runs, tagRegex = _a.tagRegex;
            var experiment = event.target.experiment;
            var expId = experiment.id != null ? experiment.id : NO_EXPERIMENT_ID;
            var newSelections = new Map(this._selections);
            newSelections.set(expId, { experiment: experiment, runs: runs, tagRegex: tagRegex });
            this._selections = newSelections;
        },
        _computeExperiments: function () {
            var lookup = new Map(this._allExperiments.map(function (e) { return [e.id, e]; }));
            return this._experimentIds
                .filter(function (id) { return lookup.has(id); })
                .map(function (id) { return lookup.get(id); });
        },
        _addExperiments: function (event) {
            var addedIds = event.detail.map(function (_a) {
                var id = _a.id;
                return id;
            });
            this._experimentIds = uniqueAdd(this._experimentIds, addedIds);
            // Enable newly added experiments by default
            this._enabledExperimentIds = uniqueAdd(this._enabledExperimentIds, addedIds);
        },
        _removeExperiment: function (event) {
            var removedId = event.target.experiment.id;
            // Changing _experimentIds will remove the id from _enabledExperimentIds.
            this._experimentIds = this._experimentIds.filter(function (id) { return id != removedId; });
        },
        _experimentCheckboxToggled: function (e) {
            var newId = e.target.experiment.id;
            if (e.target.enabled) {
                this._experimentIds = uniqueAdd(this._experimentIds, [newId]);
            }
            else {
                this._experimentIds = this._experimentIds.filter(function (id) { return id != newId; });
            }
        },
    });
    /**
     * Append items to an array without duplicate entries.
     */
    function uniqueAdd(to, items) {
        var toSet = new Set(to);
        items.forEach(function (item) { return toSet.add(item); });
        return Array.from(toSet);
    }
})(tf_data_selector || (tf_data_selector = {})); // namespace tf_data_selector
