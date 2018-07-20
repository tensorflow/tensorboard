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
            experiments: Array,
            experimentColors: {
                type: Array,
                value: function () { return []; },
            },
            // TODO(stephanwlee): Figure out how to communicate group selection to
            // plugins. It should be some data structure, not experiments, runs, and
            // tags all separted.
            runs: Array,
            runsColors: {
                type: Array,
                value: function () { return []; },
            },
            selectedRuns: {
                type: Array,
                notify: true,
                value: function () { return []; },
            },
            runSelectionState: {
                type: Object,
                observer: '_storeRunSelectionState',
                value: function () { return tf_storage.getObject('runSelectionState') || {}; },
            },
            runRegexInput: {
                type: String,
                value: tf_storage.getStringInitializer('regexInput', { defaultValue: '' }),
                observer: '_runRegexInput',
            },
        },
        get expsStore() {
            return tf_backend.experimentsStore;
        },
        get runsStore() {
            return tf_backend.runsStore;
        },
        attached: function () {
            var _this = this;
            this._updateExpKey = this.expsStore.addListener(function () { return _this._updateExps(); });
            this._updateRunKey = this.runsStore.addListener(function () { return _this._updateRuns(); });
            this._updateExps();
            this._updateRuns();
        },
        detached: function () {
            this.expsStore.removeListenerByKey(this._updateExpKey);
            this.runsStore.removeListenerByKey(this._updateRunKey);
        },
        _updateExps: function () {
            var expNames = this.expsStore.getExperiments().map(function (_a) {
                var name = _a.name;
                return name;
            });
            this.set('experiments', expNames);
        },
        _updateRuns: function () {
            var runNames = this.runsStore.getRuns();
            this.set('runs', runNames);
        },
        _storeRunSelectionState: tf_storage.getObjectObserver('runSelectionState', { defaultValue: {} }),
        _runRegexInput: tf_storage.getStringObserver('regexInput', { defaultValue: '' }),
    });
})(tf_data_selector || (tf_data_selector = {})); // namespace tf_data_selector
