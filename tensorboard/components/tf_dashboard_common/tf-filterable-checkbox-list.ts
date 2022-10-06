/* Copyright 2018 The TensorFlow Authors. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/

import {computed, customElement, observe, property} from '@polymer/decorators';
import {html, PolymerElement} from '@polymer/polymer';
import '../polymer/irons_and_papers';
import {LegacyElementMixin} from '../polymer/legacy_element_mixin';
import './run-color-style';
import './scrollbar-style';

export type FilterableCheckboxListItem = {
  id: string | number;
  title: string;
  subtitle?: string;
};

/*
tf-filterable-checkbox-list creates a list of checkboxes with a filter input at
the top. The list is primarily used for multiple selection of items.

Properties in:
  - colorsCheckbox: whether to color the check boxes.
  - coloring: an object that contains method, getColor. Used only when
              colorsCheckbox is true,
  - items: items of {id: string, title: string, subtitle: ?string}.
  - maxItemsToEnableByDefault: maximum number of items to automatically enable.
  - selectionState: object denoting selection state of the checkboxes.

Properties out:
  - selectedItems: Array of items that are selected and not filtered out.
*/

@customElement('tf-filterable-checkbox-list')
class TfFilterableCheckboxList extends LegacyElementMixin(PolymerElement) {
  static readonly template = html`
    <style include="scrollbar-style"></style>
    <style include="run-color-style"></style>
    <div class="item">
      <paper-input
        id="input"
        autofocus=""
        class="input"
        no-label-float=""
        label="Write a regex to filter [[label]]s"
        value="[[_regexString]]"
        on-bind-value-changed="_debouncedRegexChange"
      >
      </paper-input>
    </div>
    <div class="matches">
      <template is="dom-if" if="[[!_itemsMatchingRegex.length]]">
        <div class="item empty-match">No matches</div>
      </template>
      <template
        is="dom-repeat"
        items="[[_itemsMatchingRegex]]"
        on-dom-change="_synchronizeColors"
      >
        <div class="item">
          <paper-checkbox
            checked$="[[_isChecked(item, selectionState.*)]]"
            class="checkbox"
            name="[[item]]"
            on-tap="_checkboxTapped"
            title="Alt+Click to select only [[item.title]]."
          >
            <span>[[item.title]]</span>

            <template is="dom-if" if="[[item.subtitle]]">
              <span class="subtitle">[[item.subtitle]]</span>
            </template>
          </paper-checkbox>
        </div>
      </template>
    </div>
    <template is="dom-if" if="[[!allToggleDisabled]]">
      <div class="item">
        <paper-button class="x-button" on-tap="_toggleAll">
          Toggle All [[label]]s
        </paper-button>
      </div>
    </template>
    <style>
      paper-input {
        --paper-input-container-focus-color: var(--tb-orange-strong);
        --paper-input-container-input: {
          font-size: 14px;
        }
        --paper-input-container-label: {
          font-size: 14px;
        }
      }

      paper-checkbox {
        --paper-checkbox-ink-size: 40px;
        --paper-checkbox-label: {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          text-overflow: ellipsis;
          word-break: break-word;
        }
      }

      .subtitle {
        color: var(--paper-grey-700);
        font-size: 13px;
      }

      paper-menu-button {
        padding: 0;
      }

      paper-ripple {
        top: 12px;
        left: 0;
        right: 0;
        bottom: 8px;
      }

      .dropdown-content {
        padding: 10px 0;
      }

      .input {
        width: 100%;
      }

      .item {
        align-items: center;
        box-sizing: border-box;
        display: flex;
        flex-direction: row;
        font-family: inherit;
        font-size: 14px;
        line-height: 24px;
        margin: 3px 0;
        padding: 0 16px;
        max-width: var(--tf-filterable-checkbox-list-content-max-width, 450px);
      }

      .matches {
        max-height: 300px;
        overflow-y: auto;
        padding: 5px 0;
      }

      .checkbox {
        width: 100%;
        display: flex;
        padding: 5px 0;
        align-items: center;
      }

      .empty-match {
        color: var(--paper-grey-600);
        font-size: 14px;
      }

      .x-button {
        width: 100%;
      }
    </style>
  `;

  @property({type: String})
  label: string;

  @property({
    type: Boolean,
  })
  useCheckboxColors: boolean = true;

  @property({
    type: Object,
  })
  coloring: {getColor: (FilterableCheckboxListItem) => string} = {
    getColor: (item: FilterableCheckboxListItem): string => '',
  };

  @property({
    type: Array,
    observer: '_pruneSelectionState',
  })
  items: FilterableCheckboxListItem[] = [];

  @property({
    type: String,
  })
  _regexString: string = '';

  @property({
    type: Array,
    computed: 'computeItemsMatchingRegex(items.*, _regex)',
  })
  _itemsMatchingRegex: FilterableCheckboxListItem[];

  @property({
    // if an item is explicitly enabled, True, if explicitly disabled, False.
    // if undefined, default value (enable for first k items, disable after).
    type: Object,
  })
  selectionState: object = () => ({});

  @property({
    type: Array,
    notify: true,
    computed: '_computeSelectedItems(_itemsMatchingRegex.*, selectionState.*)',
  })
  selectedItems: unknown[];

  @property({
    // When TB first loads, if it has k or fewer items, they are all enabled
    // by default. If there are more, then all items are disabled.
    type: Number,
  })
  maxItemsToEnableByDefault: number = 40;

  @property({
    type: Boolean,
  })
  allToggleDisabled: boolean = false;

  override detached() {
    this.cancelDebouncer('_setRegex');
  }

  @computed('_regexString')
  get _regex(): RegExp | null {
    var regexString = this._regexString;
    try {
      return new RegExp(regexString);
    } catch (e) {
      return null;
    }
  }

  computeItemsMatchingRegex(__, ___) {
    const regex = this._regex;
    return regex ? this.items.filter((n) => regex.test(n.title)) : this.items;
  }

  _computeSelectedItems(__, ___) {
    const selectionState = this.selectionState;
    const num = this.maxItemsToEnableByDefault;
    const allEnabled = this._itemsMatchingRegex.length <= num;
    return this._itemsMatchingRegex.filter((n) => {
      return selectionState[n.id] == null ? allEnabled : selectionState[n.id];
    });
  }
  _isChecked(item, _) {
    return this.selectedItems.indexOf(item) != -1;
  }
  // ================== EVENT LISTENERS ===================
  _debouncedRegexChange() {
    const val = (this.$.input as any).value;
    if (val == '') {
      // If the user cleared the field, they may be done typing, so
      // update more quickly.
      window.requestAnimationFrame(() => {
        this._regexString = val;
      });
    } else {
      this.debounce(
        '_setRegex',
        () => {
          this._regexString = val;
        },
        150
      );
    }
  }

  @observe('coloring')
  _synchronizeColors() {
    var e = this.coloring;
    const checkboxes = this.root?.querySelectorAll('paper-checkbox') ?? [];
    checkboxes.forEach((cb) => {
      // Setting the null value will clear previously set color.
      const color = this.useCheckboxColors
        ? this.coloring.getColor((cb as any).name)
        : null;
      const customStyle = (cb as any).customStyle;
      customStyle['--paper-checkbox-checked-color'] = color;
      customStyle['--paper-checkbox-checked-ink-color'] = color;
      customStyle['--paper-checkbox-unchecked-color'] = color;
      customStyle['--paper-checkbox-unchecked-ink-color'] = color;
    });
    // The updateStyles call fails silently if the browser does not have focus,
    // e.g., if TensorBoard was opened into a new tab that is not visible.
    // So we wait for requestAnimationFrame.
    window.requestAnimationFrame(() => this.updateStyles());
  }

  _checkboxTapped(e) {
    const checkbox = e.currentTarget;
    const newSelectedNames = Object.assign({}, this.selectionState, {
      [checkbox.name.id]: checkbox.checked,
    });
    // If user presses alt while toggling checkbox, it deselects all items but
    // the clicked one.
    if (
      e.detail.sourceEvent instanceof MouseEvent &&
      e.detail.sourceEvent.altKey
    ) {
      Object.keys(newSelectedNames).forEach((key) => {
        newSelectedNames[key] = key == checkbox.name.id;
      });
    }
    // n.b. notifyPath won't work because names may have periods.
    this.selectionState = newSelectedNames;
  }

  _toggleAll() {
    let anyToggledOn = this._itemsMatchingRegex.some(
      (n) => this.selectionState[n.id]
    );
    const selectionStateIsDefault =
      Object.keys(this.selectionState).length == 0;
    const defaultOff =
      this._itemsMatchingRegex.length > this.maxItemsToEnableByDefault;
    // We have names toggled either if some were explicitly toggled on, or if
    // we are in the default state, and there are few enough that we default
    // to toggling on.
    anyToggledOn = anyToggledOn || (selectionStateIsDefault && !defaultOff);
    // If any are toggled on, we turn everything off. Or, if none are toggled
    // on, we turn everything on.
    const newSelection = {};
    this.items.forEach((n) => {
      newSelection[n.id] = !anyToggledOn;
    });
    this.selectionState = newSelection;
  }

  /**
   * Remove selection state of an item that no longer exists in the `items`.
   */
  _pruneSelectionState() {
    // Object key turns numbered keys into string.
    const itemIds = new Set(this.items.map(({id}) => String(id)));
    const newSelection = Object.assign({}, this.selectionState);
    Object.keys(newSelection).forEach((key) => {
      if (!itemIds.has(key)) delete newSelection[key];
    });
    this.selectionState = newSelection;
  }
}
