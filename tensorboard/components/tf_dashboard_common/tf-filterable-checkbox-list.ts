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
namespace tf_dashboard_common {

Polymer({
  is: 'tf-filterable-checkbox-list',
  properties: {
    label: {type: String},

    useCheckboxColors: {
      type: Boolean,
      value: true,
    },

    coloring: {
      type: Object,
      value: {
        getColor: () => '',
      },
    },

    // TODO(stephanwlee): Define a more rigid type of an item.
    items: {
      type: Array,
      value: () => [],
    },

    regexString: {
      type: String,
      notify: true,
      value: '',
    },

    _regex: {type: Object, computed: '_makeRegex(regexString)'},

    _itemsMatchingRegex: {
      type: Array,
      computed: 'computeItemsMatchingRegex(items.*, _regex)'
    },

    selectionState: {
      // if an item is explicitly enabled, True, if explicitly disabled, False.
      // if undefined, default value (enable for first k items, disable after).
      type: Object,
      notify: true,
      value: () => ({}),
    },

    selectedItems: {
      type: Array,
      notify: true,
      computed: '_computeValue(_itemsMatchingRegex.*, selectionState.*)',
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

  _makeRegex(regexString) {
    try {
      return new RegExp(regexString);
    } catch (e) {
      return null;
    }
  },

  computeItemsMatchingRegex(__, ___) {
    const regex = this._regex;
    return regex ? this.items.filter(n => regex.test(n)) : this.items;
  },

  _computeValue(__, ___) {
    const selectedNames = this.selectionState;
    const num = this.maxItemsToEnableByDefault;
    const allEnabled = this._itemsMatchingRegex.length <= num;
    return this._itemsMatchingRegex
        .filter(n => {
          return selectedNames[n] == null ? allEnabled : selectedNames[n];
        });
  },

  _isChecked(item, _) {
    return this.selectedItems.indexOf(item) != -1;
  },


  // ================== EVENT LISTENERS ===================

  _debouncedRegexChange() {
    const val = this.$.input.value;
    if (val == '') {
      // If the user cleared the field, they may be done typing, so
      // update more quickly.
      window.requestAnimationFrame(() => {
        this.regexString = val;
      });
    } else {
      this.debounce('_setRegex', () => {
        this.regexString = val;
      }, 150);
    };
  },

  _synchronizeColors(e) {
    if (!this.useCheckboxColors) return;
    const checkboxes = this.querySelectorAll('paper-checkbox');
    const buttons = this.querySelectorAll('.isolator');

    checkboxes.forEach(p => {
      const color = this.coloring.getColor(p.name);
      p.customStyle['--paper-checkbox-checked-color'] = color;
      p.customStyle['--paper-checkbox-checked-ink-color'] = color;
      p.customStyle['--paper-checkbox-unchecked-color'] = color;
      p.customStyle['--paper-checkbox-unchecked-ink-color'] = color;
    });

    buttons.forEach(p => {
      p.style['color'] = this.coloring.getColor(p.name);
    });

    // The updateStyles call fails silently if the browser does not have focus,
    // e.g., if TensorBoard was opened into a new tab that is not visible.
    // So we wait for requestAnimationFrame.
    window.requestAnimationFrame(() => this.updateStyles());
  },

  _checkboxChange(e) {
    const checkbox = (Polymer.dom(e) as any).localTarget;
    const newSelectedNames = Object.assign({}, this.selectionState);
    newSelectedNames[checkbox.name] = checkbox.checked;
    // n.b. notifyPath won't work because names may have periods.
    this.selectionState = newSelectedNames;
  },

  _toggleAll() {
    let anyToggledOn = this._itemsMatchingRegex
        .some((n) => this.selectionState[n]);

    const selectedNamesIsDefault =
        Object.keys(this.selectionState).length == 0;

    const defaultOff =
        this._itemsMatchingRegex.length > this.maxItemsToEnableByDefault;
    // We have names toggled either if some were explicitly toggled on, or if
    // we are in the default state, and there are few enough that we default
    // to toggling on.
    anyToggledOn = anyToggledOn || selectedNamesIsDefault && !defaultOff;

    // If any are toggled on, we turn everything off. Or, if none are toggled
    // on, we turn everything on.
    const newSelection = {};
    this.items.forEach((n) => {
      newSelection[n] = !anyToggledOn;
    });
    this.selectionState = newSelection;
  },

});

}  // namespace tf_dashboard_common
