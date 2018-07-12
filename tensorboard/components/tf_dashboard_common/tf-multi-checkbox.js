/* Copyright 2017 The TensorFlow Authors. All Rights Reserved.

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
        is: 'tf-multi-checkbox',
        properties: {
            names: {
                type: Array,
                value: function () { return []; },
            },
            regex: {
                type: String,
                notify: true,
                value: '',
            },
            _regex: { type: Object, computed: '_makeRegex(regex)' },
            namesMatchingRegex: {
                type: Array,
                computed: 'computeNamesMatchingRegex(names.*, _regex)'
            },
            selectionState: {
                // if a name is explicitly enabled, True, if explicitly disabled, False.
                // if undefined, default value (enable for first k names, disable after).
                type: Object,
                notify: true,
                value: function () { return ({}); },
            },
            // (Allows state to persist across regex filtering)
            outSelected: {
                type: Array,
                notify: true,
                computed: 'computeOutSelected(namesMatchingRegex.*, selectionState.*)'
            },
            maxNamesToEnableByDefault: {
                // When TB first loads, if it has k or fewer names, they are all enabled
                // by default. If there are more, then they are all disabled.
                type: Number,
                value: 40,
            },
            _debouncedRegexChange: {
                type: Object,
                // Updating the regex can be slow, because it involves updating styles
                // on a large number of Polymer paper-checkboxes. We don't want to do
                // this while the user is typing, as it may make a bad, laggy UI.
                // So we debounce the updates that come from user typing.
                value: function () {
                    var _this = this;
                    var debounced = _.debounce(function (r) {
                        _this.regex = r;
                    }, 150, { leading: false });
                    return function () {
                        var _this = this;
                        var r = this.$$('#names-regex').value;
                        if (r == '') {
                            // If the user cleared the field, they may be done typing, so
                            // update more quickly.
                            this.async(function () {
                                _this.regex = r;
                            }, 30);
                        }
                        else {
                            debounced(r);
                        }
                        ;
                    };
                },
            },
        },
        listeners: {
            'dom-change': 'synchronizeColors',
        },
        observers: [
            '_setIsolatorIcon(selectedNames, names)',
        ],
        _makeRegex: function (regexString) {
            try {
                return new RegExp(regexString);
            }
            catch (e) {
                return null;
            }
        },
        _setIsolatorIcon: function () {
            var selectionMap = this.selectionState;
            var numChecked = _.filter(_.values(selectionMap)).length;
            var buttons = Array.prototype.slice.call(this.querySelectorAll('.isolator'));
            buttons.forEach(function (b) {
                if (numChecked === 1 && selectionMap[b.name]) {
                    b.icon = 'radio-button-checked';
                }
                else {
                    b.icon = 'radio-button-unchecked';
                }
            });
        },
        computeNamesMatchingRegex: function (__, ___) {
            var regex = this._regex;
            return regex ? this.names.filter(function (n) { return regex.test(n); }) : this.names;
        },
        computeOutSelected: function (__, ___) {
            var selectedNames = this.selectionState;
            var num = this.maxNamesToEnableByDefault;
            var allEnabled = this.namesMatchingRegex.length <= num;
            return this.namesMatchingRegex
                .filter(function (n) {
                return selectedNames[n] == null ? allEnabled : selectedNames[n];
            });
        },
        synchronizeColors: function (e) {
            var _this = this;
            this._setIsolatorIcon();
            var checkboxes = this.querySelectorAll('paper-checkbox');
            checkboxes.forEach(function (p) {
                var color = tf_color_scale.runsColorScale(p.name);
                p.customStyle['--paper-checkbox-checked-color'] = color;
                p.customStyle['--paper-checkbox-checked-ink-color'] = color;
                p.customStyle['--paper-checkbox-unchecked-color'] = color;
                p.customStyle['--paper-checkbox-unchecked-ink-color'] = color;
            });
            var buttons = this.querySelectorAll('.isolator');
            buttons.forEach(function (p) {
                var color = tf_color_scale.runsColorScale(p.name);
                p.style['color'] = color;
            });
            // The updateStyles call fails silently if the browser doesn't have focus,
            // e.g. if TensorBoard was opened into a new tab that isn't visible.
            // So we wait for requestAnimationFrame.
            window.requestAnimationFrame(function () {
                _this.updateStyles();
            });
        },
        _isolateName: function (e) {
            // If user clicks on the label for one name, enable it and disable all other
            // names.
            var name = Polymer.dom(e).localTarget.name;
            var selectedNames = {};
            this.names.forEach(function (n) {
                selectedNames[n] = n == name;
            });
            this.selectionState = selectedNames;
        },
        _checkboxChange: function (e) {
            var target = Polymer.dom(e).localTarget;
            var newSelectedNames = _.clone(this.selectionState);
            newSelectedNames[target.name] = target.checked;
            // n.b. notifyPath won't work because names may have periods.
            this.selectionState = newSelectedNames;
        },
        _isChecked: function (item, outSelectedChange) {
            return this.outSelected.indexOf(item) != -1;
        },
        toggleAll: function () {
            var _this = this;
            var anyToggledOn = this.namesMatchingRegex
                .some(function (n) { return _this.selectionState[n]; });
            var selectedNamesIsDefault = Object.keys(this.selectionState).length == 0;
            var defaultOff = this.namesMatchingRegex.length > this.maxRunsToEnableByDefault;
            // We have names toggled either if some were explicitly toggled on, or if
            // we are in the default state, and there are few enough that we default
            // to toggling on.
            anyToggledOn = anyToggledOn || selectedNamesIsDefault && !defaultOff;
            // If any are toggled on, we turn everything off. Or, if none are toggled
            // on, we turn everything on.
            var newRunsDisabled = {};
            this.names.forEach(function (n) {
                newRunsDisabled[n] = !anyToggledOn;
            });
            this.selectionState = newRunsDisabled;
        },
    });
})(tf_dashboard_common || (tf_dashboard_common = {})); // namespace tf_dashboard_common
