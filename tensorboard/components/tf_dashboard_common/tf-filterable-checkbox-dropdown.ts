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
  is: 'tf-filterable-checkbox-dropdown',
  properties: {
    label: {type: String},

    placeholder: {type: String},

    // ====== Pass through properties ======

    useCheckboxColors: {
      type: Boolean,
      value: true,
    },

    coloring: Object,

    items: {
      type: Array,
      value: () => [],
    },

    maxItemsToEnableByDefault: Number,

    selectionState: {
      type: Object,
      value: () => ({}),
    },

    selectedItems: {
      type: Array,
      notify: true,
      value: () => [],
    },

    // ====== Computed properties ======

    _labelValue: {
      type: String,
      computed: '_computeValueLabel(selectedItems)',
    },
  },

  // ====================== COMPUTED ======================

  _computeValueLabel(_) {
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
  },

});

}  // namespace tf_dashboard_common
