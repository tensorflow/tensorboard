var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
var tf;
(function (tf) {
    var graph;
    (function (graph_1) {
        var loader;
        (function (loader) {
            Polymer({
                is: 'tf-graph-dashboard-loader',
                _template: null,
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
                    hierarchyParams: {
                        type: Object,
                        value: () => tf.graph.hierarchy.DefaultHierarchyParams,
                    },
                    outGraphHierarchy: {
                        type: Object,
                        readOnly: true,
                        notify: true,
                    },
                    outGraph: {
                        type: Object,
                        readOnly: true,
                        notify: true,
                    },
                    /** @type {Object} */
                    outStats: {
                        type: Object,
                        readOnly: true,
                        notify: true,
                    },
                    /**
                     * @type {?GraphRunTag}
                     */
                    _graphRunTag: Object,
                },
                observers: [
                    '_selectionChanged(selection, compatibilityProvider)',
                    '_selectedFileChanged(selectedFile, compatibilityProvider)',
                ],
                _selectionChanged() {
                    // selection can change a lot within a microtask.
                    // Don't fetch too much too fast and introduce race condition.
                    this.debounce('selectionchange', () => {
                        this._load(this.selection);
                    });
                },
                _load: function (selection) {
                    const { run, tag, type: selectionType } = selection;
                    switch (selectionType) {
                        case tf.graph.SelectionType.OP_GRAPH:
                        case tf.graph.SelectionType.CONCEPTUAL_GRAPH: {
                            // Clear stats about the previous graph.
                            this._setOutStats(null);
                            const params = new URLSearchParams();
                            params.set('run', run);
                            params.set('conceptual', String(selectionType === tf.graph.SelectionType.CONCEPTUAL_GRAPH));
                            if (tag)
                                params.set('tag', tag);
                            const graphPath = tf_backend
                                .getRouter()
                                .pluginRoute('graphs', '/graph', params);
                            return this._fetchAndConstructHierarchicalGraph(graphPath).then(() => {
                                this._graphRunTag = { run, tag };
                            });
                        }
                        case tf.graph.SelectionType.PROFILE: {
                            const { tags } = this.datasets.find(({ name }) => name === run);
                            const tagMeta = tags.find((t) => t.tag === tag);
                            // In case current tag misses opGraph but has profile information,
                            // we fallback to the v1 behavior of fetching the run graph.
                            const requiredOpGraphTag = tagMeta.opGraph ? tag : null;
                            console.assert(tags.find((t) => t.tag === requiredOpGraphTag), `Required tag (${requiredOpGraphTag}) is missing.`);
                            const shouldFetchGraph = !this._graphRunTag ||
                                this._graphRunTag.run !== run ||
                                this._graphRunTag.tag !== requiredOpGraphTag;
                            const maybeFetchGraphPromise = shouldFetchGraph
                                ? this._load({
                                    run,
                                    tag: requiredOpGraphTag,
                                    type: tf.graph.SelectionType.OP_GRAPH,
                                })
                                : Promise.resolve();
                            const params = new URLSearchParams();
                            params.set('tag', tag);
                            params.set('run', run);
                            const metadataPath = tf_backend
                                .getRouter()
                                .pluginRoute('graphs', '/run_metadata', params);
                            return maybeFetchGraphPromise.then(() => this._readAndParseMetadata(metadataPath));
                        }
                        default:
                            return Promise.reject(new Error(`Unknown selection type: ${selectionType}`));
                    }
                },
                _readAndParseMetadata: function (path) {
                    // Reset the progress bar to 0.
                    this.set('progress', {
                        value: 0,
                        msg: '',
                    });
                    var tracker = tf.graph.util.getTracker(this);
                    tf.graph.parser.fetchAndParseMetadata(path, tracker).then((stats) => {
                        this._setOutStats(stats);
                    });
                },
                _fetchAndConstructHierarchicalGraph: function (path, pbTxtFile) {
                    return __awaiter(this, void 0, void 0, function* () {
                        // Reset the progress bar to 0.
                        this.set('progress', {
                            value: 0,
                            msg: '',
                        });
                        const tracker = tf.graph.util.getTracker(this);
                        return tf.graph.loader
                            .fetchAndConstructHierarchicalGraph(tracker, path, pbTxtFile, this.compatibilityProvider, this.hierarchyParams)
                            .then(({ graph, graphHierarchy }) => {
                            this._setOutGraph(graph);
                            this._setOutGraphHierarchy(graphHierarchy);
                        });
                    });
                },
                _selectedFileChanged: function (e) {
                    if (!e) {
                        return;
                    }
                    const target = e.target;
                    const file = target.files[0];
                    if (!file) {
                        return;
                    }
                    // Clear out the value of the file chooser. This ensures that if the user
                    // selects the same file, we'll re-read it.
                    target.value = '';
                    this._fetchAndConstructHierarchicalGraph(null, file);
                },
            });
        })(loader = graph_1.loader || (graph_1.loader = {}));
    })(graph = tf.graph || (tf.graph = {}));
})(tf || (tf = {})); // namespace tf.graph.loader
