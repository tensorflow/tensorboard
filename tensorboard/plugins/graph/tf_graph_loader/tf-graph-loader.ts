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

interface GraphRunTag {
  run: string;
  tag?: string;
}

Polymer({
  is: 'tf-graph-loader',

  properties: {
    datasets: Array,
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
    selection: Object,
    /**
     * TODO(stephanwlee): This should be changed to take in FileList or
     * the prop should be changed to `fileInput`.
     * @type {?Event}
     */
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
      value: () => ({})
    },
    outGraphHierarchy: {
      type: Object,
      readOnly: true, //readonly so outsider can't change this via binding
      notify: true
    },
    outGraph: {
      type: Object,
      readOnly: true, //readonly so outsider can't change this via binding
      notify: true
    },
    /**
     * @type {?GraphRunTag}
     */
    _graphRunTag: Object,
    outHierarchyParams: {
      type: Object,
      readOnly: true,
      notify: true
    },
    /** @type {Object} */
    outStats: {
      type: Object,
      readOnly: true, // This property produces data.
      notify: true
    },
  },
  observers: [
    '_selectionChanged(selection, overridingHierarchyParams, compatibilityProvider)',
    '_selectedFileChanged(selectedFile, overridingHierarchyParams, compatibilityProvider)',
  ],
  _selectionChanged(): void {
    // selection can change a lot within a microtask.
    // Don't fetch too much too fast and introduce race condition.
    this.debounce('selectionchange', () => {
      this._load(this.selection);
    });
  },
  _load: function(selection: tf.graph.controls.Selection): Promise<void> {
    const {run, tag, type: selectionType} = selection;
    const {overridingHierarchyParams} = this;

    switch (selectionType) {
      case tf.graph.SelectionType.OP_GRAPH:
      case tf.graph.SelectionType.CONCEPTUAL_GRAPH: {
        // Clear stats about the previous graph.
        this._setOutStats(null);
        const params = new URLSearchParams();
        params.set('run', run);
        params.set(
            'conceptual',
            String(selectionType === tf.graph.SelectionType.CONCEPTUAL_GRAPH));
        if (tag) params.set('tag', tag);
        const graphPath =
            tf_backend.getRouter().pluginRoute('graphs', '/graph', params);
        return this._fetchAndConstructHierarchicalGraph(
            graphPath, null, overridingHierarchyParams).then(() => {
              this._graphRunTag = {run, tag};
            });
      }
      case tf.graph.SelectionType.PROFILE: {
        const {tags} = this.datasets.find(({name}) => name === run);
        const tagMeta = tags.find(t => t.tag === tag);
        // In case current tag misses opGraph but has profile information,
        // we fallback to the v1 behavior of fetching the run graph.
        const requiredOpGraphTag = tagMeta.opGraph ? tag : null;

        console.assert(
            tags.find(t => t.tag === requiredOpGraphTag),
            `Required tag (${requiredOpGraphTag}) is missing.`);

        const shouldFetchGraph = !this._graphRunTag ||
            this._graphRunTag.run !== run ||
            this._graphRunTag.tag !== requiredOpGraphTag;
        const maybeFetchGraphPromise = shouldFetchGraph ?
            this._load({
              run,
              tag: requiredOpGraphTag,
              type: tf.graph.SelectionType.OP_GRAPH,
            }) : Promise.resolve();
        const params = new URLSearchParams();
        params.set('tag', tag);
        params.set('run', run);
        const metadataPath = tf_backend.getRouter().pluginRoute(
            'graphs', '/run_metadata', params);
        return maybeFetchGraphPromise
            .then(() => this._readAndParseMetadata(metadataPath));
      }
      default:
        return Promise.reject(new Error(`Unknown selection type: ${selectionType}`));
    }
  },
  _readAndParseMetadata: function(path: string): void {
    // Reset the progress bar to 0.
    this.set('progress', {
      value: 0,
      msg: ''
    });
    var tracker = tf.graph.util.getTracker(this);
    tf.graph.parser.fetchAndParseMetadata(path, tracker)
        .then((stats) => {
          this._setOutStats(stats);
        });
  },
  _fetchAndConstructHierarchicalGraph: function(
      path: (string|null), pbTxtFile?: Blob,
      overridingHierarchyParams?: {}): Promise<void> {
    // Reset the progress bar to 0.
    this.set('progress', {
      value: 0,
      msg: ''
    });
    var tracker = tf.graph.util.getTracker(this);
    var hierarchyParams = {
      verifyTemplate: true,
      // If a set of numbered op nodes has at least this number of nodes
      // then group them into a series node.
      seriesNodeMinSize: 5,
      // A map of series node names to series grouping settings, to indicate
      // if a series is to be rendered as grouped or ungrouped.
      // Starts out empty which allows the renderer to decide which series
      // are initially rendered grouped and which aren't.
      seriesMap: {},
      rankDirection: 'BT',
      useGeneralizedSeriesPatterns: false,
    };
    _.forOwn(overridingHierarchyParams, (value, key) => {
      hierarchyParams[key] = value;
    });
    this._setOutHierarchyParams(hierarchyParams);
    var dataTracker = tf.graph.util.getSubtaskTracker(tracker, 30, 'Data');
    return tf.graph.parser.fetchAndParseGraphData(path, pbTxtFile, dataTracker)
    .then(function(graph) {
      if (!graph.node) {
        throw new Error('The graph is empty. This can happen when ' +
            'TensorFlow could not trace any graph. Please refer to ' +
            'https://github.com/tensorflow/tensorboard/issues/1961 for more ' +
            'information.');
      }

      // Build the flat graph (consists only of Op nodes).

      // This is the whitelist of inputs on op types that are considered
      // reference edges. "Assign 0" indicates that the first input to
      // an OpNode with operation type "Assign" is a reference edge.
      var refEdges = {};
      refEdges["Assign 0"] = true;
      refEdges["AssignAdd 0"] = true;
      refEdges["AssignSub 0"] = true;
      refEdges["assign 0"] = true;
      refEdges["assign_add 0"] = true;
      refEdges["assign_sub 0"] = true;
      refEdges["count_up_to 0"] = true;
      refEdges["ScatterAdd 0"] = true;
      refEdges["ScatterSub 0"] = true;
      refEdges["ScatterUpdate 0"] = true;
      refEdges["scatter_add 0"] = true;
      refEdges["scatter_sub 0"] = true;
      refEdges["scatter_update 0"] = true;
      var buildParams = {
        enableEmbedding: true,
        inEmbeddingTypes: ['Const'],
        outEmbeddingTypes: ['^[a-zA-Z]+Summary$'],
        refEdges: refEdges
      };
      var graphTracker = tf.graph.util.getSubtaskTracker(tracker, 20, 'Graph');
      return tf.graph.build(graph, buildParams, graphTracker);
    }, () => {
      throw new Error('Malformed GraphDef. This can sometimes be caused by a ' +
          'bad network connection or difficulty reconciling multiple GraphDefs;' +
          ' for the latter case, please refer to ' +
          'https://github.com/tensorflow/tensorboard/issues/1929.');
    })
    .then((graph) => {
      // Populate compatibile field of OpNode based on whitelist
      tf.graph.op.checkOpsForCompatibility(graph, this.compatibilityProvider);

      this._setOutGraph(graph);
      var hierarchyTracker = tf.graph.util.getSubtaskTracker(tracker, 50,
          'Namespace hierarchy');
      return tf.graph.hierarchy.build(graph, hierarchyParams, hierarchyTracker);
    })
    .then((graphHierarchy) => {
      // Update the properties which notify the parent with the
      // graph hierarchy and whether the data has live stats or not.
      this._setOutGraphHierarchy(graphHierarchy);
    })
    .catch((e) => {
      // Generic error catch, for errors that happened outside
      // asynchronous tasks.
      const msg = `Graph visualization failed.\n\n${e}`;

      tracker.reportError(msg, e);
      // Don't swallow the error.
      throw e;
    });
  },
  _selectedFileChanged: function(e: Event|null, overridingHierarchyParams: {}): void {
    if (!e) {
      return;
    }
    const target = (e.target as HTMLInputElement);
    const file = target.files[0];
    if (!file) {
      return;
    }

    // Clear out the value of the file chooser. This ensures that if the user
    // selects the same file, we'll re-read it.
    target.value = '';

    this._fetchAndConstructHierarchicalGraph(
        null, file, overridingHierarchyParams);
  },
});

}  // namespace tf.graph.loader
