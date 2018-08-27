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
        is: 'experiment-selector',
        properties: {
            excludeExperiments: {
                type: Array,
                value: function () { return []; },
            },
            alwaysExpanded: {
                type: Boolean,
                value: false,
            },
            _expanded: {
                type: Boolean,
                value: false,
            },
            _allExperiments: {
                type: Array,
                value: function () { return []; },
            },
            _experimentColoring: {
                type: Object,
                value: {
                    getColor: function (item) { return tf_color_scale.experimentsColorScale(item.title); },
                },
            },
            _selectedExpOptions: {
                type: Array,
                value: function () { return []; },
            },
        },
        observers: [
            '_changeExpanded(alwaysExpanded)',
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
        _getExperimentOptions: function (_) {
            var exclude = new Set(this.excludeExperiments.map(function (_a) {
                var id = _a.id;
                return id;
            }));
            return this._allExperiments
                .filter(function (_a) {
                var id = _a.id;
                return !exclude.has(id);
            })
                .map(function (exp) { return ({
                id: exp.id,
                title: exp.name,
                subtitle: exp.startedTime,
            }); });
        },
        _changeExpanded: function () {
            if (this.alwaysExpanded && !this._expanded) {
                this._expanded = true;
            }
        },
        _toggle: function () {
            this._expanded = !this._expanded;
        },
        _addExperiments: function () {
            var lookupMap = new Map(this._allExperiments.map(function (e) { return [e.id, e]; }));
            var newItems = this._selectedExpOptions
                .map(function (_a) {
                var id = _a.id;
                return lookupMap.get(id);
            });
            this._expanded = false;
            this.fire('experiment-added', newItems);
        },
        _getAddLabel: function (_) {
            switch (this._selectedExpOptions.length) {
                case 0:
                case 1:
                    return 'Add';
                default:
                    return 'Add All';
            }
        },
    });
})(tf_data_selector || (tf_data_selector = {})); // namespace tf_data_selector
