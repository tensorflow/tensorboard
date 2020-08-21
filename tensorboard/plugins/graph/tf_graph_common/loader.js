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
            function fetchAndConstructHierarchicalGraph(tracker, remotePath, pbTxtFile, compatibilityProvider = new graph_1.op.TpuCompatibilityProvider(), hierarchyParams = graph_1.hierarchy.DefaultHierarchyParams) {
                const dataTracker = graph_1.util.getSubtaskTracker(tracker, 30, 'Data');
                const graphTracker = graph_1.util.getSubtaskTracker(tracker, 20, 'Graph');
                const hierarchyTracker = graph_1.util.getSubtaskTracker(tracker, 50, 'Namespace hierarchy');
                return graph_1.parser
                    .fetchAndParseGraphData(remotePath, pbTxtFile, dataTracker)
                    .then(function (graph) {
                    if (!graph.node) {
                        throw new Error('The graph is empty. This can happen when ' +
                            'TensorFlow could not trace any graph. Please refer to ' +
                            'https://github.com/tensorflow/tensorboard/issues/1961 for more ' +
                            'information.');
                    }
                    return graph_1.build(graph, graph_1.DefaultBuildParams, graphTracker);
                }, () => {
                    throw new Error('Malformed GraphDef. This can sometimes be caused by ' +
                        'a bad network connection or difficulty reconciling multiple ' +
                        'GraphDefs; for the latter case, please refer to ' +
                        'https://github.com/tensorflow/tensorboard/issues/1929.');
                })
                    .then((graph) => __awaiter(this, void 0, void 0, function* () {
                    // Populate compatibile field of OpNode based on whitelist
                    graph_1.op.checkOpsForCompatibility(graph, compatibilityProvider);
                    const graphHierarchy = yield graph_1.hierarchy.build(graph, hierarchyParams, hierarchyTracker);
                    return { graph, graphHierarchy };
                }))
                    .catch((e) => {
                    // Generic error catch, for errors that happened outside
                    // asynchronous tasks.
                    const msg = `Graph visualization failed.\n\n${e}`;
                    tracker.reportError(msg, e);
                    // Don't swallow the error.
                    throw e;
                });
            }
            loader.fetchAndConstructHierarchicalGraph = fetchAndConstructHierarchicalGraph;
        })(loader = graph_1.loader || (graph_1.loader = {}));
    })(graph = tf.graph || (tf.graph = {}));
})(tf || (tf = {})); // module tf.graph.loader
