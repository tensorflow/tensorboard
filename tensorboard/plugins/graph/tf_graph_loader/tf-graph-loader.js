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
                is: 'tf-graph-loader',
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
                        value: function () { return new tf.graph.op.TpuCompatibilityProvider(); },
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
                        value: function () { return ({}); }
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
                        readOnly: true,
                        notify: true
                    },
                    outGraph: {
                        type: Object,
                        readOnly: true,
                        notify: true
                    },
                    outHierarchyParams: {
                        type: Object,
                        readOnly: true,
                        notify: true
                    },
                },
                observers: [
                    '_loadData(datasets, selectedData, overridingHierarchyParams, compatibilityProvider)',
                    '_loadFile(selectedFile, overridingHierarchyParams, compatibilityProvider)',
                ],
                _loadData: function () {
                    var _this = this;
                    // Input can change a lot within a microtask.
                    // Don't fetch too much too fast and introduce race condition.
                    this.debounce('load', function () {
                        var dataset = _this.datasets[_this.selectedData];
                        if (!dataset)
                            return;
                        _this._fetchAndConstructHierarchicalGraph(dataset.path);
                    });
                },
                _fetchAndConstructHierarchicalGraph: function (path, pbTxtFile) {
                    var _this = this;
                    var _a = this, overridingHierarchyParams = _a.overridingHierarchyParams, compatibilityProvider = _a.compatibilityProvider;
                    // Reset the progress bar to 0.
                    this.progress = { value: 0, msg: '' };
                    var tracker = tf.graph.util.getTracker(this);
                    var hierarchyParams = Object.assign({}, tf.graph.hierarchy.DefaultHierarchyParams, overridingHierarchyParams);
                    tf.graph.loader.fetchAndConstructHierarchicalGraph(tracker, path, pbTxtFile, compatibilityProvider, hierarchyParams).then(function (_a) {
                        var graph = _a.graph, graphHierarchy = _a.graphHierarchy;
                        _this._setOutHierarchyParams(hierarchyParams);
                        _this._setOutGraph(graph);
                        _this._setOutGraphHierarchy(graphHierarchy);
                    });
                },
                _loadFile: function (e) {
                    if (!e) {
                        return;
                    }
                    var target = e.target;
                    var file = target.files[0];
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
