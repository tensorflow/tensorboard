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

export type FilterableCheckboxListItem = {
  id: string|number,
  title: string,
  subtitle?: string,
}

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
        getColor: (item: FilterableCheckboxListItem): string => '',
      },
    },

    // `items` are Array of {id: string, title: string, subtitle: ?string}.
    items: {
      type: Array,
      value: (): Array<FilterableCheckboxListItem> => [],
      observer: '_pruneSelectionState',
    },

    _regexString: {
      type: String,
      value: '',
    },

    _regex: {type: Object, computed: '_makeRegex(_regexString)'},

    _itemsMatchingRegex: {
      type: Array,
      computed: 'computeItemsMatchingRegex(items.*, _regex)'
    },

    selectionState: {
      // if an item is explicitly enabled, True, if explicitly disabled, False.
      // if undefined, default value (enable for first k items, disable after).
      type: Object,
      value: () => ({}),
    },

    selectedItems: {
      type: Array,
      notify: true,
      computed:
          '_computeSelectedItems(_itemsMatchingRegex.*, selectionState.*)',
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

  observers: [
    '_synchronizeColors(useCheckboxColors)',
    '_synchronizeColors(coloring)',
  ],

  detached() {
    this.cancelDebouncer('_setRegex');
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
    return regex ? this.items.filter(n => regex.test(n.title)) : this.items;
  },

  _computeSelectedItems(__, ___) {
    const selectionState = this.selectionState;
    const num = this.maxItemsToEnableByDefault;
    const allEnabled = this._itemsMatchingRegex.length <= num;
    return this._itemsMatchingRegex
        .filter(n => {
          return selectionState[n.id] == null ?
              allEnabled : selectionState[n.id];
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
        this._regexString = val;
      });
    } else {
      this.debounce('_setRegex', () => {
        this._regexString = val;
      }, 150);
    };
  },

  _synchronizeColors(e) {
    const checkboxes = this.querySelectorAll('paper-checkbox');

    checkboxes.forEach(cb => {
      // Setting the null value will clear previously set color.
      const color = this.useCheckboxColors ?
          this.coloring.getColor(cb.name) :
          null;
      cb.customStyle['--paper-checkbox-checked-color'] = color;
      cb.customStyle['--paper-checkbox-checked-ink-color'] = color;
      cb.customStyle['--paper-checkbox-unchecked-color'] = color;
      cb.customStyle['--paper-checkbox-unchecked-ink-color'] = color;
    });

    // The updateStyles call fails silently if the browser does not have focus,
    // e.g., if TensorBoard was opened into a new tab that is not visible.
    // So we wait for requestAnimationFrame.
    window.requestAnimationFrame(() => this.updateStyles());
  },

  _checkboxTapped(e) {
    const checkbox = e.currentTarget;
    const newSelectedNames = Object.assign({}, this.selectionState, {
      [checkbox.name.id]: checkbox.checked,
    });

    // If user presses alt while toggling checkbox, it deselects all items but
    // the clicked one.
    if (e.detail.sourceEvent instanceof MouseEvent &&
        e.detail.sourceEvent.altKey) {
      Object.keys(newSelectedNames).forEach(key => {
        newSelectedNames[key] = key == checkbox.name.id;
      });
    }

    // n.b. notifyPath won't work because names may have periods.
    this.selectionState = newSelectedNames;
  },

  _toggleAll() {
    let anyToggledOn = this._itemsMatchingRegex
        .some((n) => this.selectionState[n.id]);

    const selectionStateIsDefault =
        Object.keys(this.selectionState).length == 0;

    const defaultOff =
        this._itemsMatchingRegex.length > this.maxItemsToEnableByDefault;
    // We have names toggled either if some were explicitly toggled on, or if
    // we are in the default state, and there are few enough that we default
    // to toggling on.
    anyToggledOn = anyToggledOn || selectionStateIsDefault && !defaultOff;

    // If any are toggled on, we turn everything off. Or, if none are toggled
    // on, we turn everything on.
    const newSelection = {};
    this.items.forEach((n) => {
      newSelection[n.id] = !anyToggledOn;
    });
    this.selectionState = newSelection;
  },

  /**
   * Remove selection state of an item that no longer exists in the `items`.
   */
  _pruneSelectionState() {
    // Object key turns numbered keys into string.
    const itemIds = new Set(this.items.map(({id}) => String(id)));
    const newSelection = Object.assign({}, this.selectionState);
    Object.keys(newSelection).forEach(key => {
      if (!itemIds.has(key)) delete newSelection[key];
    });
    this.selectionState = newSelection;
  },
});

}  // namespace tf_dashboard_common
