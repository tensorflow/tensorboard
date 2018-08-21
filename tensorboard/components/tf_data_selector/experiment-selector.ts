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
namespace tf_data_selector {

Polymer({
  is: 'experiment-selector',
  properties: {
    excludeExperiments: {
      type: Array,
      value: (): Array<tf_backend.Experiment> => [],
    },

    alwaysExpanded: {
      type: Boolean,
      value: false,
    },

    _expanded: {
      type: Boolean,
      value: false,
    },

    _allExperiments: {
      type: Array,
      value: (): Array<tf_backend.Experiment> => [],
    },

    _experimentColoring: {
      type: Object,
      value: {
        getColor: (item) => tf_color_scale.experimentsColorScale(item.title),
      },
    },

    _selectedExpOptions: {
      type: Array,
      value: (): Array<tf_dashboard_common.FilterableCheckboxListItem> => [],
    },
  },

  observers: [
    '_changeExpanded(alwaysExpanded)',
  ],

  attached() {
    this._updateExpKey = tf_backend.experimentsStore
        .addListener(() => this._updateExps());
    this._updateExps();
  },

  detached() {
    tf_backend.experimentsStore.removeListenerByKey(this._updateExpKey);
  },

  _updateExps() {
    this.set('_allExperiments', tf_backend.experimentsStore.getExperiments());
  },

  _getExperimentOptions(_) {
    const exclude = new Set(this.excludeExperiments.map(({id}) => id));
    return this._allExperiments
        .filter(({id}) => !exclude.has(id))
        .map(exp => ({
          id: exp.id,
          title: exp.name,
          subtitle: exp.startedTime,
        }));
  },

  _changeExpanded() {
    if (this.alwaysExpanded && !this._expanded) {
      this._expanded = true;
    }
  },

  _toggle() {
    this._expanded = !this._expanded;
  },

  _addExperiments() {
    const lookupMap = new Map(this._allExperiments.map(e => [e.id, e]));
    const newItems = this._selectedExpOptions
        .map(({id}) => lookupMap.get(id));
    this._expanded = false;
    this.fire('experiment-added', newItems);
  },

  _getAddLabel(_) {
    switch (this._selectedExpOptions.length) {
      case 0:
      case 1:
        return 'Add';
      default:
        return 'Add All'
    }
  },

});

}  // namespace tf_data_selector
