var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
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
            function fetchAndConstructHierarchicalGraph(tracker, remotePath, pbTxtFile, compatibilityProvider, hierarchyParams) {
                var _this = this;
                if (compatibilityProvider === void 0) { compatibilityProvider = new graph_1.op.TpuCompatibilityProvider(); }
                if (hierarchyParams === void 0) { hierarchyParams = graph_1.hierarchy.DefaultHierarchyParams; }
                var dataTracker = graph_1.util.getSubtaskTracker(tracker, 30, 'Data');
                var graphTracker = graph_1.util.getSubtaskTracker(tracker, 20, 'Graph');
                var hierarchyTracker = graph_1.util.getSubtaskTracker(tracker, 50, 'Namespace hierarchy');
                return graph_1.parser.fetchAndParseGraphData(remotePath, pbTxtFile, dataTracker)
                    .then(function (graph) {
                    if (!graph.node) {
                        throw new Error('The graph is empty. This can happen when ' +
                            'TensorFlow could not trace any graph. Please refer to ' +
                            'https://github.com/tensorflow/tensorboard/issues/1961 for more ' +
                            'information.');
                    }
                    return graph_1.build(graph, graph_1.DefaultBuildParams, graphTracker);
                }, function () {
                    throw new Error('Malformed GraphDef. This can sometimes be caused by ' +
                        'a bad network connection or difficulty reconciling multiple ' +
                        'GraphDefs; for the latter case, please refer to ' +
                        'https://github.com/tensorflow/tensorboard/issues/1929.');
                })
                    .then(function (graph) { return __awaiter(_this, void 0, void 0, function () {
                    var graphHierarchy;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                // Populate compatibile field of OpNode based on whitelist
                                graph_1.op.checkOpsForCompatibility(graph, compatibilityProvider);
                                return [4 /*yield*/, graph_1.hierarchy.build(graph, hierarchyParams, hierarchyTracker)];
                            case 1:
                                graphHierarchy = _a.sent();
                                return [2 /*return*/, { graph: graph, graphHierarchy: graphHierarchy }];
                        }
                    });
                }); })
                    .catch(function (e) {
                    // Generic error catch, for errors that happened outside
                    // asynchronous tasks.
                    var msg = "Graph visualization failed.\n\n" + e;
                    tracker.reportError(msg, e);
                    // Don't swallow the error.
                    throw e;
                });
            }
            loader.fetchAndConstructHierarchicalGraph = fetchAndConstructHierarchicalGraph;
        })(loader = graph_1.loader || (graph_1.loader = {}));
    })(graph = tf.graph || (tf.graph = {}));
})(tf || (tf = {})); // module tf.graph.loader
