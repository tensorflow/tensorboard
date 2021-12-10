/* Copyright 2020 The TensorFlow Authors. All Rights Reserved.

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

import {computed, customElement, property} from '@polymer/decorators';
import {html, PolymerElement} from '@polymer/polymer';
import '../polymer/irons_and_papers';
import {LegacyElementMixin} from '../polymer/legacy_element_mixin';
import './tf-dropdown-trigger';
import {FilterableCheckboxListItem} from './tf-filterable-checkbox-list';

/*
tf-filterable-checkbox-dropdown creates a dropdown whose content is a list of
checkboxes with a filter input at the top. The list is primarily used for
multiple selection of items.

Properties in:
  - label: label for the dropdown trigger button.
  - placeholder: placeholder in the dropdown trigger button.
  - colorsCheckbox: whether to color the check boxes.
  - coloring: an object that contains method, getColor. Used only when
              colorsCheckbox is true,
  - items: items of {id: string, title: string, subtitle: ?string}.
  - maxItemsToEnableByDefault: maximum number of items to automatically enable.
  - selectionState: object of checkbox selections.

Properties out:
  - selectedItems: Array of items that are selected and not filterd out.
*/

@customElement('tf-filterable-checkbox-dropdown')
class TfFilterableCheckboxDropdown extends LegacyElementMixin(PolymerElement) {
  static readonly template = html`
    <paper-menu-button
      vertical-align="top"
      horizontal-align="left"
      no-overlap="true"
      opened="{{_opened}}"
    >
      <tf-dropdown-trigger
        class="dropdown-trigger"
        slot="dropdown-trigger"
        label="[[label]]"
        label-float="[[labelFloat]]"
        name="[[_getValueLabel(selectedItems, items)]]"
      ></tf-dropdown-trigger>
      <div slot="dropdown-content">
        <tf-filterable-checkbox-list
          coloring="[[_coloring]]"
          items="[[items]]"
          label="[[label]]"
          max-items-to-enable-by-default="[[maxItemsToEnableByDefault]]"
          selected-items="{{selectedItems}}"
          selection-state="[[selectionState]]"
          use-checkbox-colors="[[useCheckboxColors]]"
        >
        </tf-filterable-checkbox-list>
      </div>
    </paper-menu-button>
    <style>
      :host {
        padding: 8px;
      }

      tf-dropdown-trigger {
        --tf-dropdown-trigger-content: {
          font-size: 14px;
        }

        @apply --tf-filterable-checkbox-dropdown-trigger;
      }

      paper-menu-button {
        padding: 0;
      }

      .dropdown-content {
        padding: 10px 0;
      }
    </style>
  `;

  @property({type: String})
  label: string;

  @property({type: String})
  placeholder: string;

  @property({type: Boolean})
  labelFloat: boolean = false;

  @property({type: Boolean})
  useCheckboxColors: boolean = true;

  @property({type: Object})
  coloring: object;

  @property({
    type: Array,
  })
  items: FilterableCheckboxListItem[] = [];

  @property({type: Number})
  maxItemsToEnableByDefault: number;

  @property({type: Object})
  selectionState: Record<string, boolean> = {};

  @property({
    type: Array,
    notify: true,
  })
  selectedItems: FilterableCheckboxListItem[] = [];

  @property({
    type: Boolean,
  })
  _opened: boolean = false;

  // ====================== COMPUTED ======================
  _getValueLabel(_) {
    if (this.selectedItems.length == this.items.length) {
      return `All ${this.label}s`;
    } else if (!this.selectedItems.length) {
      return '';
    } else if (this.selectedItems.length <= 3) {
      const titles = this.selectedItems.map(({title}) => title);
      const uniqueNames = new Set(titles);
      return Array.from(uniqueNames).join(', ');
    }
    return `${this.selectedItems.length} Selected`;
  }

  @computed('_opened', 'coloring')
  get _coloring(): object {
    return Object.assign({}, this.coloring);
  }
}
