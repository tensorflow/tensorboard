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
    Polymer({
        is: 'tf-data-selector',
        properties: {
            _allExperiments: {
                type: Array,
                value: function () { return []; },
            },
            _comparingExpsString: {
                type: String,
                value: tf_storage.getStringInitializer('e', { defaultValue: '', polymerProperty: '_comparingExpsString' }),
            },
            _comparingExps: {
                type: Array,
                computed: '_getComparingExps(_comparingExpsString, _allExperiments.*)',
            },
            // TODO(stephanwlee): Add list of active plugin from parent and filter out
            // the unused tag names in the list of selection.
            selection: {
                type: Object,
                notify: true,
                readOnly: true,
                value: function () { return ({
                    type: tf_data_selector.Type.WITHOUT_EXPERIMENT,
                    selections: [],
                }); },
            },
            _selectionMap: {
                type: Object,
                value: function () { return new Map(); },
            },
        },
        observers: [
            '_expStringObserver(_comparingExpsString)',
            '_pruneSelection(_selectionMap, _comparingExps)',
        ],
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
            this.set('_allExperiments', tf_backend.experimentsStore.getExperiments());
        },
        _getComparingExps: function () {
            var lookupMap = new Map(this._allExperiments.map(function (e) { return [e.id, e]; }));
            var ids = tf_data_selector.decodeIdArray(this._comparingExpsString);
            return ids.filter(function (id) { return lookupMap.has(id); }).map(function (id) { return lookupMap.get(id); });
        },
        _expStringObserver: tf_storage.getStringObserver('e', { defaultValue: '', polymerProperty: '_comparingExpsString' }),
        _canCompareExperiments: function () {
            // TODO(stephanwlee): change this to be based on whether user is using
            // logdir or db.
            return Boolean(this._comparingExps.length);
        },
        /**
         * Prunes away an experiment that has been removed from `_comparingExps` from
         * the _selectionMap.
         */
        _pruneSelection: function () {
            var _this = this;
            if (!this._canCompareExperiments()) {
                this._selectionMap.clear();
                return;
            }
            var comparingExpIds = new Set(this._comparingExps.map(function (_a) {
                var id = _a.id;
                return id;
            }));
            var curSelectedExpIds = Array.from(this._selectionMap.keys());
            curSelectedExpIds
                .filter(function (id) { return !comparingExpIds.has(id); })
                .forEach(function (id) { return _this._selectionMap.delete(id); });
            this._setSelection({
                type: tf_data_selector.Type.WITH_EXPERIMENT,
                selections: Array.from(this._selectionMap.values()),
            });
        },
        _selectionChanged: function (event) {
            var _a = event.detail, runs = _a.runs, tagRegex = _a.tagRegex;
            if (!this._canCompareExperiments()) {
                this._setSelection({
                    type: tf_data_selector.Type.WITHOUT_EXPERIMENT,
                    selections: [{ runs: runs, tagRegex: tagRegex }],
                });
                return;
            }
            var expId = event.target.experiment.id;
            this._selectionMap.set(expId, {
                experiment: this._comparingExps.find(function (_a) {
                    var id = _a.id;
                    return expId == id;
                }),
                runs: runs,
                tagRegex: tagRegex,
            });
            this._setSelection({
                type: tf_data_selector.Type.WITH_EXPERIMENT,
                selections: Array.from(this._selectionMap.values())
            });
        },
        _addExperiments: function (event) {
            var newExperiments = event.detail;
            var newComparingExpIds = this._comparingExps
                .concat(newExperiments).map(function (_a) {
                var id = _a.id;
                return id;
            });
            this._comparingExpsString = tf_data_selector.encodeIdArray(newComparingExpIds);
        },
        _removeExperiment: function (event) {
            var expId = event.target.experiment.id;
            var newComparingExpIds = this._comparingExps
                .filter(function (_a) {
                var id = _a.id;
                return id != expId;
            })
                .map(function (_a) {
                var id = _a.id;
                return id;
            });
            this._comparingExpsString = tf_data_selector.encodeIdArray(newComparingExpIds);
        },
        _getExperimentColor: function (experiment) {
            return tf_color_scale.experimentsColorScale(experiment.name);
        },
    });
})(tf_data_selector || (tf_data_selector = {})); // namespace tf_data_selector
