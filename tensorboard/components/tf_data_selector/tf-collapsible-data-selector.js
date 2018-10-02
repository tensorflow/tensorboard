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
    var Mode;
    (function (Mode) {
        Mode[Mode["SIMPLE"] = 0] = "SIMPLE";
        Mode[Mode["ADVANCED"] = 1] = "ADVANCED";
    })(Mode || (Mode = {}));
    Polymer({
        is: 'tf-collapsible-data-selector',
        properties: {
            _simpleSelection: {
                type: Object,
                value: function () { return ({}); },
            },
            _advancedSelection: {
                type: Object,
                value: function () { return ({}); },
            },
            selection: {
                type: Object,
                computed: '_computeSelection(_simpleSelection, _advancedSelection, _mode)',
                notify: true,
            },
            activePlugins: Array,
            opened: {
                type: Boolean,
                reflectToAttribute: true,
                value: true,
            },
            _mode: {
                type: Number,
                value: Mode.SIMPLE,
            },
        },
        _computeSelection: function () {
            if (this._mode == Mode.SIMPLE)
                return this._simpleSelection;
            return this._advancedSelection;
        },
        _toggleOpened: function () {
            this.opened = !this.opened;
        },
        _getExperimentStyle: function (experiment) {
            if (!experiment)
                return '';
            var color = tf_color_scale.experimentsColorScale(experiment.name);
            return "background-color: " + color + ";";
        },
        _isSimpleMode: function (mode) {
            return mode == Mode.SIMPLE;
        },
        _toggleMode: function () {
            var curMode = this._mode;
            var nextMode = curMode == Mode.SIMPLE ? Mode.ADVANCED : Mode.SIMPLE;
            this._mode = nextMode;
        },
    });
})(tf_data_selector || (tf_data_selector = {})); // namespace tf_data_selector
