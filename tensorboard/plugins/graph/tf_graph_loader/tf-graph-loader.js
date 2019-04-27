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
                        value: function () { return new tf.graph.op.TpuCompatibilityProvider(); },
                    },
                    hierarchyParams: {
                        type: Object,
                        value: function () { return tf.graph.hierarchy.DefaultHierarchyParams; },
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
                    /** @type {Object} */
                    outStats: {
                        type: Object,
                        readOnly: true,
                        notify: true
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
                _selectionChanged: function () {
                    var _this = this;
                    // selection can change a lot within a microtask.
                    // Don't fetch too much too fast and introduce race condition.
                    this.debounce('selectionchange', function () {
                        _this._load(_this.selection);
                    });
                },
                _load: function (selection) {
                    var _this = this;
                    var run = selection.run, tag = selection.tag, selectionType = selection.type;
                    switch (selectionType) {
                        case tf.graph.SelectionType.OP_GRAPH:
                        case tf.graph.SelectionType.CONCEPTUAL_GRAPH: {
                            // Clear stats about the previous graph.
                            this._setOutStats(null);
                            var params = new URLSearchParams();
                            params.set('run', run);
                            params.set('conceptual', String(selectionType === tf.graph.SelectionType.CONCEPTUAL_GRAPH));
                            if (tag)
                                params.set('tag', tag);
                            var graphPath = tf_backend.getRouter().pluginRoute('graphs', '/graph', params);
                            return this._fetchAndConstructHierarchicalGraph(graphPath).then(function () {
                                _this._graphRunTag = { run: run, tag: tag };
                            });
                        }
                        case tf.graph.SelectionType.PROFILE: {
                            var tags = this.datasets.find(function (_a) {
                                var name = _a.name;
                                return name === run;
                            }).tags;
                            var tagMeta = tags.find(function (t) { return t.tag === tag; });
                            // In case current tag misses opGraph but has profile information,
                            // we fallback to the v1 behavior of fetching the run graph.
                            var requiredOpGraphTag_1 = tagMeta.opGraph ? tag : null;
                            console.assert(tags.find(function (t) { return t.tag === requiredOpGraphTag_1; }), "Required tag (" + requiredOpGraphTag_1 + ") is missing.");
                            var shouldFetchGraph = !this._graphRunTag ||
                                this._graphRunTag.run !== run ||
                                this._graphRunTag.tag !== requiredOpGraphTag_1;
                            var maybeFetchGraphPromise = shouldFetchGraph ?
                                this._load({
                                    run: run,
                                    tag: requiredOpGraphTag_1,
                                    type: tf.graph.SelectionType.OP_GRAPH,
                                }) : Promise.resolve();
                            var params = new URLSearchParams();
                            params.set('tag', tag);
                            params.set('run', run);
                            var metadataPath_1 = tf_backend.getRouter().pluginRoute('graphs', '/run_metadata', params);
                            return maybeFetchGraphPromise
                                .then(function () { return _this._readAndParseMetadata(metadataPath_1); });
                        }
                        default:
                            return Promise.reject(new Error("Unknown selection type: " + selectionType));
                    }
                },
                _readAndParseMetadata: function (path) {
                    var _this = this;
                    // Reset the progress bar to 0.
                    this.set('progress', {
                        value: 0,
                        msg: '',
                    });
                    var tracker = tf.graph.util.getTracker(this);
                    tf.graph.parser.fetchAndParseMetadata(path, tracker)
                        .then(function (stats) {
                        _this._setOutStats(stats);
                    });
                },
                _fetchAndConstructHierarchicalGraph: function (path, pbTxtFile) {
                    return __awaiter(this, void 0, void 0, function () {
                        var tracker;
                        var _this = this;
                        return __generator(this, function (_a) {
                            // Reset the progress bar to 0.
                            this.set('progress', {
                                value: 0,
                                msg: '',
                            });
                            tracker = tf.graph.util.getTracker(this);
                            return [2 /*return*/, tf.graph.loader.fetchAndConstructHierarchicalGraph(tracker, path, pbTxtFile, this.compatibilityProvider, this.hierarchyParams).then(function (_a) {
                                    var graph = _a.graph, graphHierarchy = _a.graphHierarchy;
                                    _this._setOutGraph(graph);
                                    _this._setOutGraphHierarchy(graphHierarchy);
                                })];
                        });
                    });
                },
                _selectedFileChanged: function (e) {
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
