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
        is: 'tf-data-select-row',
        properties: {
            experiment: Object,
            _runs: Array,
            selectedRuns: {
                type: Array,
                notify: true,
                value: function () { return []; },
            },
            _runSelectionState: {
                type: Object,
                observer: '_storeRunSelectionState',
                value: function () { return tf_storage.getObject('runSelectionState') || {}; },
            },
            _runRegexInput: {
                type: String,
                value: tf_storage.getStringInitializer('regexInput', {
                    defaultValue: '',
                    polymerProperty: '_runRegexInput',
                }),
                observer: '_storeRunRegexInput',
            },
        },
        get _runsStore() {
            return tf_backend.runsStore;
        },
        attached: function () {
            var _this = this;
            this._updateRunKey = this._runsStore.addListener(function () { return _this._updateRuns(); });
            this._updateRuns();
        },
        detached: function () {
            this._runsStore.removeListenerByKey(this._updateRunKey);
        },
        _updateRuns: function () {
            this.set('_runs', this._runsStore.getRuns());
        },
        _storeRunSelectionState: tf_storage.getObjectObserver('runSelectionState', {
            defaultValue: {},
            polymerProperty: '_runSelectionState',
        }),
        _storeRunRegexInput: tf_storage.getStringObserver('regexInput', {
            defaultValue: '',
            polymerProperty: '_runRegexInput',
        }),
    });
})(tf_data_selector || (tf_data_selector = {})); // namespace tf_data_selector
