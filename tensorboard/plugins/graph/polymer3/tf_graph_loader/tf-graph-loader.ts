/* Copyright 2019 The TensorFlow Authors. All Rights Reserved.

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
namespace tf.graph.loader {
  Polymer({
    is: 'tf-graph-loader',
    _template: null, // strictTemplatePolicy requires a template (even a null one).
    properties: {
      /**
       * @type {Array<{name: string, path: string}>}
       */
      datasets: Array,
      selectedData: {
        type: Number,
        value: 0,
      },
      selectedFile: Object,
      compatibilityProvider: {
        type: Object,
        value: () => new tf.graph.op.TpuCompatibilityProvider(),
      },
      /**
       * If this optional object is provided, graph logic will override
       * the HierarchyParams it uses to build the graph with properties within
       * this object. For possible properties that this object can have, please
       * see documentation on the HierarchyParams TypeScript interface.
       * @type {Object}
       */
      overridingHierarchyParams: {
        type: Object,
        value: () => ({}),
      },
      /**
       * @type {{value: number, msg: string}}
       *
       * A number between 0 and 100 denoting the % of progress
       * for the progress bar and the displayed message.
       */
      progress: {
        type: Object,
        notify: true,
      },
      outGraphHierarchy: {
        type: Object,
        readOnly: true, //readonly so outsider can't change this via binding
        notify: true,
      },
      outGraph: {
        type: Object,
        readOnly: true, //readonly so outsider can't change this via binding
        notify: true,
      },
      outHierarchyParams: {
        type: Object,
        readOnly: true,
        notify: true,
      },
    },
    observers: [
      '_loadData(datasets, selectedData, overridingHierarchyParams, compatibilityProvider)',
      '_loadFile(selectedFile, overridingHierarchyParams, compatibilityProvider)',
    ],
    _loadData(): void {
      // Input can change a lot within a microtask.
      // Don't fetch too much too fast and introduce race condition.
      this.debounce('load', () => {
        const dataset = this.datasets[this.selectedData];
        if (!dataset) return;
        this._parseAndConstructHierarchicalGraph(dataset.path);
      });
    },
    _parseAndConstructHierarchicalGraph(
      path: string | null,
      pbTxtFile?: Blob
    ): void {
      const {overridingHierarchyParams, compatibilityProvider} = this;
      // Reset the progress bar to 0.
      this.progress = {value: 0, msg: ''};
      const tracker = tf.graph.util.getTracker(this);
      const hierarchyParams = Object.assign(
        {},
        tf.graph.hierarchy.DefaultHierarchyParams,
        overridingHierarchyParams
      );
      tf.graph.loader
        .fetchAndConstructHierarchicalGraph(
          tracker,
          path,
          pbTxtFile,
          compatibilityProvider,
          hierarchyParams
        )
        .then(({graph, graphHierarchy}) => {
          this._setOutHierarchyParams(hierarchyParams);
          this._setOutGraph(graph);
          this._setOutGraphHierarchy(graphHierarchy);
        });
    },
    _loadFile(e: Event | null): void {
      if (!e) {
        return;
      }
      const target = e.target as HTMLInputElement;
      const file = target.files[0];
      if (!file) {
        return;
      }

      // Clear out the value of the file chooser. This ensures that if the user
      // selects the same file, we'll re-read it.
      target.value = '';

      this._parseAndConstructHierarchicalGraph(null, file);
    },
  });
} // namespace tf.graph.loader
