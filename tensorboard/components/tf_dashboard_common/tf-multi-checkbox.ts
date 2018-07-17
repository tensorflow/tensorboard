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
namespace tf_dashboard_common {

Polymer({
  is: 'tf-multi-checkbox',
  properties: {
    names: {
      type: Array,
      value: () => [],
    },  // All the values of checkbox
    coloring: {
      type: Object,
      value: {
        getColor: () => '',
      },
    },
    regex: {
      type: String,
      notify: true,
      value: '',
    },  // Regex for filtering the names
    _regex: {type: Object, computed: '_makeRegex(regex)'},
    namesMatchingRegex: {
      type: Array,
      computed: 'computeNamesMatchingRegex(names.*, _regex)'
    },  // Runs that match the regex
    selectionState: {
      // if a name is explicitly enabled, True, if explicitly disabled, False.
      // if undefined, default value (enable for first k names, disable after).
      type: Object,
      notify: true,
      value: () => ({}),
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
      value: function() {
        var debounced = _.debounce(r => {
          this.regex = r;
        }, 150, {leading: false});
        return function() {
          var r = this.$$('#names-regex').value;
          if (r == '') {
            // If the user cleared the field, they may be done typing, so
            // update more quickly.
            this.async(() => {
              this.regex = r;
            }, 30);
          } else {
            debounced(r);
          };
        };
      },
    },
  },
  listeners: {
    'dom-change': 'synchronizeColors',
  },
  observers: [
    '_setIsolatorIcon(selectionState, names)',
  ],
  _makeRegex: function(regexString) {
    try {
      return new RegExp(regexString);
    } catch (e) {
      return null;
    }
  },
  _setIsolatorIcon: function() {
    var selectionMap = this.selectionState;
    var numChecked = _.filter(_.values(selectionMap)).length;
    var buttons =
        Array.prototype.slice.call(this.querySelectorAll('.isolator'));

    buttons.forEach(function(b) {
      if (numChecked === 1 && selectionMap[b.name]) {
        b.icon = 'radio-button-checked';
      } else {
        b.icon = 'radio-button-unchecked';
      }
    });
  },
  computeNamesMatchingRegex: function(__, ___) {
    const regex = this._regex;
    return regex ? this.names.filter(n => regex.test(n)) : this.names;
  },
  computeOutSelected: function(__, ___) {
    var selectionState = this.selectionState;
    var num = this.maxNamesToEnableByDefault;
    var allEnabled = this.namesMatchingRegex.length <= num;
    return this.namesMatchingRegex
        .filter(n => {
          return selectionState[n] == null ? allEnabled : selectionState[n];
        });
  },
  synchronizeColors: function(e) {
    this._setIsolatorIcon();

    const checkboxes = this.querySelectorAll('paper-checkbox');
    checkboxes.forEach(p => {
      const color = this.coloring.getColor(p.name);
      p.customStyle['--paper-checkbox-checked-color'] = color;
      p.customStyle['--paper-checkbox-checked-ink-color'] = color;
      p.customStyle['--paper-checkbox-unchecked-color'] = color;
      p.customStyle['--paper-checkbox-unchecked-ink-color'] = color;
    });
    const buttons = this.querySelectorAll('.isolator');
    buttons.forEach(p => {
      const color = this.coloring.getColor(p.name);
      p.style['color'] = color;
    });
    // The updateStyles call fails silently if the browser doesn't have focus,
    // e.g. if TensorBoard was opened into a new tab that isn't visible.
    // So we wait for requestAnimationFrame.
    window.requestAnimationFrame(() => {
      this.updateStyles();
    });
  },
  _isolateName: function(e) {
    // If user clicks on the label for one name, enable it and disable all other
    // names.
    var name = (Polymer.dom(e) as any).localTarget.name;
    var selectionState = {};
    this.names.forEach(function(n) {
      selectionState[n] = n == name;
    });
    this.selectionState = selectionState;
  },
  _checkboxChange: function(e) {
    var target = (Polymer.dom(e) as any).localTarget;
    const newSelectionState = _.clone(this.selectionState);
    newSelectionState[target.name] = target.checked;
    // n.b. notifyPath won't work because names may have periods.
    this.selectionState = newSelectionState;
  },
  _isChecked: function(item, outSelectedChange) {
    return this.outSelected.indexOf(item) != -1;
  },
  toggleAll: function() {
    var anyToggledOn = this.namesMatchingRegex
        .some((n) => this.selectionState[n]);

    var selectionStateIsDefault =
        Object.keys(this.selectionState).length == 0;

    var defaultOff =
        this.namesMatchingRegex.length > this.maxRunsToEnableByDefault;
    // We have names toggled either if some were explicitly toggled on, or if
    // we are in the default state, and there are few enough that we default
    // to toggling on.
    anyToggledOn = anyToggledOn || selectionStateIsDefault && !defaultOff;

    // If any are toggled on, we turn everything off. Or, if none are toggled
    // on, we turn everything on.

    var newRunsDisabled = {};
    this.names.forEach(function(n) {
      newRunsDisabled[n] = !anyToggledOn;
    });
    this.selectionState = newRunsDisabled;
  },
});

}  // namespace tf_dashboard_common
