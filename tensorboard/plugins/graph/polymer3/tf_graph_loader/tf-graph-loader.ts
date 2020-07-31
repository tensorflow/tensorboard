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

import {PolymerElement, html} from '@polymer/polymer';
import {customElement, observe, property} from '@polymer/decorators';

import * as tf_graph_hierarchy from '../tf_graph_common/hierarchy';
import * as tf_graph_loader from '../tf_graph_common/loader';
import * as tf_graph_op from '../tf_graph_common/op';
import * as tf_graph_util from '../tf_graph_common/util';
import {LegacyElementMixin} from '../../../../components_polymer3/polymer/legacy_element_mixin';

@customElement('tf-graph-loader')
class TfGraphLoader extends LegacyElementMixin(PolymerElement) {
  /**
   * @type {Array<{name: string, path: string}>}
   */
  @property({type: Array})
  datasets: any[];
  @property({
    type: Number,
  })
  selectedData: number = 0;
  @property({type: Object})
  selectedFile: object;
  @property({
    type: Object,
  })
  compatibilityProvider: any = () => new tf_graph_op.TpuCompatibilityProvider();
  /**
   * If this optional object is provided, graph logic will override
   * the HierarchyParams it uses to build the graph with properties within
   * this object. For possible properties that this object can have, please
   * see documentation on the HierarchyParams TypeScript interface.
   * @type {Object}
   */
  @property({
    type: Object,
  })
  overridingHierarchyParams: object = () => ({});
  /**
   * @type {{value: number, msg: string}}
   *
   * A number between 0 and 100 denoting the % of progress
   * for the progress bar and the displayed message.
   */
  @property({
    type: Object,
    notify: true,
  })
  progress: object;
  @property({
    type: Object,
    readOnly: true, //readonly so outsider can't change this via binding
    notify: true,
  })
  outGraphHierarchy: object;
  @property({
    type: Object,
    readOnly: true, //readonly so outsider can't change this via binding
    notify: true,
  })
  outGraph: object;
  @property({
    type: Object,
    readOnly: true,
    notify: true,
  })
  outHierarchyParams: object;
  _template = null;
  @observe(
    'datasets',
    'selectedData',
    'overridingHierarchyParams',
    'compatibilityProvider'
  )
  _loadData(): void {
    // Input can change a lot within a microtask.
    // Don't fetch too much too fast and introduce race condition.
    this.debounce('load', () => {
      const dataset = this.datasets[this.selectedData];
      if (!dataset) return;
      this._parseAndConstructHierarchicalGraph(dataset.path);
    });
  }
  _parseAndConstructHierarchicalGraph(
    path: string | null,
    pbTxtFile?: Blob
  ): void {
    const {overridingHierarchyParams, compatibilityProvider} = this;
    // Reset the progress bar to 0.
    this.progress = {value: 0, msg: ''};
    const tracker = tf_graph_util.getTracker(this);
    const hierarchyParams = Object.assign(
      {},
      tf_graph_hierarchy.DefaultHierarchyParams,
      overridingHierarchyParams
    );
    tf_graph_loader
      .fetchAndConstructHierarchicalGraph(
        tracker,
        path,
        pbTxtFile,
        compatibilityProvider,
        hierarchyParams
      )
      .then(({graph, graphHierarchy}) =>
        function() {
          this._setOutHierarchyParams(hierarchyParams);
          this._setOutGraph(graph);
          this._setOutGraphHierarchy(graphHierarchy);
        }.bind(this)
      );
  }
  @observe('selectedFile', 'overridingHierarchyParams', 'compatibilityProvider')
  _loadFile(): void {
    var e = this.selectedFile;
    if (!e) {
      return;
    }
    const target = (e as any).target as HTMLInputElement;
    const file = target.files[0];
    if (!file) {
      return;
    }
    // Clear out the value of the file chooser. This ensures that if the user
    // selects the same file, we'll re-read it.
    target.value = '';
    this._parseAndConstructHierarchicalGraph(null, file);
  }
}
