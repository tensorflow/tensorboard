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
var tf_dashboard_common;
(function (tf_dashboard_common) {
    Polymer({
        is: 'tf-filterable-checkbox-list',
        properties: {
            label: { type: String },
            useCheckboxColors: {
                type: Boolean,
                value: true,
            },
            coloring: {
                type: Object,
                value: {
                    getColor: function (item) { return ''; },
                },
            },
            // `items` are Array of {id: string, title: string, subtitle: ?string}.
            items: {
                type: Array,
                value: function () { return []; },
                observer: '_pruneSelectedItems',
            },
            _regexString: {
                type: String,
                value: '',
            },
            _regex: { type: Object, computed: '_makeRegex(_regexString)' },
            _itemsMatchingRegex: {
                type: Array,
                computed: 'computeItemsMatchingRegex(items.*, _regex)'
            },
            selectionState: {
                // if an item is explicitly enabled, True, if explicitly disabled, False.
                // if undefined, default value (enable for first k items, disable after).
                type: Object,
                value: function () { return ({}); },
            },
            selectedItems: {
                type: Array,
                notify: true,
                computed: '_computeSelectedItems(_itemsMatchingRegex.*, selectionState.*)',
            },
            maxItemsToEnableByDefault: {
                // When TB first loads, if it has k or fewer items, they are all enabled
                // by default. If there are more, then all items are disabled.
                type: Number,
                value: 40,
            },
            allToggleDisabled: {
                type: Boolean,
                value: false,
            },
        },
        listeners: {
            'dom-change': '_synchronizeColors',
        },
        // ====================== COMPUTED ======================
        _makeRegex: function (regexString) {
            try {
                return new RegExp(regexString);
            }
            catch (e) {
                return null;
            }
        },
        computeItemsMatchingRegex: function (__, ___) {
            var regex = this._regex;
            return regex ? this.items.filter(function (n) { return regex.test(n.title); }) : this.items;
        },
        _computeSelectedItems: function (__, ___) {
            var selectionState = this.selectionState;
            var num = this.maxItemsToEnableByDefault;
            var allEnabled = this._itemsMatchingRegex.length <= num;
            return this._itemsMatchingRegex
                .filter(function (n) {
                return selectionState[n.id] == null ?
                    allEnabled : selectionState[n.id];
            });
        },
        _isChecked: function (item, _) {
            return this.selectedItems.indexOf(item) != -1;
        },
        // ================== EVENT LISTENERS ===================
        _debouncedRegexChange: function () {
            var _this = this;
            var val = this.$.input.value;
            if (val == '') {
                // If the user cleared the field, they may be done typing, so
                // update more quickly.
                window.requestAnimationFrame(function () {
                    _this._regexString = val;
                });
            }
            else {
                this.debounce('_setRegex', function () {
                    _this._regexString = val;
                }, 150);
            }
            ;
        },
        _synchronizeColors: function (e) {
            var _this = this;
            if (!this.useCheckboxColors)
                return;
            var checkboxes = this.querySelectorAll('paper-checkbox');
            checkboxes.forEach(function (cb) {
                var color = _this.coloring.getColor(cb.name);
                cb.customStyle['--paper-checkbox-checked-color'] = color;
                cb.customStyle['--paper-checkbox-checked-ink-color'] = color;
                cb.customStyle['--paper-checkbox-unchecked-color'] = color;
                cb.customStyle['--paper-checkbox-unchecked-ink-color'] = color;
            });
            // The updateStyles call fails silently if the browser does not have focus,
            // e.g., if TensorBoard was opened into a new tab that is not visible.
            // So we wait for requestAnimationFrame.
            window.requestAnimationFrame(function () { return _this.updateStyles(); });
        },
        _checkboxChange: function (e) {
            var checkbox = Polymer.dom(e).localTarget;
            var newSelectedNames = Object.assign({}, this.selectionState, (_a = {},
                _a[checkbox.name.id] = checkbox.checked,
                _a));
            // n.b. notifyPath won't work because names may have periods.
            this.selectionState = newSelectedNames;
            var _a;
        },
        _toggleAll: function () {
            var _this = this;
            var anyToggledOn = this._itemsMatchingRegex
                .some(function (n) { return _this.selectionState[n.id]; });
            var selectionStateIsDefault = Object.keys(this.selectionState).length == 0;
            var defaultOff = this._itemsMatchingRegex.length > this.maxItemsToEnableByDefault;
            // We have names toggled either if some were explicitly toggled on, or if
            // we are in the default state, and there are few enough that we default
            // to toggling on.
            anyToggledOn = anyToggledOn || selectionStateIsDefault && !defaultOff;
            // If any are toggled on, we turn everything off. Or, if none are toggled
            // on, we turn everything on.
            var newSelection = {};
            this.items.forEach(function (n) {
                newSelection[n.id] = !anyToggledOn;
            });
            this.selectionState = newSelection;
        },
        _pruneSelectedItems: function () {
            // Object key turns numbered keys into string.
            var itemIds = new Set(this.items.map(function (_a) {
                var id = _a.id;
                return String(id);
            }));
            var newSelection = Object.assign({}, this.selectionState);
            Object.keys(newSelection).forEach(function (key) {
                if (!itemIds.has(key))
                    delete newSelection[key];
            });
            this.selectionState = newSelection;
        },
    });
})(tf_dashboard_common || (tf_dashboard_common = {})); // namespace tf_dashboard_common
