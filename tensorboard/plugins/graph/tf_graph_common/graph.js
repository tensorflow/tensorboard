/* Copyright 2015 The TensorFlow Authors. All Rights Reserved.

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
var tf;
(function (tf) {
    var graph;
    (function (graph_1) {
        /** Delimiter used in node names to denote namespaces. */
        graph_1.NAMESPACE_DELIM = '/';
        graph_1.ROOT_NAME = '__root__';
        graph_1.FUNCTION_LIBRARY_NODE_PREFIX = '__function_library__';
        /** Attribute key used for storing attributes that are too large. */
        graph_1.LARGE_ATTRS_KEY = '_too_large_attrs';
        /**
         * Maximum allowed size in bytes, before the attribute is considered large
         * and filtered out of the graph.
         */
        graph_1.LIMIT_ATTR_SIZE = 1024;
        // Separator between the source and the destination name of the edge.
        graph_1.EDGE_KEY_DELIM = '--';
        var GraphType;
        (function (GraphType) {
            GraphType[GraphType["FULL"] = 0] = "FULL";
            GraphType[GraphType["EMBEDDED"] = 1] = "EMBEDDED";
            GraphType[GraphType["META"] = 2] = "META";
            GraphType[GraphType["SERIES"] = 3] = "SERIES";
            GraphType[GraphType["CORE"] = 4] = "CORE";
            GraphType[GraphType["SHADOW"] = 5] = "SHADOW";
            GraphType[GraphType["BRIDGE"] = 6] = "BRIDGE";
            GraphType[GraphType["EDGE"] = 7] = "EDGE";
        })(GraphType = graph_1.GraphType || (graph_1.GraphType = {}));
        ;
        var NodeType;
        (function (NodeType) {
            NodeType[NodeType["META"] = 0] = "META";
            NodeType[NodeType["OP"] = 1] = "OP";
            NodeType[NodeType["SERIES"] = 2] = "SERIES";
            NodeType[NodeType["BRIDGE"] = 3] = "BRIDGE";
            NodeType[NodeType["ELLIPSIS"] = 4] = "ELLIPSIS";
        })(NodeType = graph_1.NodeType || (graph_1.NodeType = {}));
        ;
        /** Indicates if a node is to be included in the main graph when rendered. */
        var InclusionType;
        (function (InclusionType) {
            InclusionType[InclusionType["INCLUDE"] = 0] = "INCLUDE";
            InclusionType[InclusionType["EXCLUDE"] = 1] = "EXCLUDE";
            InclusionType[InclusionType["UNSPECIFIED"] = 2] = "UNSPECIFIED";
        })(InclusionType = graph_1.InclusionType || (graph_1.InclusionType = {}));
        ;
        /** Indicates if a series is to be grouped in the graph when rendered. */
        var SeriesGroupingType;
        (function (SeriesGroupingType) {
            SeriesGroupingType[SeriesGroupingType["GROUP"] = 0] = "GROUP";
            SeriesGroupingType[SeriesGroupingType["UNGROUP"] = 1] = "UNGROUP";
        })(SeriesGroupingType = graph_1.SeriesGroupingType || (graph_1.SeriesGroupingType = {}));
        ;
        /** Attribute key reserved for the shapes of the output tensors. */
        var OUTPUT_SHAPES_KEY = '_output_shapes';
        /** Attribute key reserved for the XLA cluster that an op runs on. */
        var _XLA_CLUSTER_KEY = '_XlaCluster';
        /**
         * A SlimGraph is inspired by graphlib.Graph, but having only the functionality
         * that we need.
         */
        var SlimGraph = /** @class */ (function () {
            function SlimGraph() {
                this.nodes = {};
                this.edges = [];
            }
            return SlimGraph;
        }());
        graph_1.SlimGraph = SlimGraph;
        var EllipsisNodeImpl = /** @class */ (function () {
            /**
             * Constructs a new ellipsis annotation node.
             *
             * @param numNodes The number of additional annotations this node represents.
             */
            function EllipsisNodeImpl(numNodes) {
                this.type = NodeType.ELLIPSIS;
                this.isGroupNode = false;
                this.cardinality = 1;
                this.parentNode = null;
                this.stats = null;
                this.setNumMoreNodes(numNodes);
                this.include = InclusionType.UNSPECIFIED;
            }
            EllipsisNodeImpl.prototype.setNumMoreNodes = function (numNodes) {
                this.numMoreNodes = numNodes;
                this.name = '... ' + numNodes + ' more';
            };
            return EllipsisNodeImpl;
        }());
        graph_1.EllipsisNodeImpl = EllipsisNodeImpl;
        ;
        /**
         * A label object for nodes in the full graph and leaf nodes in the render
         * graph.
         */
        var OpNodeImpl = /** @class */ (function () {
            /**
             * Constructs a new Op node.
             *
             * @param rawNode The raw node.
             */
            function OpNodeImpl(rawNode) {
                this.op = rawNode.op;
                this.name = rawNode.name;
                this.device = rawNode.device;
                this.attr = rawNode.attr;
                // An array of normalized inputs that denote the incoming edges to
                // the current node. Each input contains the normalized name of the
                // source node, whether it has a number part and whether it is a
                // control dependency.
                this.inputs = normalizeInputs(rawNode.input);
                this.outputShapes = extractOutputShapes(rawNode.attr);
                this.xlaCluster = extractXlaCluster(rawNode.attr);
                this.compatible = false;
                // additional properties
                this.type = NodeType.OP;
                this.isGroupNode = false;
                this.cardinality = 1;
                this.inEmbeddings = [];
                this.outEmbeddings = [];
                this.parentNode = null;
                this.include = InclusionType.UNSPECIFIED;
                this.owningSeries = null;
            }
            return OpNodeImpl;
        }());
        graph_1.OpNodeImpl = OpNodeImpl;
        ;
        function createMetanode(name, opt) {
            if (opt === void 0) { opt = {}; }
            return new MetanodeImpl(name, opt);
        }
        graph_1.createMetanode = createMetanode;
        /**
         * Joins the information from the stats file (memory, compute time) with the
         * graph information.
         */
        function joinStatsInfoWithGraph(graph, stats, devicesForStats) {
            // Reset stats for each node.
            _.each(graph.nodes, function (node) { node.stats = null; });
            _.each(stats.dev_stats, function (devStats) {
                // Ignore devices that are not selected.
                if (devicesForStats && !devicesForStats[devStats.device]) {
                    return;
                }
                _.each(devStats.node_stats, function (nodeStats) {
                    // Lookup the node in the graph by its original name, e.g. A/B. If not
                    // found, lookup by the rewritten name A/B/(B) in case the name is both
                    // a namespace and a node name.
                    var nodeName = nodeStats.node_name in graph.nodes ?
                        nodeStats.node_name :
                        getStrictName(nodeStats.node_name);
                    // Couldn't find a matching node.
                    if (!(nodeName in graph.nodes)) {
                        return;
                    }
                    // Compute the total bytes used.
                    var totalBytes = 0;
                    if (nodeStats.memory) {
                        _.each(nodeStats.memory, function (alloc) {
                            if (alloc.total_bytes) {
                                if (alloc.total_bytes > 0) {
                                    totalBytes += Number(alloc.total_bytes);
                                }
                                else {
                                    /* tslint:disable */
                                    console.log('ignoring negative memory allocation for ' + nodeName);
                                    /* tslint:enable */
                                }
                            }
                        });
                    }
                    var outputSize = null;
                    if (nodeStats.output) {
                        outputSize = _.map(nodeStats.output, function (output) {
                            return _.map(output.tensor_description.shape.dim, function (dim) { return Number(dim.size); });
                        });
                    }
                    graph.nodes[nodeName].device = devStats.device;
                    if (graph.nodes[nodeName].stats == null) {
                        graph.nodes[nodeName].stats = new NodeStats(outputSize);
                    }
                    graph.nodes[nodeName].stats.addBytesAllocation(totalBytes);
                    if (nodeStats.all_end_rel_micros) {
                        if (nodeStats.all_end_rel_micros > 0) {
                            graph.nodes[nodeName].stats.addExecutionTime(nodeStats.all_start_micros, nodeStats.all_start_micros + nodeStats.all_end_rel_micros);
                        }
                        else {
                            /* tslint:disable */
                            console.log('ignoring negative runtime for ' + nodeName);
                            /* tslint:enable */
                        }
                    }
                });
            });
        }
        graph_1.joinStatsInfoWithGraph = joinStatsInfoWithGraph;
        /**
         * Execution stats for the node.
         */
        var NodeStats = /** @class */ (function () {
            function NodeStats(outputSize) {
                /**
                 * Total number of bytes used for the node. Sum of all children
                 * if it is a Group node.
                 */
                this.totalBytes = 0;
                this.outputSize = outputSize;
            }
            /**
             * Add the start and end time for a particular kernel execution of this op.
             * Ops can have multiple kernel executions within the same session run.
             */
            NodeStats.prototype.addExecutionTime = function (startTime, endTime) {
                if (this.startTime != null) {
                    this.startTime = Math.min(this.startTime, startTime);
                }
                else {
                    this.startTime = startTime;
                }
                if (this.endTime != null) {
                    this.endTime = Math.max(this.endTime, endTime);
                }
                else {
                    this.endTime = endTime;
                }
            };
            /**
             * Add the bytes allocated for a particular kernel execution of this op.
             * Ops can have multiple kernel executions within the same session run.
             */
            NodeStats.prototype.addBytesAllocation = function (totalBytes) {
                if (this.totalBytes != null) {
                    this.totalBytes = Math.max(this.totalBytes, totalBytes);
                }
                else {
                    this.totalBytes = totalBytes;
                }
            };
            /**
             * Combines the specified stats with the current stats.
             * Modifies the current object. This method is used to
             * compute aggregate stats for group nodes.
             */
            NodeStats.prototype.combine = function (stats) {
                if (stats.totalBytes != null) {
                    this.totalBytes += stats.totalBytes;
                }
                if (stats.getTotalMicros() != null) {
                    this.addExecutionTime(stats.startTime, stats.endTime);
                }
            };
            /**
             * Total number of compute time in microseconds used for the node.
             * Sum of all children if it is a Group node. Null if it is unknown.
             * This method can not be scaffolded under a getter attribute because
             * ECMAScript 5 does not support getter attributes.
             */
            NodeStats.prototype.getTotalMicros = function () {
                if (this.startTime == null || this.endTime == null) {
                    return null;
                }
                return this.endTime - this.startTime;
            };
            return NodeStats;
        }());
        graph_1.NodeStats = NodeStats;
        var MetanodeImpl = /** @class */ (function () {
            /** A label object for meta-nodes in the graph hierarchy */
            function MetanodeImpl(name, opt) {
                if (opt === void 0) { opt = {}; }
                this.name = name;
                this.type = NodeType.META;
                /** number of levels under this group */
                this.depth = 1;
                this.isGroupNode = true;
                /** # of leaf nodes (including embedded ones) */
                this.cardinality = 0;
                /** graph contains metanodes, nodes, edges
                 * and metaedges for main items within this metanode
                 */
                this.metagraph =
                    createGraph(name, GraphType.META, opt);
                /** bridgegraph must be constructed lazily-see hierarchy.getBridgegraph() */
                this.bridgegraph = null;
                /**
                 * A dictionary that count ops type of nodes in this metanode
                 * (op type => count).
                 */
                this.opHistogram = {};
                this.deviceHistogram = {};
                this.compatibilityHistogram = { compatible: 0, incompatible: 0 };
                /** unique id for a metanode of similar subgraph */
                this.templateId = null;
                /** Metanode which contains this node, if any */
                this.parentNode = null;
                this.hasNonControlEdges = false;
                this.include = InclusionType.UNSPECIFIED;
                this.associatedFunction = '';
            }
            MetanodeImpl.prototype.getFirstChild = function () {
                return this.metagraph.node(this.metagraph.nodes()[0]);
            };
            /**
             * Returns the op node associated with the metanode.
             * For example, if the metanode is 'sgd', the associated
             * op node is sgd/(sgd).
             */
            MetanodeImpl.prototype.getRootOp = function () {
                var nameSplit = this.name.split('/');
                var rootOpName = this.name + '/(' + nameSplit[nameSplit.length - 1] + ')';
                return this.metagraph.node(rootOpName);
            };
            /**
             * Return an array of the names of all the leaves (non-GroupNodes) inside
             * this metanode. This performs a breadth-first search of the tree, so
             * immediate child leaves will appear earlier in the output array than
             * descendant leaves.
             */
            MetanodeImpl.prototype.leaves = function () {
                var leaves = [];
                var queue = [this];
                var metagraph; // Defined here due to a limitation of ES6->5 compilation.
                while (queue.length) {
                    var node = queue.shift();
                    if (node.isGroupNode) {
                        metagraph = node.metagraph;
                        _.each(metagraph.nodes(), function (name) { return queue.push(metagraph.node(name)); });
                    }
                    else {
                        leaves.push(node.name);
                    }
                }
                return leaves;
            };
            return MetanodeImpl;
        }());
        graph_1.MetanodeImpl = MetanodeImpl;
        ;
        function createMetaedge(v, w) {
            return new MetaedgeImpl(v, w);
        }
        graph_1.createMetaedge = createMetaedge;
        /**
         * A label object for edges between metanodes of subgraphs in the render graph.
         */
        var MetaedgeImpl = /** @class */ (function () {
            function MetaedgeImpl(v, w) {
                this.v = v;
                this.w = w;
                this.baseEdgeList = [];
                this.inbound = null;
                this.numRegularEdges = 0;
                this.numControlEdges = 0;
                this.numRefEdges = 0;
                this.totalSize = 0;
            }
            MetaedgeImpl.prototype.addBaseEdge = function (edge, h) {
                this.baseEdgeList.push(edge);
                if (edge.isControlDependency) {
                    this.numControlEdges += 1;
                }
                else {
                    this.numRegularEdges += 1;
                }
                if (edge.isReferenceEdge) {
                    this.numRefEdges += 1;
                }
                // Compute the size of the tensor flowing through this
                // base edge.
                this.totalSize += MetaedgeImpl.computeSizeOfEdge(edge, h);
                h.maxMetaEdgeSize = Math.max(h.maxMetaEdgeSize, this.totalSize);
            };
            MetaedgeImpl.computeSizeOfEdge = function (edge, h) {
                var opNode = h.node(edge.v);
                if (!opNode.outputShapes) {
                    // No shape information. Asssume a single number. This gives
                    // a lower bound for the total size.
                    return 1;
                }
                h.hasShapeInfo = true;
                // Sum the sizes of all output tensors.
                return _(opNode.outputShapes).mapValues(function (shape) {
                    // If the shape is unknown, treat it as 1 when computing
                    // total size. This gives a lower bound for the total size.
                    if (shape == null) {
                        return 1;
                    }
                    // Multiply all shapes to get the total size of the tensor.
                    // E.g. The total size of [4, 2, 1] is 4 * 2 * 1.
                    return _(shape).reduce(function (accumulated, currSize) {
                        // If this particular dimension is unknown, treat
                        // it as 1 when computing total size. This gives a lower bound
                        // for the total size.
                        if (currSize === -1) {
                            currSize = 1;
                        }
                        return accumulated * currSize;
                    }, 1);
                }).sum();
            };
            return MetaedgeImpl;
        }());
        graph_1.MetaedgeImpl = MetaedgeImpl;
        function createSeriesNode(prefix, suffix, parent, clusterId, name) {
            return new SeriesNodeImpl(prefix, suffix, parent, clusterId, name);
        }
        graph_1.createSeriesNode = createSeriesNode;
        function getSeriesNodeName(prefix, suffix, parent, startId, endId) {
            var numRepresentation = (typeof startId !== 'undefined' && typeof endId !== 'undefined') ?
                '[' + startId + '-' + endId + ']' :
                '#';
            var pattern = prefix + numRepresentation + suffix;
            return (parent ? parent + '/' : '') + pattern;
        }
        graph_1.getSeriesNodeName = getSeriesNodeName;
        var SeriesNodeImpl = /** @class */ (function () {
            function SeriesNodeImpl(prefix, suffix, parent, clusterId, name) {
                this.name = name || getSeriesNodeName(prefix, suffix, parent);
                this.type = NodeType.SERIES;
                this.hasLoop = false;
                this.prefix = prefix;
                this.suffix = suffix;
                this.clusterId = clusterId;
                this.ids = [];
                this.parent = parent;
                this.isGroupNode = true;
                this.cardinality = 0;
                this.metagraph = createGraph(name, GraphType.SERIES);
                // bridgegraph must be constructed lazily-see hierarchy.getBridgegraph()
                this.bridgegraph = null;
                this.parentNode = null;
                this.deviceHistogram = {};
                this.compatibilityHistogram = { compatible: 0, incompatible: 0 };
                this.hasNonControlEdges = false;
                this.include = InclusionType.UNSPECIFIED;
            }
            return SeriesNodeImpl;
        }());
        /**
         * Extracts the shapes of the output tensors from the attr property in the
         * node proto.
         */
        // tslint:disable-next-line:no-any
        function extractOutputShapes(attr) {
            var result = null;
            // We don't know anything about the output tensors.
            if (!attr) {
                return null;
            }
            for (var i = 0; i < attr.length; i++) {
                var _a = attr[i], key = _a.key, value = _a.value;
                if (key === OUTPUT_SHAPES_KEY) {
                    if (!value.list.shape) {
                        // The OUTPUT_SHAPES_KEY lacks a value. We know nothing about the shape.
                        return null;
                    }
                    // Map all output tensors into array of numbers denoting their shape.
                    var result_1 = value.list.shape.map(function (shape) {
                        if (shape.unknown_rank) {
                            // This output tensor is of unknown rank. We don't know if it is a
                            // scalar, or a tensor, or of what shape it is.
                            return null;
                        }
                        if (shape.dim == null ||
                            (shape.dim.length === 1 && shape.dim[0].size == null)) {
                            // This output tensor is a scalar.
                            return [];
                        }
                        // This output tensor has a known rank. Map each dimension size
                        // into a number.
                        return shape.dim.map(function (dim) {
                            // Size can be -1 if this particular dimension is unknown.
                            return dim.size;
                        });
                    });
                    // Since we already processed it, remove the entry from the attribute
                    // list (saves memory).
                    attr.splice(i, 1);
                    return result_1;
                }
            }
            // We didn't find OUTPUT_SHAPES_KEY in attributes, so we don't know anything
            // about the output tensors.
            return null;
        }
        /**
         * Extracts the XLA Cluster that an op runs on from the attrs of the OpNode.
         * @param attr The attr property.
         * @return A string that is the name of the cluster. Or null if it could not be
         *     determined.
         */
        // tslint:disable-next-line:no-any
        function extractXlaCluster(attr) {
            if (!attr) {
                return null;
            }
            // Find the attribute for XLA cluster if there is one.
            for (var i = 0; i < attr.length; i++) {
                if (attr[i].key === _XLA_CLUSTER_KEY) {
                    return attr[i].value['s'] || null;
                }
            }
            return null;
        }
        /**
         * Normalizes the inputs and extracts associated metadata:
         * 1) Inputs can contain a colon followed by a suffix of characters.
         *    That suffix may be a single number (e.g. inputName:1) or several word
         *    characters separated from a number by a colon (e.g. inputName:foo:1). The
         *    latter case is used to denote inputs and outputs of functions.
         * 2) Control dependency inputs contain caret at the beginning and we
         *    remove this and annotate the edge as a control dependency.
         * @param inputs Array of unnormalized names of input nodes.
         */
        function normalizeInputs(inputs) {
            var normalizedInputs = [];
            _.each(inputs, function (inputName) {
                var isControlDependency = inputName[0] === '^';
                if (isControlDependency) {
                    // The carat merely indicates whether this input is a control dependency.
                    // It should not be part of the name.
                    inputName = inputName.substring(1);
                }
                var name = inputName;
                var outputTensorKey = '0';
                var match = inputName.match(/(.*):(\w+:\d+)$/);
                if (match) {
                    // The output string consists of several characters and a number separated
                    // by a colon.
                    name = match[1];
                    outputTensorKey = match[2];
                }
                else {
                    match = inputName.match(/(.*):(\d+)$/);
                    if (match) {
                        // The output string consists of a single number.
                        name = match[1];
                        outputTensorKey = match[2];
                    }
                }
                if (normalizedInputs.length === 0 ||
                    name !== normalizedInputs[normalizedInputs.length - 1].name) {
                    normalizedInputs.push({
                        name: name,
                        outputTensorKey: outputTensorKey,
                        isControlDependency: isControlDependency,
                    });
                }
            });
            return normalizedInputs;
        }
        function addEdgeToGraph(graph, inputName, outputNode, input, params, index) {
            // Don't allow loops in the graph.
            if (inputName === outputNode.name) {
                return;
            }
            // Check if this op type and input number corresponds to a
            // reference edge using the refEdges dictionary in the params.
            var isRefEdge = params.refEdges[outputNode.op + ' ' + index] === true;
            graph.edges.push({
                v: inputName,
                w: outputNode.name,
                outputTensorKey: input.outputTensorKey,
                isControlDependency: input.isControlDependency,
                isReferenceEdge: isRefEdge
            });
        }
        function build(graphDef, params, tracker) {
            /**
             * A dictionary that maps each in-embedding node name to the node
             * object.
             */
            var inEmbedding = {};
            /**
             * A dictionary that maps each out-embedding node name to the node
             * object.
             */
            var outEmbedding = {};
            /**
             * A dictionary that maps each node name to an array of the node's
             * out-embedding node label objects.
             */
            var outEmbeddings = {};
            var isInEmbeddedPred = getEmbedPredicate(params.inEmbeddingTypes);
            var isOutEmbeddedPred = getEmbedPredicate(params.outEmbeddingTypes);
            var embeddingNodeNames = [];
            var rawNodes = graphDef.node;
            /**
             * A list of all the non-embedding node names which appear in the processed
             * list of raw nodes. Here we pre-allocate enough room for all the rawNodes,
             * even though there will some number of embeddings. The excess array length
             * is spliced off later.
             *
             * Experimentation shows that around 30% of the array will go unused, and
             * even for very large networks that amounts to less than 10k spaces.
             */
            var nodeNames = new Array(rawNodes.length);
            return tf.graph.util
                .runAsyncTask('Normalizing names', 30, function () {
                var opNodes = new Array(rawNodes.length);
                var index = 0;
                var processRawNode = function (rawNode) {
                    var opNode = new OpNodeImpl(rawNode);
                    if (isInEmbeddedPred(opNode)) {
                        embeddingNodeNames.push(opNode.name);
                        inEmbedding[opNode.name] = opNode;
                        return opNode;
                    }
                    if (isOutEmbeddedPred(opNode)) {
                        embeddingNodeNames.push(opNode.name);
                        outEmbedding[opNode.name] = opNode;
                        _.each(opNode.inputs, function (input) {
                            var inputName = input.name;
                            outEmbeddings[inputName] = outEmbeddings[inputName] || [];
                            outEmbeddings[inputName].push(opNode);
                        });
                        return opNode;
                    }
                    // The node is not an embedding, so add it to the names and nodes
                    // lists.
                    opNodes[index] = opNode;
                    nodeNames[index] = opNode.name;
                    index++;
                    return opNode;
                };
                _.each(rawNodes, processRawNode);
                var processFunction = function (func) {
                    // Give the function itself a node.
                    var functionNodeName = graph_1.FUNCTION_LIBRARY_NODE_PREFIX + func.signature.name;
                    // Create an op node for the function. Mark it as part of a
                    // function library.
                    processRawNode({
                        name: functionNodeName,
                        input: [],
                        device: '',
                        op: '',
                        attr: [],
                    });
                    // If the function has inputs, make nodes out of them.
                    if (func.signature.input_arg) {
                        // Makes an OpNode out of either an input_arg of a library
                        // function.
                        var currentInputIndex_1 = 0;
                        var processInput = function (arg) {
                            var opNode = processRawNode({
                                name: functionNodeName + graph_1.NAMESPACE_DELIM + arg.name,
                                input: [],
                                device: '',
                                op: 'input_arg',
                                attr: [{
                                        key: 'T',
                                        value: {
                                            type: arg.type,
                                        },
                                    }],
                            });
                            opNode.functionInputIndex = currentInputIndex_1;
                            currentInputIndex_1++;
                        };
                        // Make nodes for input args of the function. Unfortunately, the
                        // pbtxt configuration language is not rich enough to
                        // differentiate between an array with 1 item vs 1 object
                        // property.
                        if (func.signature.input_arg['name']) {
                            // There is only 1 input arg.
                            processInput(func.signature.input_arg);
                        }
                        else {
                            // There are several input args.
                            _.each(func.signature.input_arg, processInput);
                        }
                    }
                    // Make nodes for output args of the function. Track the names of
                    // output args within the keys of this object. Unlike the
                    // input_args, the output_args are already defined within the
                    // node_defs of the library function.
                    var currentOutputIndex = 0;
                    var outputArgNames = {};
                    // If the function has outputs, make nodes out of them.
                    if (func.signature.output_arg) {
                        var processOutput = function (arg) {
                            outputArgNames[functionNodeName + graph_1.NAMESPACE_DELIM + arg.name] =
                                currentOutputIndex;
                            currentOutputIndex++;
                        };
                        if (func.signature.output_arg['name']) {
                            // There is only 1 output arg.
                            processOutput(func.signature.output_arg);
                        }
                        else {
                            // There are several output args.
                            _.each(func.signature.output_arg, processOutput);
                        }
                    }
                    _.each(func.node_def, function (rawNode) {
                        // Prefix with the name of the function so that the graph
                        // correctly computes the hierarchy (and makes metanodes).
                        rawNode.name = functionNodeName + '/' + rawNode.name;
                        if (typeof rawNode.input === 'string') {
                            rawNode.input = [rawNode.input];
                        }
                        var opNode = processRawNode(rawNode);
                        if (_.isNumber(outputArgNames[rawNode.name])) {
                            // Mark the node as one of the outputs of the function.
                            opNode.functionOutputIndex = outputArgNames[rawNode.name];
                        }
                        _.each(opNode.inputs, function (normalizedInput) {
                            normalizedInput.name =
                                functionNodeName + graph_1.NAMESPACE_DELIM + normalizedInput.name;
                        });
                    });
                };
                if (graphDef.library && graphDef.library.function) {
                    // This graph contains functions.
                    _.each(graphDef.library.function, processFunction);
                }
                opNodes.splice(index);
                nodeNames.splice(index);
                return opNodes;
            }, tracker)
                .then(function (opNodes) {
                // Create the graph data structure from the graphlib library.
                return tf.graph.util.runAsyncTask('Building the data structure', 70, function () {
                    var normalizedNameDict = mapStrictHierarchy(nodeNames, embeddingNodeNames);
                    var graph = new SlimGraph;
                    // Add the nodes to the graph.
                    _.each(opNodes, function (opNode) {
                        var normalizedName = normalizedNameDict[opNode.name] || opNode.name;
                        graph.nodes[normalizedName] = opNode;
                        // Check if the node has out-embeddings. If yes, add them to the
                        // node.
                        if (opNode.name in outEmbeddings) {
                            opNode.outEmbeddings = outEmbeddings[opNode.name];
                            // Normalize the names of the out-embeddings.
                            _.each(opNode.outEmbeddings, function (node) {
                                node.name = normalizedNameDict[node.name] || node.name;
                            });
                        }
                        // Update the name of the node.
                        opNode.name = normalizedName;
                    });
                    // Visit each node's inputs to add the edges to the graph. If the
                    // input
                    // is an in-embedding, then add it to the node's in-embeddings
                    // instead.
                    _.each(opNodes, function (opNode) {
                        _.each(opNode.inputs, function (input, i) {
                            var inputName = input.name;
                            if (inputName in inEmbedding) {
                                var inEmbedNode = inEmbedding[inputName];
                                opNode.inEmbeddings.push(inEmbedNode);
                                // Move the inputs of the in-embedding node into incoming
                                // edges of
                                // the main node. E.g. the control dependency of a constant
                                // node
                                // should be moved to the op node where the constant is
                                // embedded.
                                for (var _i = 0, _a = inEmbedNode.inputs; _i < _a.length; _i++) {
                                    var embedInput = _a[_i];
                                    addEdgeToGraph(graph, normalizedNameDict[embedInput.name] ||
                                        embedInput.name, opNode, embedInput, params, i);
                                }
                            }
                            else if (inputName in outEmbedding) {
                                // Move the inputs of the out-embedding node into inputs of
                                // the main node where the out-embedding points to.
                                var outEmbedNode = outEmbedding[inputName];
                                for (var _b = 0, _c = outEmbedNode.inputs; _b < _c.length; _b++) {
                                    var embedInput = _c[_b];
                                    addEdgeToGraph(graph, normalizedNameDict[embedInput.name] ||
                                        embedInput.name, opNode, input, params, i);
                                }
                            }
                            else {
                                addEdgeToGraph(graph, normalizedNameDict[inputName] || inputName, opNode, input, params, i);
                            }
                        });
                    });
                    // Normalize the names of in-embeddings.
                    _.each(inEmbedding, function (node, name) {
                        node.name = normalizedNameDict[node.name] || node.name;
                    });
                    return graph;
                }, tracker);
            });
        }
        graph_1.build = build;
        ;
        /**
         * Create a new graphlib.Graph() instance with default parameters
         */
        function createGraph(name, type, opt) {
            if (opt === void 0) { opt = {}; }
            var graph = new graphlib.Graph(opt);
            graph.setGraph({
                name: name,
                rankdir: 'BT',
                type: type
            });
            return graph;
        }
        graph_1.createGraph = createGraph;
        ;
        /**
         * Create a predicate for checking whether a node should be embedded based on
         * the specified types.
         */
        function getEmbedPredicate(types) {
            return function (node) {
                // check types
                for (var i = 0; i < types.length; i++) {
                    var regExp = new RegExp(types[i]);
                    if (node.op.match(regExp)) {
                        return true;
                    }
                }
                return false;
            };
        }
        ;
        /**
         * Returns a strict node name (name => name/(name)) to avoid conflicts
         * where the node name is also a namespace.
         */
        function getStrictName(name) {
            var parts = name.split(graph_1.NAMESPACE_DELIM);
            return name + graph_1.NAMESPACE_DELIM + '(' + parts[parts.length - 1] + ')';
        }
        graph_1.getStrictName = getStrictName;
        /**
         * For each op node (embedding or non-embedding), rename it if there is a
         * non-embedding node under its namespace. For example, assume node name 'A'.
         * If there is a non-embedding node under its namespace (e.g. 'A/B'), 'A' will
         * be renamed to 'A/(A)'. Then the namespace 'A' will contain 2 nodes: '(A)'
         * and 'B'. If all the nodes under 'A' are embedding nodes (e.g. constant and
         * summary), keep 'A' as an Op node and don't create a namespace.
         *
         * @param nodeNames An array of regular (non-embedding) node names.
         * @param embeddingNodeNames An array of embedding node names.
         * @return Dictionary object mapping names that need to be renamed to
         *     new names.
         */
        function mapStrictHierarchy(nodeNames, embeddingNodeNames) {
            /** Dictionary that maps the old new to the new name */
            var newNameDictionary = {};
            /** Set used to store all namespaces. */
            var namespaceSet = {};
            // sort the nodes to make prefix check faster
            nodeNames.sort();
            // look for nodes with a prefix a,a/b -> a/(a),a/b
            for (var i = 0; i < nodeNames.length - 1; ++i) {
                var a = nodeNames[i];
                // Get all the parent namespaces of the current node
                // and add them in the namespace set.
                _.each(getHierarchicalPath(a).slice(0, -1), function (ns) {
                    namespaceSet[ns] = true;
                });
                for (var j = i + 1; j < nodeNames.length; ++j) {
                    var b = nodeNames[j];
                    if (_.startsWith(b, a)) {
                        if (b.length > a.length && b.charAt(a.length) === graph_1.NAMESPACE_DELIM) {
                            newNameDictionary[a] = getStrictName(a);
                            break;
                        }
                    }
                    else {
                        break;
                    }
                }
            }
            // Go through all the embedding node names and rename them in case they
            // collide with namespaces.
            _.each(embeddingNodeNames, function (embeddingName) {
                if (embeddingName in namespaceSet) {
                    // Rename to follow strict hierarchy.
                    newNameDictionary[embeddingName] = getStrictName(embeddingName);
                }
            });
            return newNameDictionary;
        }
        ;
        /**
         * Returns a list of the degrees of each node in the graph.
         */
        function degreeSequence(graph) {
            var degrees = graph.nodes().map(function (name) {
                return graph.neighbors(name).length;
            });
            degrees.sort();
            return degrees;
        }
        ;
        /**
         * Returns if the degree sequence of the two graphs is the same.
         */
        function hasSimilarDegreeSequence(graph1, graph2) {
            var dg1 = degreeSequence(graph1);
            var dg2 = degreeSequence(graph2);
            for (var i = 0; i < dg1.length; i++) {
                if (dg1[i] !== dg2[i]) {
                    return false;
                }
            }
            return true;
        }
        graph_1.hasSimilarDegreeSequence = hasSimilarDegreeSequence;
        ;
        /**
         * Returns the hierarchical path of the current node, based on the node's name.
         * For example, if the name is 'a/b/c', the returned path is
         * ['a', 'a/b', 'a/b/c'].
         */
        function getHierarchicalPath(name, seriesNames) {
            var path = [];
            var i = name.indexOf(graph_1.NAMESPACE_DELIM);
            // Push all parent portions of the path.
            while (i >= 0) {
                path.push(name.substring(0, i));
                i = name.indexOf(graph_1.NAMESPACE_DELIM, i + 1);
            }
            // If the node's path is under a series, then add the series node name to the
            // hierarchical path as the parent of the leaf.
            if (seriesNames) {
                var seriesName = seriesNames[name];
                if (seriesName) {
                    path.push(seriesName);
                }
            }
            // Push the leaf of the path.
            path.push(name);
            return path;
        }
        graph_1.getHierarchicalPath = getHierarchicalPath;
        ;
        /**
         * Returns the string for the node inclusion toggle button, dependant
         * on the provided current InclusionType.
         */
        function getIncludeNodeButtonString(include) {
            if (include === tf.graph.InclusionType.EXCLUDE) {
                return 'Add to main graph';
            }
            else {
                return 'Remove from main graph';
            }
        }
        graph_1.getIncludeNodeButtonString = getIncludeNodeButtonString;
        ;
        /**
         * Returns the string for the series node grouping toggle button, dependant
         * on the provided current SeriesGroupingType.
         */
        function getGroupSeriesNodeButtonString(group) {
            if (group === tf.graph.SeriesGroupingType.GROUP) {
                return 'Ungroup this series of nodes';
            }
            else {
                return 'Group this series of nodes';
            }
        }
        graph_1.getGroupSeriesNodeButtonString = getGroupSeriesNodeButtonString;
        ;
        /**
         * Toggle the node series grouping option in the provided map, setting it
         * to ungroup if the series is not already in the map.
         */
        function toggleNodeSeriesGroup(map, name) {
            if (!(name in map) || map[name] === tf.graph.SeriesGroupingType.GROUP) {
                map[name] = tf.graph.SeriesGroupingType.UNGROUP;
            }
            else {
                map[name] = tf.graph.SeriesGroupingType.GROUP;
            }
        }
        graph_1.toggleNodeSeriesGroup = toggleNodeSeriesGroup;
        ;
    })(graph = tf.graph || (tf.graph = {}));
})(tf || (tf = {})); // close module tf.graph
