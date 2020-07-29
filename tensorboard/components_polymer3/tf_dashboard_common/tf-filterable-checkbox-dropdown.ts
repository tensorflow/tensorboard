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

import { PolymerElement, html } from "@polymer/polymer";
import { customElement, property } from "@polymer/decorators";
import "@polymer/paper-menu-button";
import { DO_NOT_SUBMIT } from "../tf-imports/polymer.html";
import { DO_NOT_SUBMIT } from "./tf-dropdown-trigger.html";
import { DO_NOT_SUBMIT } from "./tf-filterable-checkbox-list.html";
import "@polymer/paper-menu-button";
import { DO_NOT_SUBMIT } from "../tf-imports/polymer.html";
import { DO_NOT_SUBMIT } from "./tf-dropdown-trigger.html";
import { DO_NOT_SUBMIT } from "./tf-filterable-checkbox-list.html";
@customElement("tf-filterable-checkbox-dropdown")
class TfFilterableCheckboxDropdown extends PolymerElement {
    static readonly template = html `<paper-menu-button vertical-align="top" horizontal-align="left" no-overlap="true" opened="{{_opened}}">
      <tf-dropdown-trigger class="dropdown-trigger" slot="dropdown-trigger" label="[[label]]" label-float="[[labelFloat]]" name="[[_getValueLabel(selectedItems, items)]]"></tf-dropdown-trigger>
      <div slot="dropdown-content">
        <tf-filterable-checkbox-list coloring="[[_coloring]]" items="[[items]]" label="[[label]]" max-items-to-enable-by-default="[[maxItemsToEnableByDefault]]" selected-items="{{selectedItems}}" selection-state="[[selectionState]]" use-checkbox-colors="[[useCheckboxColors]]">
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
    </style>`;
    @property({ type: String })
    label: string;
    @property({ type: String })
    placeholder: string;
    @property({
        type: Boolean
    })
    labelFloat: boolean = false;
    @property({
        type: Boolean
    })
    useCheckboxColors: boolean = true;
    @property({ type: Object })
    coloring: object;
    @property({
        type: Array
    })
    items: unknown[] = () => [];
    @property({ type: Number })
    maxItemsToEnableByDefault: number;
    @property({
        type: Object
    })
    selectionState: object = () => ({});
    @property({
        type: Array,
        notify: true
    })
    selectedItems: unknown[] = () => [];
    @property({
        type: Boolean
    })
    _opened: boolean = false;
    // ====================== COMPUTED ======================
    _getValueLabel(_) {
        if (this.selectedItems.length == this.items.length) {
            return `All ${this.label}s`;
        }
        else if (!this.selectedItems.length) {
            return "";
        }
        else if (this.selectedItems.length <= 3) {
            const titles = this.selectedItems.map(({ title }) => title);
            const uniqueNames = new Set(titles);
            return Array.from(uniqueNames).join(", ");
        }
        return `${this.selectedItems.length} Selected`;
    }
    @computed("_opened", "coloring")
    get _coloring(): object {
        return Object.assign({}, this.coloring);
    }
}
