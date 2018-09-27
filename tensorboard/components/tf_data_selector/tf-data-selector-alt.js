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
    var NO_EXPERIMENT_ID = null;
    Polymer({
        is: 'tf-data-selector-alt',
        properties: {
            _allExperiments: {
                type: Array,
                value: function () { return []; },
            },
            _allRuns: {
                type: Array,
                value: function () { return []; },
            },
            _experimentIds: {
                type: Array,
                value: function () { return []; },
            },
            _selectedExperiments: {
                type: Array,
                value: function () { return []; },
            },
            _selectedRuns: {
                type: Array,
                value: function () { return []; },
            },
            _expToRunsAndTags: {
                type: Object,
                value: function () { return null; },
            },
            _tagRegex: {
                type: String,
                value: '',
            },
            _requestManager: {
                type: Object,
                value: function () { return new tf_backend.RequestManager(); },
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
        attached: function () {
            var _this = this;
            this._updateExpKey = tf_backend.experimentsStore.addListener(function () {
                _this._allExperiments = tf_backend.experimentsStore.getExperiments();
            });
            this._allExperiments = tf_backend.experimentsStore.getExperiments();
            this._updateRunKey = tf_backend.runsStore.addListener(function () {
                _this._allRuns = Array.from(new Set(tf_backend.runsStore.getRuns()));
            });
            this._allRuns = Array.from(new Set(tf_backend.runsStore.getRuns()));
        },
        detached: function () {
            tf_backend.experimentsStore.removeListenerByKey(this._updateExpKey);
            tf_backend.experimentsStore.removeListenerByKey(this._updateRunKey);
        },
        _getExperimentColor: function () {
            return {
                getColor: function (item) {
                    return tf_color_scale.experimentsColorScale(item.title);
                },
            };
        },
        _getRunColor: function () {
            return {
                getColor: function (item) {
                    return tf_color_scale.runsColorScale(item.title);
                },
            };
        },
        _getRunsUsesCheckboxColors: function () {
            return this._selectedExperiments.length <= 1;
        },
        _getExperimentOptions: function (_) {
            return this._allExperiments
                .map(function (experiment) { return ({
                id: experiment.id,
                title: experiment.name,
                subtitle: getShortDateString(new Date(experiment.startTime)),
            }); });
        },
        _getRunOptions: function () {
            return this._allRuns.map(function (run) { return ({ id: run, title: run }); });
        },
        _computeSelection: function () {
            var _this = this;
            var expMap = new Map(this._allExperiments.map(function (exp) { return [exp.id, exp]; }));
            var selectedRunNames = new Set(this._selectedRuns.map(function (_a) {
                var title = _a.title;
                return title;
            }));
            var completeExps = this._selectedExperiments
                .filter(function (_a) {
                var id = _a.id;
                return (_this._expToRunsAndTags || new Map()).has(id);
            })
                .map(function (_a) {
                var id = _a.id;
                return expMap.get(id);
            });
            var selections = completeExps.map(function (experiment) {
                return {
                    experiment: experiment,
                    runs: _this._expToRunsAndTags.get(experiment.id)
                        .filter(function (run) { return selectedRunNames.has(run.name); }),
                    tagRegex: _this._tagRegex,
                };
            });
            return {
                type: selections.length == 1 ?
                    tf_data_selector.Type.SINGLE : tf_data_selector.Type.COMPARISON,
                selections: selections,
            };
        },
        _fetchNewRunsAndTags: function () {
            var _this = this;
            var expMap = new Map(this._allExperiments.map(function (exp) { return [exp.id, exp]; }));
            var expsToFetch = this._selectedExperiments
                .filter(function (_a) {
                var id = _a.id;
                return !(_this._expToRunsAndTags || new Map()).has(id);
            })
                .map(function (_a) {
                var id = _a.id;
                return expMap.get(id);
            });
            var fetches = expsToFetch.map(function (exp) { return _this._fetchRunsAndTags(exp); });
            Promise.all(fetches).then(function (results) {
                var newExpToRunsAndTags = new Map(_this._expToRunsAndTags);
                results.forEach(function (runs, index) {
                    var exp = expsToFetch[index];
                    newExpToRunsAndTags.set(exp.id, runs);
                });
                _this._expToRunsAndTags = newExpToRunsAndTags;
            });
        },
        _fetchRunsAndTags: function (exp) {
            var id = exp.id;
            console.assert(id != null, 'Expected an experiment Id');
            var url = tf_backend.getRouter().runsForExperiment(id);
            return this._requestManager.request(url);
        },
    });
    function getShortDateString(date) {
        return date.toLocaleDateString(undefined, {
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
        });
    }
})(tf_data_selector || (tf_data_selector = {})); // namespace tf_data_selector
