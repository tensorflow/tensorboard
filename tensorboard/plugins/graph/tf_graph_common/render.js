var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
/**
 * Package for the Render Hierarchy for TensorFlow graph.
 */
var tf;
(function (tf) {
    var graph;
    (function (graph_1) {
        var render;
        (function (render) {
            /**
             * Color parameters for op nodes.
             */
            render.OpNodeColors = { DEFAULT_FILL: '#ffffff', DEFAULT_STROKE: '#b2b2b2',
                COMPATIBLE: '#0f9d58', INCOMPATIBLE: '#db4437' };
            /**
             * Color parameters for node encoding.
             * @type {Object}
             */
            render.MetanodeColors = {
                /**
                 * Default fill and stroke to use when no other information is available.
                 */
                DEFAULT_FILL: '#d9d9d9',
                DEFAULT_STROKE: '#a6a6a6',
                SATURATION: 0.6,
                LIGHTNESS: 0.85,
                /**
                 * Neutral color to use when the node is expanded (used when coloring by
                 * compute time, memory and device).
                 */
                EXPANDED_COLOR: '#f0f0f0',
                /**
                 * Standard hue values for node color palette.
                 */
                HUES: [220, 100, 180, 40, 20, 340, 260, 300, 140, 60],
                STRUCTURE_PALETTE: function (id, lightened) {
                    // The code below is a flexible way to computationally create a set
                    // of colors that go well together.
                    var hues = render.MetanodeColors.HUES;
                    var n = hues.length;
                    var hue = hues[id % n];
                    var m = Math.sin(hue * Math.PI / 360);
                    var sat = lightened ? 30 : 90 - 60 * m;
                    var light = lightened ? 95 : 80;
                    return d3.hsl(hue, .01 * sat, .01 * light).toString();
                },
                DEVICE_PALETTE: function (index) {
                    return render.MetanodeColors.STRUCTURE_PALETTE(index);
                },
                XLA_CLUSTER_PALETTE: function (index) {
                    return render.MetanodeColors.STRUCTURE_PALETTE(index);
                },
                UNKNOWN: '#eee',
                GRADIENT_OUTLINE: '#888'
            };
            /**
             * Color parameters for op nodes.
             */
            render.SeriesNodeColors = {
                DEFAULT_FILL: 'white',
                DEFAULT_STROKE: '#b2b2b2'
            };
            /**
             * Parameters that affect how the graph is rendered on the screen.
             */
            var PARAMS = {
                /**
                 * Whether to extract high degree nodes from the core part of the graph.
                 */
                enableExtraction: true,
                /**
                 * The minimum number of nodes for a graph to have in order for high in and
                 * out degree nodes to be extracted in auxiliary. The aim here is to prevent
                 * nodes from being extracted from small graphs.
                 */
                minNodeCountForExtraction: 15,
                /**
                 * The minimum in or out degree a node must have in order to be possibly
                 * extracted.
                 */
                minDegreeForExtraction: 5,
                /**
                 * Maximum number of control edges a node can have before they aren't
                 * displayed.
                 */
                maxControlDegree: 4,
                /**
                 * Maximum in (for outbound bridge paths) or out (for inbound bridge paths)
                 * degree of a node allowed for a bridge path to be rendered to it from a
                 * subhierarchy of nodes. Having a max prevents having too many nodes emanate
                 * from a subhierarchy and crowding up.
                 */
                maxBridgePathDegree: 4,
                /**
                 * Types patterns for predefined out-extract nodes, which are
                 * sink-like nodes that will be extracted from the main graph.
                 */
                outExtractTypes: [
                    'NoOp' // NoOps are sink-like used for managing control dependencies.
                ],
                /**
                 * Types patterns for predefined in-extract nodes, which are
                 * source-like nodes that will be extracted from the main graph.
                 */
                inExtractTypes: [],
                /**
                 * When removing edges from a high degree node, remove all of its edges if
                 * detachAllEdgesForHighDegree is true.  Otherwise remove all in-edges if
                 * the node has high in-degree, or all out-edges if the node has high
                 * out-degree.
                 */
                detachAllEdgesForHighDegree: true,
                /**
                 * After extracting high in/out degree nodes and predefined
                 * source-like/sink-like, extract isolated nodes to the side
                 * if this extractIsolatedNodesWithAnnotationsOnOneSide is true.
                 */
                extractIsolatedNodesWithAnnotationsOnOneSide: true,
                /**
                 * Whether to add bridge nodes and edges to the core when building the
                 * subhierarchy of an expanded metanode. See buildSubhierarchy().
                 */
                enableBridgegraph: true,
                /**
                 * 2 colors, for the minimum and maximum value respectively, whenever we
                 * have a gradient scale.
                 */
                minMaxColors: ['#fff5f0', '#fb6a4a'],
                /**
                 * Maximum number of annotations to be displayed on a node before an
                 * ellipsis is used.
                 */
                maxAnnotations: 5
            };
            /**
             * The regular expression to use when parsing for the string that is
             * used to label a function node in the graph. We strip away a prefix
             * indicating that the node represents a function definition. We also
             * remove an arbitrary hexadecimal suffix and the number following it
             * if it is present. To be clear, we extract foo from
             * __function_library__foo_deadb00f_42.
             */
            var nodeDisplayNameRegex = new RegExp('^(?:' + tf.graph.FUNCTION_LIBRARY_NODE_PREFIX +
                ')?(\\w+)_[a-z0-9]{8}(?:_\\d+)?$');
            /**
             * Stores the rendering information, such as x and y coordinates,
             * for each node in the graph.
             */
            var RenderGraphInfo = /** @class */ (function () {
                function RenderGraphInfo(hierarchy, displayingStats) {
                    this.hierarchy = hierarchy;
                    this.displayingStats = displayingStats;
                    this.index = {};
                    this.renderedOpNames = [];
                    this.computeScales();
                    // Maps node name to whether the rendering hierarchy was already
                    // constructed.
                    this.hasSubhierarchy = {};
                    this.root = new RenderGroupNodeInfo(hierarchy.root, hierarchy.graphOptions);
                    this.index[hierarchy.root.name] = this.root;
                    this.renderedOpNames.push(hierarchy.root.name);
                    this.buildSubhierarchy(hierarchy.root.name);
                    this.root.expanded = true;
                    this.traceInputs = false;
                }
                RenderGraphInfo.prototype.computeScales = function () {
                    this.deviceColorMap = d3.scaleOrdinal()
                        .domain(this.hierarchy.devices)
                        .range(_.map(d3.range(this.hierarchy.devices.length), render.MetanodeColors.DEVICE_PALETTE));
                    this.xlaClusterColorMap =
                        d3.scaleOrdinal()
                            .domain(this.hierarchy.xlaClusters)
                            .range(_.map(d3.range(this.hierarchy.xlaClusters.length), render.MetanodeColors.XLA_CLUSTER_PALETTE));
                    var topLevelGraph = this.hierarchy.root.metagraph;
                    // Find the maximum memory usage. Use 0 as the minimum.
                    var maxMemory = d3.max(topLevelGraph.nodes(), function (nodeName, index) {
                        var node = topLevelGraph.node(nodeName);
                        // Some ops don't have stats at all.
                        if (node.stats != null) {
                            return node.stats.totalBytes;
                        }
                    });
                    this.memoryUsageScale = d3.scaleLinear()
                        .domain([0, maxMemory])
                        .range(PARAMS.minMaxColors);
                    // Find the maximum compute time. Use 0 as the minimum.
                    var maxComputeTime = d3.max(topLevelGraph.nodes(), function (nodeName, index) {
                        var node = topLevelGraph.node(nodeName);
                        // Some ops don't have stats at all.
                        if (node.stats != null) {
                            return node.stats.getTotalMicros();
                        }
                    });
                    this.computeTimeScale = d3.scaleLinear()
                        .domain([0, maxComputeTime])
                        .range(PARAMS.minMaxColors);
                    this.edgeWidthSizedBasedScale = this.hierarchy.hasShapeInfo ?
                        graph_1.scene.edge.EDGE_WIDTH_SIZE_BASED_SCALE :
                        d3.scaleLinear()
                            .domain([1, this.hierarchy.maxMetaEdgeSize])
                            .range([graph_1.scene.edge.MIN_EDGE_WIDTH, graph_1.scene.edge.MAX_EDGE_WIDTH]);
                };
                /**
                 * Get a previously created RenderNodeInfo by its node name.
                 */
                RenderGraphInfo.prototype.getRenderNodeByName = function (nodeName) {
                    return this.index[nodeName];
                };
                /**
                 * Get the underlying node in the hierarchical graph by its name.
                 */
                RenderGraphInfo.prototype.getNodeByName = function (nodeName) {
                    return this.hierarchy.node(nodeName);
                };
                RenderGraphInfo.prototype.colorHistogram = function (histogram, colors) {
                    if (Object.keys(histogram).length > 0) {
                        // Compute the total # of items.
                        var numItems_1 = _.sum(Object.keys(histogram).map(function (key) { return histogram[key]; }));
                        return Object.keys(histogram).map(function (key) { return ({
                            color: colors(key),
                            // Normalize to a proportion of total # of items.
                            proportion: histogram[key] / numItems_1,
                        }); });
                    }
                    console.info('no pairs found!');
                    return null;
                };
                /**
                 * Get a previously created RenderNodeInfo for the specified node name,
                 * or create one if it hasn't been created yet.
                 */
                RenderGraphInfo.prototype.getOrCreateRenderNodeByName = function (nodeName) {
                    var _a, _b;
                    // Polymer may invoke this with null.
                    if (!nodeName) {
                        return null;
                    }
                    if (nodeName in this.index) {
                        return this.index[nodeName];
                    }
                    var node = this.hierarchy.node(nodeName);
                    // Exit early if the node does not exist in the hierarchy. This can happen
                    // when a graph is reloaded while the infocard points to a node not visible
                    // at the top-level.
                    if (!node) {
                        return null;
                    }
                    var renderInfo = node.isGroupNode ?
                        new RenderGroupNodeInfo(node, this.hierarchy.graphOptions) :
                        new RenderNodeInfo(node);
                    this.index[nodeName] = renderInfo;
                    this.renderedOpNames.push(nodeName);
                    if (node.stats) {
                        renderInfo.memoryColor = this.memoryUsageScale(node.stats.totalBytes);
                        renderInfo.computeTimeColor =
                            this.computeTimeScale(node.stats.getTotalMicros());
                    }
                    // We only fade nodes when we're displaying stats.
                    renderInfo.isFadedOut = this.displayingStats &&
                        !tf.graph.util.hasDisplayableNodeStats(node.stats);
                    var deviceHistogram = null;
                    var xlaClusterHistogram = null;
                    var opCompatibility = null;
                    if (node.isGroupNode) {
                        deviceHistogram = node.deviceHistogram;
                        xlaClusterHistogram = node.xlaClusterHistogram;
                        var compat = node.compatibilityHistogram.compatible;
                        var incompat = node.compatibilityHistogram.incompatible;
                        if (compat != 0 || incompat != 0) {
                            opCompatibility = compat / (compat + incompat);
                        }
                    }
                    else {
                        var device = renderInfo.node.device;
                        if (device) {
                            deviceHistogram = (_a = {}, _a[device] = 1, _a);
                        }
                        var xlaCluster = renderInfo.node.xlaCluster;
                        if (xlaCluster) {
                            xlaClusterHistogram = (_b = {}, _b[xlaCluster] = 1, _b);
                        }
                        if (renderInfo.node.type === graph_1.NodeType.OP) {
                            opCompatibility = renderInfo.node.compatible ? 1 : 0;
                        }
                    }
                    if (deviceHistogram) {
                        renderInfo.deviceColors =
                            this.colorHistogram(deviceHistogram, this.deviceColorMap);
                    }
                    if (xlaClusterHistogram) {
                        renderInfo.xlaClusterColors =
                            this.colorHistogram(xlaClusterHistogram, this.xlaClusterColorMap);
                    }
                    if (opCompatibility != null) {
                        renderInfo.compatibilityColors = [
                            {
                                color: tf.graph.render.OpNodeColors.COMPATIBLE,
                                proportion: opCompatibility
                            },
                            {
                                color: tf.graph.render.OpNodeColors.INCOMPATIBLE,
                                proportion: 1 - opCompatibility
                            }
                        ];
                    }
                    return this.index[nodeName];
                };
                /**
                 * Return the nearest ancestor node, including itself, that is visible
                 * in the visualization. This method is used so that we can select
                 * (highlight) a node that isn't drawn yet, by selecting (highlighting)
                 * its nearest ancestor that has been drawn.
                 */
                RenderGraphInfo.prototype.getNearestVisibleAncestor = function (name) {
                    var path = graph_1.getHierarchicalPath(name);
                    var i = 0;
                    var renderNode = null;
                    // Fallthrough. If everything was expanded return the node.
                    var nodeName = name;
                    for (; i < path.length; i++) {
                        nodeName = path[i];
                        renderNode = this.getRenderNodeByName(nodeName);
                        // Op nodes have expanded set to false by default.
                        if (!renderNode.expanded) {
                            break;
                        }
                    }
                    // Check case where highlighted node is an embedded node whose parent node
                    // is also its hierarchical parent. In this case, we want to return the
                    // embedded node name, as it is also displayed if its parent has been
                    // displayed.
                    if (i == path.length - 2) {
                        var nextName = path[i + 1];
                        if (renderNode.inAnnotations.nodeNames[nextName]) {
                            return nextName;
                        }
                        if (renderNode.outAnnotations.nodeNames[nextName]) {
                            return nextName;
                        }
                    }
                    return nodeName;
                };
                // TODO: Delete this an any code it touches (all deprecated).
                RenderGraphInfo.prototype.setDepth = function (depth) {
                    setGroupNodeDepth(this.root, +depth);
                };
                /**
                 * Returns true if the renderNode is an isolated node within its parent node.
                 */
                RenderGraphInfo.prototype.isNodeAuxiliary = function (renderNode) {
                    var parentNode = this.getRenderNodeByName(renderNode.node.parentNode.name);
                    var found = _.find(parentNode.isolatedInExtract, function (node) {
                        return node.node.name === renderNode.node.name;
                    });
                    if (found) {
                        return true;
                    }
                    found = _.find(parentNode.isolatedOutExtract, function (node) {
                        return node.node.name === renderNode.node.name;
                    });
                    return !!found;
                };
                /**
                 * Returns a list of ops that have been rendered so far for this graph. More
                 * ops may later be rendered if the user expands nodes for instance. The list
                 * returned here can only stay the same size or grow on successive calls.
                 */
                RenderGraphInfo.prototype.getNamesOfRenderedOps = function () {
                    return this.renderedOpNames;
                };
                /**
                 * Clones an op node and adds it to a metagraph. Does nothing if an op node
                 * with the same new name has already been created within the metagraph. This
                 * method is used when duplicating a library function to be injected within a
                 * metanode representing a function call.
                 * @param parentMetanode The parent metanode on which to add the new node.
                 * @param node The op node to clone.
                 * @param newPrefix The prefix string to use in lieu of the one that merely
                 *     indicates that the metanode represents a function defined in the
                 *     library. This prefix should reflect graph hierarchy.
                 * @return The newly created op node (the clone of the original).
                 */
                RenderGraphInfo.prototype.cloneAndAddFunctionOpNode = function (parentMetanode, libraryFunctionNodeName, node, newPrefix) {
                    var _this = this;
                    var newName = node.name.replace(libraryFunctionNodeName, newPrefix);
                    var newOpNode = parentMetanode.metagraph.node(newName);
                    if (newOpNode) {
                        // This node had already been created and added to the graph.
                        return newOpNode;
                    }
                    // Create a new op node.
                    newOpNode = new graph_1.OpNodeImpl({
                        name: newName,
                        input: [],
                        device: node.device,
                        op: node.op,
                        attr: _.cloneDeep(node.attr),
                    });
                    // Update various properties.
                    newOpNode.cardinality = node.cardinality;
                    newOpNode.include = node.include;
                    newOpNode.outputShapes = _.cloneDeep(node.outputShapes);
                    newOpNode.xlaCluster = node.xlaCluster;
                    newOpNode.functionInputIndex = node.functionInputIndex;
                    newOpNode.functionOutputIndex = node.functionOutputIndex;
                    // Update the inputs of the new node to reflect the new path.
                    newOpNode.inputs = node.inputs.map(function (normalizedInput) {
                        var newNormalizedInput = _.clone(normalizedInput);
                        newNormalizedInput.name = normalizedInput.name.replace(libraryFunctionNodeName, newPrefix);
                        return newNormalizedInput;
                    });
                    // Add the new op node to the hierarchy and metagraph. Also add it to its
                    // parent metanode.
                    newOpNode.parentNode = parentMetanode;
                    parentMetanode.metagraph.setNode(newOpNode.name, newOpNode);
                    this.hierarchy.setNode(newOpNode.name, newOpNode);
                    // Update embeddings.
                    var updateEmbeddingOpNode = function (embeddingNode) {
                        return _this.cloneAndAddFunctionOpNode(parentMetanode, libraryFunctionNodeName, embeddingNode, newPrefix);
                    };
                    newOpNode.inEmbeddings = node.inEmbeddings.map(updateEmbeddingOpNode);
                    newOpNode.outEmbeddings = node.outEmbeddings.map(updateEmbeddingOpNode);
                    return newOpNode;
                };
                /**
                 * Clones a Metanode that represents a function defined in the graph library.
                 * We dynamically inject a clone of a function into a meta graph when the user
                 * expands a function call. We cannot do this at the beginning because the
                 * functions may recursively call themselves or other functions.
                 * @param metagraph The metagraph we are currently rendering the sub-hierarchy
                 *     for.
                 * @param opNodeToReplace The op node in the graph to replace with a new
                 *     (expandable) metanode that visualizes the innards of a function.
                 * @param libraryMetanode The metanode for a library function to clone.
                 * @param oldPrefix The old prefix to replace (that just reflects how this
                 *     node is for a library function).
                 * @param newPrefix The prefix string to use in lieu of the one that merely
                 *     indicates that the metanode represents a function defined in the
                 *     library. This prefix should reflect graph hierarchy.
                 */
                RenderGraphInfo.prototype.cloneFunctionLibraryMetanode = function (metagraph, opNodeToReplace, libraryMetanode, oldPrefix, newPrefix) {
                    // Make a mapping between function output index and the new node for the
                    // output.
                    var functionOutputIndexToNode = {};
                    var newMetanode = this.cloneFunctionLibraryMetanodeHelper(metagraph, opNodeToReplace, libraryMetanode, oldPrefix, newPrefix, functionOutputIndexToNode);
                    if (!_.isEmpty(functionOutputIndexToNode)) {
                        // After we have cloned the edges within the metanode, we still must add
                        // edges that emanate out of output ops within the function.
                        this.patchEdgesFromFunctionOutputs(opNodeToReplace, functionOutputIndexToNode);
                    }
                    return newMetanode;
                };
                /**
                 * A helper subroutine that performs the bulk of the logic for
                 * `cloneFunctionLibraryMetanode`.
                 * @param metagraph The metagraph we are currently rendering the sub-hierarchy
                 *     for.
                 * @param opNodeToReplace The op node in the graph to replace with a new
                 *     (expandable) metanode that visualizes the innards of a function.
                 * @param libraryMetanode The metanode for a library function to clone.
                 * @param oldPrefix The old prefix to replace (that just reflects how this
                 *     node is for a library function).
                 * @param newPrefix The prefix string to use in lieu of the one that merely
                 *     indicates that the metanode represents a function defined in the
                 *     library. This prefix should reflect graph hierarchy.
                 * @param functionOutputIndexToNode A mapping between function output index
                 *     and the corresponding output node. Used to connect outputs with
                 *     destinations outside of the function metanode.
                 */
                RenderGraphInfo.prototype.cloneFunctionLibraryMetanodeHelper = function (metagraph, opNodeToReplace, libraryMetanode, oldPrefix, newPrefix, functionOutputIndexToNode) {
                    var _this = this;
                    var newMetanode = tf.graph.createMetanode(libraryMetanode.name.replace(oldPrefix, newPrefix));
                    // Copy over various properties.
                    newMetanode.depth = libraryMetanode.depth;
                    newMetanode.cardinality = libraryMetanode.cardinality;
                    newMetanode.templateId = libraryMetanode.templateId;
                    newMetanode.opHistogram = _.clone(libraryMetanode.opHistogram);
                    newMetanode.deviceHistogram = _.clone(libraryMetanode.deviceHistogram);
                    newMetanode.xlaClusterHistogram =
                        _.clone(libraryMetanode.xlaClusterHistogram);
                    newMetanode.hasNonControlEdges = libraryMetanode.hasNonControlEdges;
                    newMetanode.include = libraryMetanode.include;
                    newMetanode.nodeAttributes = _.clone(libraryMetanode.nodeAttributes);
                    newMetanode.associatedFunction = libraryMetanode.associatedFunction;
                    // Recursively duplicate the children nodes.
                    _.each(libraryMetanode.metagraph.nodes(), function (nodeName) {
                        var node = libraryMetanode.metagraph.node(nodeName);
                        switch (node.type) {
                            case graph_1.NodeType.META:
                                // Recursively duplicate the metanode.
                                var newNode = _this.cloneFunctionLibraryMetanodeHelper(metagraph, opNodeToReplace, node, oldPrefix, newPrefix, functionOutputIndexToNode);
                                // Add the new node to the graph.
                                newNode.parentNode = newMetanode;
                                newMetanode.metagraph.setNode(newNode.name, newNode);
                                _this.hierarchy.setNode(newNode.name, newNode);
                                break;
                            case graph_1.NodeType.OP:
                                // Duplicate the op node.
                                var newOpNode = _this.cloneAndAddFunctionOpNode(newMetanode, oldPrefix, node, newPrefix);
                                if (_.isNumber(newOpNode.functionInputIndex)) {
                                    // This node represents an input_arg of the library function. Give
                                    // it edges so that its bridge edges are created correctly.
                                    _this.patchEdgesIntoFunctionInputs(opNodeToReplace, newOpNode);
                                }
                                if (_.isNumber(newOpNode.functionOutputIndex)) {
                                    functionOutputIndexToNode[newOpNode.functionOutputIndex] =
                                        newOpNode;
                                }
                                break;
                            default:
                                // This logic should never run because the meta graph should only
                                // contain meta and op nodes.
                                console.warn(node.name + ' is oddly neither a metanode nor an opnode.');
                        }
                    });
                    // Clone the edges within the function library metanode.
                    this.cloneLibraryMetanodeEdges(libraryMetanode, newMetanode, oldPrefix, newPrefix);
                    return newMetanode;
                };
                /**
                 * Clones the edges within `libraryMetanode` and adds them to `newMetanode`.
                 * The names of edge sources and destinations have their prefixes replaced
                 * with new prefixes that reflect their hierarchical positions in the graph
                 * instead of within the function library template. This is a subroutine for
                 * dynamically injecting a function metanode into the graph.
                 */
                RenderGraphInfo.prototype.cloneLibraryMetanodeEdges = function (libraryMetanode, newMetanode, oldPrefix, newPrefix) {
                    _.each(libraryMetanode.metagraph.edges(), function (edgeObject) {
                        var edge = libraryMetanode.metagraph.edge(edgeObject);
                        var newV = edge.v.replace(oldPrefix, newPrefix);
                        var newW = edge.w.replace(oldPrefix, newPrefix);
                        var newMetaEdge = new graph_1.MetaedgeImpl(newV, newW);
                        // Duplicate various properties.
                        newMetaEdge.inbound = edge.inbound;
                        newMetaEdge.numRegularEdges = edge.numRegularEdges;
                        newMetaEdge.numControlEdges = edge.numControlEdges;
                        newMetaEdge.numRefEdges = edge.numRefEdges;
                        newMetaEdge.totalSize = edge.totalSize;
                        if (edge.baseEdgeList) {
                            newMetaEdge.baseEdgeList = edge.baseEdgeList.map(function (baseEdge) {
                                var newBaseEdge = _.clone(baseEdge);
                                newBaseEdge.v = baseEdge.v.replace(oldPrefix, newPrefix);
                                newBaseEdge.w = baseEdge.w.replace(oldPrefix, newPrefix);
                                return newBaseEdge;
                            });
                        }
                        // Set the direction of the edge based on whether it is inbound. The edge
                        // is inbound if its destination is within the metagraph.
                        if (newMetanode.metagraph.node(newW)) {
                            newMetanode.metagraph.setEdge(newV, newW, newMetaEdge);
                        }
                        else {
                            newMetanode.metagraph.setEdge(newW, newV, newMetaEdge);
                        }
                    });
                };
                /**
                 * When a metanode representing a function is cloned and placed into the
                 * graph, we must create edges between inputs into the function call and the
                 * input ops within the function. This function performs that patching.
                 */
                RenderGraphInfo.prototype.patchEdgesIntoFunctionInputs = function (opNodeToReplace, newOpNode) {
                    // If the last few raw inputs are the same node, previous graph logic
                    // collapses them into a single normalized input.
                    var inputIndex = Math.min(newOpNode.functionInputIndex, opNodeToReplace.inputs.length - 1);
                    var newInput = _.clone(opNodeToReplace.inputs[inputIndex]);
                    while (newInput.isControlDependency) {
                        // Ignore control dependencies - they are not assigned to
                        // input_args.
                        inputIndex++;
                        newInput = opNodeToReplace.inputs[inputIndex];
                    }
                    // Clone the normalized input object.
                    newOpNode.inputs.push(newInput);
                    // Update values in the corresponding edge in the high-level
                    // metagraph.
                    var originalMetaEdges = this.hierarchy.getPredecessors(opNodeToReplace.name);
                    // Find the metaedge that the input index corresponds to.
                    // A metaedge may correspond to several edges. For instance,
                    // an edge may enter a series node.
                    var originalMetaEdge;
                    var regularEdgeCount = 0;
                    _.each(originalMetaEdges.regular, function (metaEdge) {
                        regularEdgeCount += metaEdge.numRegularEdges;
                        if (regularEdgeCount > inputIndex) {
                            originalMetaEdge = metaEdge;
                            // Terminate the loop.
                            return false;
                        }
                    });
                    // Also change any base edges that point into the original node to
                    // point to the input arg within the function. These are used to
                    // make bridge edges.
                    _.each(originalMetaEdge.baseEdgeList, function (edge) {
                        if (edge.w === opNodeToReplace.name) {
                            edge.w = newOpNode.name;
                        }
                        if (edge.v === opNodeToReplace.name) {
                            edge.v = newOpNode.name;
                        }
                    });
                };
                /**
                 * When a metanode representing a function is cloned and placed into the
                 * graph, we must create edges between output ops within the new function
                 * metanode to its successors. This function does that after scanning the
                 * successors of the function call.
                 */
                RenderGraphInfo.prototype.patchEdgesFromFunctionOutputs = function (opNodeToReplace, functionOutputIndexToDestinationNode) {
                    var _this = this;
                    // Connect the outputs of the function to other ops.
                    var originalMetaEdges = this.hierarchy.getSuccessors(opNodeToReplace.name);
                    _.each(originalMetaEdges.regular, function (metaedge) {
                        _.each(metaedge.baseEdgeList, function (baseEdge) {
                            // Destination nodes within regular base edges are op nodes.
                            var destinationNode = _this.hierarchy.node(baseEdge.w);
                            _.each(destinationNode.inputs, function (normalizedInput) {
                                // If an output of the function is an input into the op, map it back
                                // to the output within the function so bridge edges are computed.
                                if (normalizedInput.name === opNodeToReplace.name) {
                                    // Map the output tensor index (which in this case is for sure
                                    // numeric because it is an output of a metanode) to the correct
                                    // function output.
                                    var outputNode = functionOutputIndexToDestinationNode[normalizedInput.outputTensorKey];
                                    normalizedInput.name = outputNode.name;
                                    normalizedInput.outputTensorKey = baseEdge.outputTensorKey;
                                }
                            });
                        });
                        // Modify the list of base edges to point from the output so that bridge
                        // edges are correct.
                        _.each(metaedge.baseEdgeList, function (baseEdge) {
                            baseEdge.v =
                                functionOutputIndexToDestinationNode[baseEdge.outputTensorKey].name;
                            baseEdge.outputTensorKey = '0';
                        });
                    });
                };
                RenderGraphInfo.prototype.buildSubhierarchy = function (nodeName) {
                    var _this = this;
                    // Terminate if the rendering hierarchy was already constructed
                    // for this node.
                    if (nodeName in this.hasSubhierarchy) {
                        return;
                    }
                    // Record that we constructed the rendering hierarchy for this node, so we
                    // don't construct it another time.
                    this.hasSubhierarchy[nodeName] = true;
                    var renderNodeInfo = this.index[nodeName];
                    // If it is not a meta node or a series node, don't do anything.
                    if (renderNodeInfo.node.type !== graph_1.NodeType.META &&
                        renderNodeInfo.node.type !== graph_1.NodeType.SERIES) {
                        return;
                    }
                    // At this point we know the rendering information is about a group node.
                    var renderGroupNodeInfo = renderNodeInfo;
                    var metagraph = renderGroupNodeInfo.node.metagraph;
                    var coreGraph = renderGroupNodeInfo.coreGraph;
                    var nodesThatGotCloned = [];
                    var functionCallMetanodesToAdd = [];
                    if (!_.isEmpty(this.hierarchy.libraryFunctions)) {
                        // This graph has library functions. Add them to the current
                        // sub-hierarchy if necessary.
                        _.each(metagraph.nodes(), function (childName) {
                            // Why is this so often undefined?
                            var originalNode = metagraph.node(childName);
                            var libraryFunctionData = _this.hierarchy.libraryFunctions[originalNode.op];
                            if (!libraryFunctionData) {
                                // This node is not a function call.
                                return;
                            }
                            if (childName.indexOf(tf.graph.FUNCTION_LIBRARY_NODE_PREFIX) === 0) {
                                // Do not replace library functions in the graph. The library
                                // functions serve as templates for other nodes.
                                return;
                            }
                            // We later replace the node that is a function call with a copy of the
                            // function metagraph. We do not do so now because we are also looping
                            // through all the nodes.
                            var clonedMetanode = _this.cloneFunctionLibraryMetanode(metagraph, originalNode, libraryFunctionData.node, libraryFunctionData.node.name, originalNode.name);
                            nodesThatGotCloned.push(originalNode);
                            functionCallMetanodesToAdd.push(clonedMetanode);
                        });
                        // Perform node replacement.
                        _.each(functionCallMetanodesToAdd, function (clonedMetanode, i) {
                            var originalNode = nodesThatGotCloned[i];
                            clonedMetanode.parentNode = originalNode.parentNode;
                            metagraph.setNode(originalNode.name, clonedMetanode);
                            _this.hierarchy.setNode(originalNode.name, clonedMetanode);
                        });
                    }
                    // Create render nodes to represent each child from the metagraph. Although
                    // these will initially be added to the coreGraph, they may later be
                    // extracted. Also, due to extraction, the coreGraph may contain disjoint
                    // groups between which there is no visible path (other than annotations).
                    _.each(metagraph.nodes(), function (childName) {
                        var childRenderInfo = _this.getOrCreateRenderNodeByName(childName);
                        var childNode = childRenderInfo.node;
                        coreGraph.setNode(childName, childRenderInfo);
                        if (!childNode.isGroupNode) {
                            _.each(childNode.inEmbeddings, function (embedding) {
                                var renderMetaedgeInfo = new RenderMetaedgeInfo(null);
                                var renderNodeInfo = new RenderNodeInfo(embedding);
                                addInAnnotation(childRenderInfo, embedding, renderNodeInfo, renderMetaedgeInfo, AnnotationType.CONSTANT);
                                _this.index[embedding.name] = renderNodeInfo;
                            });
                            _.each(childNode.outEmbeddings, function (embedding) {
                                var renderMetaedgeInfo = new RenderMetaedgeInfo(null);
                                var renderNodeInfo = new RenderNodeInfo(embedding);
                                addOutAnnotation(childRenderInfo, embedding, renderNodeInfo, renderMetaedgeInfo, AnnotationType.SUMMARY);
                                _this.index[embedding.name] = renderNodeInfo;
                            });
                        }
                    });
                    // Add render metaedge info for edges in the metagraph.
                    _.each(metagraph.edges(), function (edgeObj) {
                        var metaedge = metagraph.edge(edgeObj);
                        var renderMetaedgeInfo = new RenderMetaedgeInfo(metaedge);
                        renderMetaedgeInfo.isFadedOut =
                            _this.index[edgeObj.v].isFadedOut || _this.index[edgeObj.w].isFadedOut;
                        coreGraph.setEdge(edgeObj.v, edgeObj.w, renderMetaedgeInfo);
                    });
                    if (PARAMS.enableExtraction &&
                        renderGroupNodeInfo.node.type === graph_1.NodeType.META) {
                        extractHighDegrees(renderGroupNodeInfo);
                    }
                    // If there are functions, it is possible for metanodes to be dynamically
                    // added later. Construct the hierarchies for nodes that are predecessors to
                    // nodes in the current hierarchy so that edges are drawn correctly.
                    if (!_.isEmpty(this.hierarchy.libraryFunctions)) {
                        this.buildSubhierarchiesForNeededFunctions(metagraph);
                    }
                    if (nodeName === tf.graph.ROOT_NAME) {
                        // Add all metanodes representing library function templates into the
                        // library function scene group for the root node.
                        _.forOwn(this.hierarchy.libraryFunctions, function (libraryFunctionData, functionName) {
                            var node = libraryFunctionData.node;
                            var childRenderInfo = _this.getOrCreateRenderNodeByName(node.name);
                            renderGroupNodeInfo.libraryFunctionsExtract.push(childRenderInfo);
                            // Do not render function definitions in the core graph.
                            childRenderInfo.node.include = graph_1.InclusionType.EXCLUDE;
                            coreGraph.removeNode(node.name);
                        });
                    }
                    // Look up the parent node's render information and short circuit if none.
                    var parentNode = renderGroupNodeInfo.node.parentNode;
                    if (!parentNode) {
                        return;
                    }
                    var parentNodeInfo = this.index[parentNode.name];
                    // Utility function for computing the name of a bridge node.
                    var getBridgeNodeName = function (inbound) {
                        var rest = [];
                        for (var _i = 1; _i < arguments.length; _i++) {
                            rest[_i - 1] = arguments[_i];
                        }
                        return rest.concat([inbound ? 'IN' : 'OUT']).join('~~');
                    };
                    // Build out the bridgegraph.
                    var bridgegraph = this.hierarchy.getBridgegraph(nodeName);
                    // Look for popular nodes so we can make annotations instead of paths.
                    var otherCounts = {
                        // Counts of edges coming INTO other nodes by name (outgoing from self).
                        in: {},
                        // Counts of edges going OUT from other nodes by name (coming into self).
                        out: {},
                        // Counts of all control edges involving other nodes by name.
                        control: {},
                    };
                    _.each(bridgegraph.edges(), function (e) {
                        // An edge is inbound if its destination node is in the metagraph.
                        var inbound = !!metagraph.node(e.w);
                        var otherName = inbound ? e.v : e.w;
                        var metaedge = bridgegraph.edge(e);
                        if (!metaedge.numRegularEdges) {
                            otherCounts.control[otherName] =
                                (otherCounts.control[otherName] || 0) + 1;
                        }
                        else if (inbound) {
                            otherCounts.out[otherName] = (otherCounts.out[otherName] || 0) + 1;
                        }
                        else {
                            otherCounts.in[otherName] = (otherCounts.in[otherName] || 0) + 1;
                        }
                    });
                    // Add annotations and edges for bridgegraph relationships.
                    var hierarchyNodeMap = this.hierarchy.getNodeMap();
                    _.each(bridgegraph.edges(), function (bridgeEdgeObj) {
                        var bridgeMetaedge = bridgegraph.edge(bridgeEdgeObj);
                        // Determine whether this bridge edge is incoming by checking the
                        // metagraph for a node that matches the destination end.
                        var inbound = !!metagraph.node(bridgeEdgeObj.w);
                        // Based on the direction of the edge, one endpoint will be an immediate
                        // child of this renderNodeInfo, and the other endpoint will be a sibling
                        // of the parent (or an ancestor further up).
                        var _a = inbound ?
                            [bridgeEdgeObj.w, bridgeEdgeObj.v] :
                            [bridgeEdgeObj.v, bridgeEdgeObj.w], childName = _a[0], otherName = _a[1];
                        var childRenderInfo = _this.index[childName];
                        var otherRenderInfo = _this.index[otherName];
                        var otherNode = otherRenderInfo ?
                            otherRenderInfo.node :
                            hierarchyNodeMap[otherName];
                        // Determine whether this edge is a control edge between nodes where
                        // either node is high-degree with respect to control edges. This will
                        // be a signal to show it as an annotation instead of a bridge edge.
                        var isHighDegreeControlEdge = !bridgeMetaedge.numRegularEdges &&
                            otherCounts.control[otherName] > PARAMS.maxControlDegree;
                        var _b = inbound ?
                            [renderNodeInfo.inAnnotations, childRenderInfo.inAnnotations] :
                            [renderNodeInfo.outAnnotations, childRenderInfo.outAnnotations], childAnnotations = _b[1];
                        // Don't render a bridge path if the other node has in or out degree above
                        // a threshold, lest bridge paths emanating out of a metagraph crowd up,
                        // as was the case for the Fatcat LSTM lstm_1 > lstm_1 metagraph.
                        var otherDegreeCount = (inbound ? otherCounts.out : otherCounts.in)[otherName];
                        var isOtherHighDegree = otherDegreeCount > PARAMS.maxBridgePathDegree;
                        // The adjoining render metaedge info from the parent's coreGraph, if any.
                        // It will either be a Metaedge involving this node directly, if it
                        // previously came from a metagraph, or it'll be a Metaedge involving
                        // a previously created bridge node standing in for the other node.
                        var adjoiningMetaedge = null;
                        // We can only hope to render a bridge path if:
                        //  - bridgegraph paths are enabled,
                        //  - the other node is not too high-degree,
                        //  - the child is in the core (not extracted for being high-degree), and
                        //  - there's a path (in the traversal sense) between child and other.
                        var canDrawBridgePath = false;
                        if (PARAMS.enableBridgegraph &&
                            !isOtherHighDegree &&
                            !isHighDegreeControlEdge &&
                            childRenderInfo.isInCore()) {
                            // Utility function for finding an adjoining metaedge.
                            var findAdjoiningMetaedge = function (targetName) {
                                var adjoiningEdgeObj = inbound ?
                                    { v: targetName, w: nodeName } :
                                    { v: nodeName, w: targetName };
                                return parentNodeInfo.coreGraph.edge(adjoiningEdgeObj);
                            };
                            adjoiningMetaedge = findAdjoiningMetaedge(otherName);
                            if (!adjoiningMetaedge) {
                                adjoiningMetaedge = findAdjoiningMetaedge(getBridgeNodeName(inbound, otherName, parentNode.name));
                            }
                            canDrawBridgePath = !!adjoiningMetaedge;
                        }
                        // Although dataflow edges are acyclic, control dependency edges may
                        // actually point 'backwards' in the graph. If this bridgeMetaedge is
                        // a control dependency, we need to determine whether it's backwards
                        // pointing so that we render it appropriately.
                        //
                        // For instance, say we're rendering a graph with nodes named A/B and Z/Y,
                        // and we're currently rendering the bridgegraph for A. Further, let's say
                        // that there was an original BaseEdge from A/B->Z/Y and a CONTROL EDGE
                        // from Z/Y=>A/B.
                        //
                        //     +----------------+
                        //     | A              |
                        //     |  +-----+       |         +------+
                        //     |  | B   |>----->|>------->| Z    |
                        //     |  |     |       |         |      |
                        //     |  |     |   *   |         |      |
                        //     |  |     |<=====<|<=======<|      |
                        //     |  +-----+       |         +------+
                        //     +----------------+
                        //
                        // When we render the subhierarchy for Metanode A, we'll come across a
                        // control-only Metaedge in the bridgegraph from Z=>A/B (*). The question
                        // is whether this edge is backwards.
                        //
                        // To answer that question, we follow the chain of adjoining metaedges
                        // until we reach the topmost one. In this case, that's the control-only
                        // Metaedge Z=>A in the ROOT's metagraph. We determine that this edge
                        // is backwards by looking at the topological ordering of ROOT's metagraph
                        // (which ignores control edges) and seeing that Z comes AFTER A.
                        //
                        // The property of being backwards is independent of whether the edge
                        // is inbound or outbound. In the preceding example, if we were building
                        // the subhierarchy for Z, we'd find bridge edge Z/Y=>A, walk to its
                        // topmost adjoining metaedge Z=>A and discover that it's backwards.
                        var backwards = false;
                        if (adjoiningMetaedge && !bridgeMetaedge.numRegularEdges) {
                            // Find the top-most adjoining render metaedge information, and the
                            // GroupNode whose metagraph must contain the associated metaedge.
                            var topAdjoiningMetaedge = adjoiningMetaedge;
                            var topGroupNode = parentNodeInfo.node;
                            while (topAdjoiningMetaedge.adjoiningMetaedge) {
                                topAdjoiningMetaedge = topAdjoiningMetaedge.adjoiningMetaedge;
                                topGroupNode = topGroupNode.parentNode;
                            }
                            // Check against the topological ordering for the top node. The current
                            // bridge metaedge we're evaluating is backwards if its source comes
                            // after its destination.
                            var ordering = _this.hierarchy.getTopologicalOrdering(topGroupNode.name);
                            var e = topAdjoiningMetaedge.metaedge;
                            backwards = ordering[e.v] > ordering[e.w];
                        }
                        // Render backwards control edges as annotations.
                        canDrawBridgePath = canDrawBridgePath && !backwards;
                        // If we can't make a bridge path for any reason, then we add an
                        // annotation instead.
                        if (!canDrawBridgePath) {
                            childAnnotations.push(new Annotation(otherNode, otherRenderInfo, new RenderMetaedgeInfo(bridgeMetaedge), AnnotationType.SHORTCUT, inbound));
                            return;
                        }
                        // At this point, all conditions have been met for drawing a bridge path.
                        // Find or create the IN/OUT node representing otherNode.
                        var bridgeContainerName = getBridgeNodeName(inbound, nodeName);
                        var bridgeNodeName = getBridgeNodeName(inbound, otherName, nodeName);
                        var bridgeNodeRenderInfo = coreGraph.node(bridgeNodeName);
                        if (!bridgeNodeRenderInfo) {
                            // Find or create the directional container for the bridge node.
                            var bridgeContainerInfo = coreGraph.node(bridgeContainerName);
                            if (!bridgeContainerInfo) {
                                var bridgeContainerNode = {
                                    // Important node properties.
                                    name: bridgeContainerName,
                                    type: graph_1.NodeType.BRIDGE,
                                    // Unused node properties.
                                    isGroupNode: false,
                                    cardinality: 0,
                                    parentNode: null,
                                    stats: null,
                                    include: graph_1.InclusionType.UNSPECIFIED,
                                    // BridgeNode properties.
                                    inbound: inbound,
                                    nodeAttributes: {},
                                };
                                bridgeContainerInfo =
                                    new RenderNodeInfo(bridgeContainerNode);
                                _this.index[bridgeContainerName] = bridgeContainerInfo;
                                coreGraph.setNode(bridgeContainerName, bridgeContainerInfo);
                            }
                            var bridgeNode = {
                                // Important node properties.
                                name: bridgeNodeName,
                                type: graph_1.NodeType.BRIDGE,
                                // Unimportant node properties.
                                isGroupNode: false,
                                cardinality: 1,
                                parentNode: null,
                                stats: null,
                                include: graph_1.InclusionType.UNSPECIFIED,
                                // BridgeNode properties.
                                inbound: inbound,
                                nodeAttributes: {},
                            };
                            bridgeNodeRenderInfo = new RenderNodeInfo(bridgeNode);
                            _this.index[bridgeNodeName] = bridgeNodeRenderInfo;
                            coreGraph.setNode(bridgeNodeName, bridgeNodeRenderInfo);
                            // Set bridgeNode to be a graphlib child of the container node.
                            coreGraph.setParent(bridgeNodeName, bridgeContainerName);
                            bridgeContainerInfo.node.cardinality++;
                        }
                        // Create and add a bridge render metaedge.
                        var bridgeRenderMetaedge = new RenderMetaedgeInfo(bridgeMetaedge);
                        bridgeRenderMetaedge.adjoiningMetaedge = adjoiningMetaedge;
                        inbound ?
                            coreGraph.setEdge(bridgeNodeName, childName, bridgeRenderMetaedge) :
                            coreGraph.setEdge(childName, bridgeNodeName, bridgeRenderMetaedge);
                    }); // End _.each(bridgegraph.edges).
                    // For each bridge container (IN and/or OUT), add structural edges between
                    // terminal nodes and that container. A terminal node is one which has no
                    // non-bridge edges in the direction of the container.
                    //
                    // For example, consider a Metanode A which contains two child nodes A/B
                    // and A/C. Let's say it has one edge in the metagraph from A/B->A/C, and
                    // one edge in the bridgegraph from Z->A/C.
                    //
                    // At this point, we've added a container bridge node IN to house all
                    // incoming bridge nodes. We've also added a bridge node Z' (with parent IN)
                    // to A, and a bridge edge from Z'->C.
                    //
                    //     +----------------------+
                    //     | A          +---+     |
                    //     |    +------>| C |     |
                    //     |    |       +---+     |
                    //     |    |         ^       |
                    //     |    |         |       |
                    //     |    |    +----|----+  |
                    //     |    |    | IN |    |  |
                    //     |  +---+  |  +---+  |  |
                    //     |  | B |  |  | Z'|  |  |
                    //     |  +---+  |  +---+  |  |
                    //     |         +---------+  |
                    //     +----------------------+
                    //
                    // With no other help, dagre would lay out B and Z' on the same level,
                    // because both of them have no incoming edges. In other words, B is a
                    // terminal node in the INCOMING direction.
                    //
                    // But we want to force dagre to lay out Z' (and everything in IN) lower
                    // than all non-bridge nodes, so that there's enough room for the bridge
                    // edges after they've been adjusted to meet up with paths coming in from
                    // outside.
                    //
                    // To force Z' (and all other bridge nodes) to be lowest in the graph, we
                    // identify terminal nodes like B and give them structural edges to
                    // a new structural bridge node S which we add to IN.
                    //
                    //     +----------------------+
                    //     | A          +---+     |
                    //     |       +--->| C |     |
                    //     |       |    +---+     |
                    //     |     +---+    ^       |
                    //     |     | B |    |       |
                    //     |     +---+    |       |
                    //     |       ^      |       |
                    //     |       |      |       |
                    //     |  +----|------|----+  |
                    //     |  |IN  |      |    |  |
                    //     |  |  +---+  +---+  |  |
                    //     |  |  | S |  | Z'|  |  |
                    //     |  |  +---+  +---+  |  |
                    //     |  +----------------+  |
                    //     +----------------------+
                    //
                    // This ensures that dagre will lay out the bridge containers strictly at
                    // the ends of the graph. The structural edges will never be seen in the
                    // visualization except as a debugging aid.
                    _.each([true, false], function (inbound) {
                        var bridgeContainerName = getBridgeNodeName(inbound, nodeName);
                        var bridgeContainerInfo = coreGraph.node(bridgeContainerName);
                        if (!bridgeContainerInfo) {
                            return;
                        }
                        _.each(coreGraph.nodes(), function (childName) {
                            // Short-circuit if this child is a bridge node or it's not a terminal
                            // node in the direction we're interested in.
                            var childNodeInfo = coreGraph.node(childName);
                            if (childNodeInfo.node.type === graph_1.NodeType.BRIDGE) {
                                return;
                            }
                            var isTerminal = inbound ?
                                !coreGraph.predecessors(childName).length :
                                !coreGraph.successors(childName).length;
                            if (!isTerminal) {
                                return;
                            }
                            // Find or create a bridge node in the container for all structural
                            // metaedges. It would have been nice to skip this step and simply
                            // set a metaedge between the terminal node and the container node, but
                            // in that case, something about the graph upsets dagre.layout()'s
                            // longestPath algorithm (was getting errors due to an undefined).
                            var structuralNodeName = getBridgeNodeName(inbound, nodeName, 'STRUCTURAL_TARGET');
                            var structuralRenderInfo = coreGraph.node(structuralNodeName);
                            if (!structuralRenderInfo) {
                                var bridgeNode = {
                                    // Important Node properties.
                                    name: structuralNodeName,
                                    type: graph_1.NodeType.BRIDGE,
                                    // Unimportant Node properties.
                                    isGroupNode: false,
                                    cardinality: 1,
                                    parentNode: null,
                                    stats: null,
                                    include: graph_1.InclusionType.UNSPECIFIED,
                                    // BridgeNode properties.
                                    inbound: inbound,
                                    nodeAttributes: {},
                                };
                                structuralRenderInfo = new RenderNodeInfo(bridgeNode);
                                structuralRenderInfo.structural = true;
                                _this.index[structuralNodeName] = structuralRenderInfo;
                                coreGraph.setNode(structuralNodeName, structuralRenderInfo);
                                bridgeContainerInfo.node.cardinality++;
                                coreGraph.setParent(structuralNodeName, bridgeContainerName);
                            }
                            // Create the structural Metaedge and insert it.
                            var structuralMetaedgeInfo = new RenderMetaedgeInfo(null);
                            structuralMetaedgeInfo.structural = true;
                            structuralMetaedgeInfo.weight--; // Reduce weight for dagre layout.
                            inbound ?
                                coreGraph.setEdge(structuralNodeName, childName, structuralMetaedgeInfo) :
                                coreGraph.setEdge(childName, structuralNodeName, structuralMetaedgeInfo);
                        });
                    });
                };
                /**
                 * This method builds subhierarchies for function calls that are needed for
                 * rendering edges in the current subhierarchy being built.
                 *
                 * When building subhierarchies for a metagraph M, the subhierarchies of
                 * metanodes containing endpoint nodes for edges within metagraph M must
                 * already be built. Otherwise, bridge edges will be missing from the graph.
                 */
                RenderGraphInfo.prototype.buildSubhierarchiesForNeededFunctions = function (metagraph) {
                    var _this = this;
                    _.each(metagraph.edges(), function (edgeObj) {
                        var metaedge = metagraph.edge(edgeObj);
                        var renderMetaedgeInfo = new RenderMetaedgeInfo(metaedge);
                        _.forEach(renderMetaedgeInfo.metaedge.baseEdgeList, function (baseEdge) {
                            var sourcePathList = baseEdge.v.split(tf.graph.NAMESPACE_DELIM);
                            for (var i = sourcePathList.length; i >= 0; i--) {
                                var fromBeginningPathList = sourcePathList.slice(0, i);
                                var node = _this.hierarchy.node(fromBeginningPathList.join(tf.graph.NAMESPACE_DELIM));
                                if (node) {
                                    if (node.type === graph_1.NodeType.OP &&
                                        _this.hierarchy.libraryFunctions[node.op]) {
                                        for (var j = 1; j < fromBeginningPathList.length; j++) {
                                            // Expand all hierarchies including the parent.
                                            var currentNodeName = fromBeginningPathList
                                                .slice(0, j).join(tf.graph.NAMESPACE_DELIM);
                                            if (!currentNodeName) {
                                                continue;
                                            }
                                            // Build the hierarchy for this current level.
                                            _this.buildSubhierarchy(currentNodeName);
                                        }
                                    }
                                    // No need to analyze the other higher hierarchies.
                                    break;
                                }
                            }
                        });
                    });
                };
                return RenderGraphInfo;
            }());
            render.RenderGraphInfo = RenderGraphInfo;
            /**
             * A class for rendering annotation object which contains label
             * about the node embedded as annotation, type of annotation and the location
             * of both the annotation's node and edge.
             *
             * Annotation objects include embedded constants, embedded summary, and
             * edge shortcuts.
             */
            var Annotation = /** @class */ (function () {
                /**
                 * Creates a new Annotation.
                 *
                 * @param node The underlying node this annotation points to.
                 * @param renderNodeInfo The render information for the underlying node
                 *     this annotation points to. This can be null if the annotation
                 *     denotes an embedding (constant, summary), in which case we
                 *     use the node property.
                 * @param renderMetaedgeInfo The render information for the edge associated
                 *     with the annotation.
                 * @param type The type of the annotation.
                 * @param isIn True if it is an in-annotation. False if it is an
                 *     out-annotation.
                 */
                function Annotation(node, renderNodeInfo, renderMetaedgeInfo, type, isIn) {
                    this.node = node;
                    this.renderNodeInfo = renderNodeInfo;
                    this.renderMetaedgeInfo = renderMetaedgeInfo;
                    this.annotationType = type;
                    // Properties specified by layout
                    this.dx = 0;
                    this.dy = 0;
                    this.width = 0;
                    this.height = 0;
                    // Properties needed for generating an ID for the edge's path element if
                    // this annotation is associated with a metaedge.
                    if (renderMetaedgeInfo && renderMetaedgeInfo.metaedge) {
                        this.v = renderMetaedgeInfo.metaedge.v;
                        this.w = renderMetaedgeInfo.metaedge.w;
                    }
                    this.isIn = isIn;
                    this.points = [];
                }
                return Annotation;
            }());
            render.Annotation = Annotation;
            ;
            var AnnotationType;
            (function (AnnotationType) {
                AnnotationType[AnnotationType["SHORTCUT"] = 0] = "SHORTCUT";
                AnnotationType[AnnotationType["CONSTANT"] = 1] = "CONSTANT";
                AnnotationType[AnnotationType["SUMMARY"] = 2] = "SUMMARY";
                AnnotationType[AnnotationType["ELLIPSIS"] = 3] = "ELLIPSIS";
            })(AnnotationType = render.AnnotationType || (render.AnnotationType = {}));
            ;
            /**
             * Manages a list of annotations. Two will be used for each
             * RenderNodeInfo, one for in annotations and one for out annotations.
             */
            var AnnotationList = /** @class */ (function () {
                function AnnotationList() {
                    this.list = [];
                    this.nodeNames = {};
                }
                /**
                 * Append an annotation to the list, or a stand-in ellipsis annotation instead
                 * if this would make it too many.
                 */
                AnnotationList.prototype.push = function (annotation) {
                    if (annotation.node.name in this.nodeNames) {
                        return; // Skip duplicate annotation.
                    }
                    this.nodeNames[annotation.node.name] = true;
                    if (this.list.length < PARAMS.maxAnnotations) {
                        this.list.push(annotation);
                        return;
                    }
                    var lastAnnotation = this.list[this.list.length - 1];
                    if (lastAnnotation.annotationType === AnnotationType.ELLIPSIS) {
                        var ellipsisNode_1 = lastAnnotation.node;
                        ellipsisNode_1.setNumMoreNodes(++ellipsisNode_1.numMoreNodes);
                        return;
                    }
                    var ellipsisNode = new tf.graph.EllipsisNodeImpl(1);
                    this.list.push(new Annotation(ellipsisNode, new RenderNodeInfo(ellipsisNode), null, AnnotationType.ELLIPSIS, annotation.isIn));
                };
                return AnnotationList;
            }());
            render.AnnotationList = AnnotationList;
            /**
             * Contains rendering information about a node in the hierarchical graph.
             */
            var RenderNodeInfo = /** @class */ (function () {
                function RenderNodeInfo(node) {
                    this.node = node;
                    this.expanded = false;
                    this.inAnnotations = new AnnotationList();
                    this.outAnnotations = new AnnotationList();
                    // Params specified by layout
                    this.x = 0;
                    this.y = 0;
                    this.width = 0;
                    this.height = 0;
                    this.inboxWidth = 0;
                    this.outboxWidth = 0;
                    this.excluded = false;
                    // Params for bridge paths.
                    this.structural = false;
                    // Params for node box.
                    this.labelOffset = 0;
                    this.radius = 0;
                    // Params for expanded node
                    this.labelHeight = 0;
                    this.paddingTop = 0;
                    this.paddingLeft = 0;
                    this.paddingRight = 0;
                    this.paddingBottom = 0;
                    this.isInExtract = false;
                    this.isOutExtract = false;
                    this.coreBox = { width: 0, height: 0 };
                    // By default, we don't fade nodes out. Default to false for safety.
                    this.isFadedOut = false;
                    // Only use the portion beyond the last delimiter as the display
                    // name.
                    this.displayName = node.name.substring(node.name.lastIndexOf(tf.graph.NAMESPACE_DELIM) + 1);
                    if (node.type === graph_1.NodeType.META &&
                        node.associatedFunction) {
                        // Function names are suffixed with a length-8 hexadecimal string
                        // followed by an optional number. We remove that suffix because
                        // the user did not generate that suffix. That suffix merely
                        // serves to differentiate between functions with different
                        // signatures but the same name otherwise.
                        // Furthermore, we remove the prefix that merely ascertains this
                        // node as a function definition. There is no reason for the user
                        // to see that in the graph, as the node would already be within
                        // the functions scene group.
                        var match = this.displayName.match(nodeDisplayNameRegex);
                        if (match) {
                            // The display name had been successfully extracted. This is the most
                            // common scenario.
                            this.displayName = match[1];
                        }
                        else if (_.startsWith(this.displayName, tf.graph.FUNCTION_LIBRARY_NODE_PREFIX)) {
                            // The string does not match the usual pattern for how functions are
                            // named. Just use the entire second portion of the string as the name
                            // if we can successfully remove the prefix.
                            this.displayName = this.displayName.substring(tf.graph.FUNCTION_LIBRARY_NODE_PREFIX.length);
                        }
                    }
                }
                RenderNodeInfo.prototype.isInCore = function () {
                    return !this.isInExtract && !this.isOutExtract && !this.isLibraryFunction;
                };
                return RenderNodeInfo;
            }());
            render.RenderNodeInfo = RenderNodeInfo;
            /**
             * Contains rendering information about a Metaedge from the underlying
             * hierarchical graph. It may be from either a metagraph or a bridgegraph.
             */
            var RenderMetaedgeInfo = /** @class */ (function () {
                function RenderMetaedgeInfo(metaedge) {
                    this.metaedge = metaedge;
                    this.adjoiningMetaedge = null;
                    this.structural = false;
                    this.weight = 1;
                    this.isFadedOut = false;
                }
                return RenderMetaedgeInfo;
            }());
            render.RenderMetaedgeInfo = RenderMetaedgeInfo;
            function addInAnnotation(node, predecessor, predecessorRenderInfo, edge, type) {
                var annotation = new Annotation(predecessor, predecessorRenderInfo, edge, type, true);
                node.inAnnotations.push(annotation);
            }
            function addOutAnnotation(node, successor, successorRenderInfo, edge, type) {
                var annotation = new Annotation(successor, successorRenderInfo, edge, type, false);
                node.outAnnotations.push(annotation);
            }
            function setGraphDepth(graph, depth) {
                _.each(graph.nodes(), function (nodeName) {
                    var child = graph.node(nodeName);
                    child.expanded = depth > 1; // set all child of depth 1 to collapsed
                    if (depth > 0) {
                        switch (child.node.type) {
                            case graph_1.NodeType.META:
                            case graph_1.NodeType.SERIES:
                                setGroupNodeDepth(child, depth - 1);
                                break;
                            // Do nothing for leaf
                        }
                    }
                });
            }
            ;
            var RenderGroupNodeInfo = /** @class */ (function (_super) {
                __extends(RenderGroupNodeInfo, _super);
                function RenderGroupNodeInfo(groupNode, graphOptions) {
                    var _this = _super.call(this, groupNode) || this;
                    var metagraph = groupNode.metagraph;
                    var gl = metagraph.graph();
                    graphOptions.compound = true;
                    _this.coreGraph =
                        graph_1.createGraph(gl.name, graph_1.GraphType.CORE, graphOptions);
                    _this.inExtractBox = { width: 0, height: 0 };
                    _this.outExtractBox = { width: 0, height: 0 };
                    _this.libraryFunctionsBox = { width: 0, height: 0 };
                    _this.isolatedInExtract = [];
                    _this.isolatedOutExtract = [];
                    _this.libraryFunctionsExtract = [];
                    return _this;
                }
                return RenderGroupNodeInfo;
            }(RenderNodeInfo));
            render.RenderGroupNodeInfo = RenderGroupNodeInfo;
            function setGroupNodeDepth(renderInfo, depth) {
                if (renderInfo.coreGraph) {
                    setGraphDepth(renderInfo.coreGraph, depth);
                }
            }
            /**
             * Remove an edge from the graph and add annotations to both ends of the edge.
             *
             * @param The core graph.
             * @param v Source name.
             * @param w Sink name.
             */
            function createShortcut(graph, v, w) {
                var src = graph.node(v);
                var sink = graph.node(w);
                var edge = graph.edge(v, w);
                // If either of the nodes is explicitly included in the main graph and
                // both nodes are in the main graph then do not create the shortcut
                // and instead keep the real edge.
                if ((src.node.include === graph_1.InclusionType.INCLUDE ||
                    sink.node.include === graph_1.InclusionType.INCLUDE) &&
                    src.node.include !== graph_1.InclusionType.EXCLUDE &&
                    sink.node.include !== graph_1.InclusionType.EXCLUDE) {
                    return;
                }
                // Add each annotation.
                addOutAnnotation(src, sink.node, sink, edge, AnnotationType.SHORTCUT);
                addInAnnotation(sink, src.node, src, edge, AnnotationType.SHORTCUT);
                // Remove the edge from the core graph.
                graph.removeEdge(v, w);
            }
            /**
             * Remove edges from a node, and set its isOutExtract property to true,
             * and remove the node and move it to isolatedOutExtract.
             *
             * If detachAllEdgesForHighDegree or forceDetach is true, extract all of its
             * edges. Otherwise, only extract all in-edges.
             */
            function makeOutExtract(renderNode, n, forceDetach) {
                var graph = renderNode.coreGraph;
                var child = graph.node(n);
                child.isOutExtract = true;
                _.each(graph.predecessors(n), function (p, index) {
                    createShortcut(graph, p, n);
                });
                if (PARAMS.detachAllEdgesForHighDegree || forceDetach) {
                    _.each(graph.successors(n), function (s, index) {
                        createShortcut(graph, n, s);
                    });
                }
                // Remove the node from the core graph if it no longer has neighbors.
                if (graph.neighbors(n).length === 0) {
                    child.node.include = graph_1.InclusionType.EXCLUDE;
                    renderNode.isolatedOutExtract.push(child);
                    graph.removeNode(n);
                }
            }
            /**
             * Remove edges from a node, set its isInExtract property to true,
             * and remove the node and move it to isolatedInExtract.
             *
             * If detachAllEdgesForHighDegree or forceDetach is true, extract all of its
             * edges. Otherwise, only remove all out-edges.
             */
            function makeInExtract(renderNode, n, forceDetach) {
                var graph = renderNode.coreGraph;
                var child = graph.node(n);
                child.isInExtract = true;
                _.each(graph.successors(n), function (s, index) {
                    createShortcut(graph, n, s);
                });
                if (PARAMS.detachAllEdgesForHighDegree || forceDetach) {
                    _.each(graph.predecessors(n), function (p, index) {
                        createShortcut(graph, p, n);
                    });
                }
                // Remove the node from the core graph if it no longer has neighbors.
                if (graph.neighbors(n).length === 0) {
                    child.node.include = graph_1.InclusionType.EXCLUDE;
                    renderNode.isolatedInExtract.push(child);
                    graph.removeNode(n);
                }
            }
            render.makeInExtract = makeInExtract;
            /**
             * Check whether the node's type is a member of the given list of types.
             *
             * @param node Node.
             * @param types List of type to match.
             */
            function hasTypeIn(node, types) {
                if (node.type === graph_1.NodeType.OP) {
                    for (var i = 0; i < types.length; i++) {
                        if (node.op === types[i]) {
                            return true;
                        }
                    }
                }
                else if (node.type === graph_1.NodeType.META) {
                    var rootOpNode = node.getRootOp();
                    if (rootOpNode) {
                        for (var i = 0; i < types.length; i++) {
                            if (rootOpNode.op === types[i]) {
                                return true;
                            }
                        }
                    }
                }
                return false;
            }
            /** Move nodes that are specified to be excluded out of the core graph. */
            function extractSpecifiedNodes(renderNode) {
                var graph = renderNode.coreGraph;
                _.each(graph.nodes(), function (n) {
                    var renderInfo = graph.node(n);
                    if (renderInfo.node.include === graph_1.InclusionType.EXCLUDE &&
                        !n.startsWith(tf.graph.FUNCTION_LIBRARY_NODE_PREFIX)) {
                        // Move the node if the node is excluded and not part of the library
                        // function scene group, which contains nodes that do not represent ops in
                        // the graph and should thus never have its nodes added to the core graph.
                        if (renderNode.coreGraph.outEdges(n).length >
                            renderNode.coreGraph.inEdges(n).length) {
                            makeOutExtract(renderNode, n, true);
                        }
                        else {
                            makeInExtract(renderNode, n, true);
                        }
                    }
                });
            }
            /** Remove edges from pre-defined out-extract patterns */
            function extractPredefinedSink(renderNode) {
                var graph = renderNode.coreGraph;
                _.each(graph.nodes(), function (n) {
                    var renderInfo = graph.node(n);
                    if (renderInfo.node.include !== graph_1.InclusionType.UNSPECIFIED) {
                        return;
                    }
                    if (hasTypeIn(renderInfo.node, PARAMS.outExtractTypes)) {
                        makeOutExtract(renderNode, n);
                    }
                });
            }
            /** Remove edges from pre-defined in-extract patterns */
            function extractPredefinedSource(renderNode) {
                var graph = renderNode.coreGraph;
                _.each(graph.nodes(), function (n) {
                    var renderInfo = graph.node(n);
                    if (renderInfo.node.include !== graph_1.InclusionType.UNSPECIFIED) {
                        return;
                    }
                    if (hasTypeIn(renderInfo.node, PARAMS.inExtractTypes)) {
                        makeInExtract(renderNode, n);
                    }
                });
            }
            /** Extract nodes deemed to have either high in-degree or high out-degree. */
            function extractHighInOrOutDegree(renderNode) {
                var graph = renderNode.coreGraph;
                // Create mappings from node to in and out degrees. Count the number of valid
                // nodes along the way.
                var nodeToInDegree = {};
                var nodeToOutDegree = {};
                var validNodeCount = 0;
                _.each(graph.nodes(), function (currentNode) {
                    if (graph.node(currentNode).node.include !== graph_1.InclusionType.UNSPECIFIED) {
                        // This node is not included in the first place.
                        return;
                    }
                    // Count the in and out degrees based on only regular edges, unless there
                    // are no regular edges, in which case use the number of control edges.
                    // This is done so that control edges don't affect if nodes are extracted
                    // from the core graph, unless the node is only used for control.
                    var inDegree = _.reduce(graph.predecessors(currentNode), function (inDegree, pred) {
                        var metaedge = graph.edge(pred, currentNode).metaedge;
                        return inDegree + (metaedge.numRegularEdges ? 1 : 0);
                    }, 0);
                    if (inDegree === 0 && graph.predecessors(currentNode).length > 0) {
                        inDegree = graph.predecessors(currentNode).length;
                    }
                    var outDegree = _.reduce(graph.successors(currentNode), function (outDegree, succ) {
                        var metaedge = graph.edge(currentNode, succ).metaedge;
                        return outDegree + (metaedge.numRegularEdges ? 1 : 0);
                    }, 0);
                    if (outDegree === 0 && graph.successors(currentNode).length > 0) {
                        outDegree = graph.successors(currentNode).length;
                    }
                    // Store the in and out degrees of this node to avoid recomputing.
                    nodeToInDegree[currentNode] = inDegree;
                    nodeToOutDegree[currentNode] = outDegree;
                    validNodeCount++;
                });
                if (validNodeCount < PARAMS.minNodeCountForExtraction) {
                    // This graph has few nodes. Do not extract any nodes.
                    return;
                }
                // We only extract if the node has a min in or out degree greater than this.
                var minUpperBound = PARAMS.minDegreeForExtraction - 1;
                // Mark for extraction nodes with in-degree > Q3 + (Q3 - Q1).
                var q3Index = Math.round(validNodeCount * 0.75);
                var q1Index = Math.round(validNodeCount * 0.25);
                var sortedByInDegree = Object.keys(nodeToInDegree).sort(function (node0, node1) {
                    return nodeToInDegree[node0] - nodeToInDegree[node1];
                });
                var inDegreeQ3 = nodeToInDegree[sortedByInDegree[q3Index]];
                var inDegreeQ1 = nodeToInDegree[sortedByInDegree[q1Index]];
                var inDegreeUpperBound = inDegreeQ3 + inDegreeQ3 - inDegreeQ1;
                // Only extract if the upper bound is high enough.
                inDegreeUpperBound = Math.max(inDegreeUpperBound, minUpperBound);
                for (var i = validNodeCount - 1; nodeToInDegree[sortedByInDegree[i]] > inDegreeUpperBound; i--) {
                    // Extract a high in-degree node.
                    makeInExtract(renderNode, sortedByInDegree[i]);
                }
                // Mark for extraction nodes with out-degree > Q3 + (Q3 - Q1) * 4.
                var sortedByOutDegree = Object.keys(nodeToOutDegree).sort(function (node0, node1) {
                    return nodeToOutDegree[node0] - nodeToOutDegree[node1];
                });
                var outDegreeQ3 = nodeToOutDegree[sortedByOutDegree[q3Index]];
                var outDegreeQ1 = nodeToOutDegree[sortedByOutDegree[q1Index]];
                // The upper bound for extracting out-degree nodes is higher than that for
                // extracting in-degree ones (Note the "* 4") because, in practice, some
                // graphs look worse with a smaller out-degree bound. For instance, a smaller
                // out-degree bound removes the convolution nodes from cifar 10 train's graph.
                var outDegreeUpperBound = outDegreeQ3 + (outDegreeQ3 - outDegreeQ1) * 4;
                // Only extract if the upper bound is high enough.
                outDegreeUpperBound = Math.max(outDegreeUpperBound, minUpperBound);
                for (var i = validNodeCount - 1; nodeToOutDegree[sortedByOutDegree[i]] > outDegreeUpperBound; i--) {
                    var node = graph.node(sortedByOutDegree[i]);
                    if (!node || node.isInExtract) {
                        // This node has already been extracted due to high in-degree. It might
                        // have been removed from the graph in general (during in-degree
                        // extraction) due to a lack of neighbors. Do not extract this node twice.
                        continue;
                    }
                    // Extract a high out-degree node that has not already been extracted.
                    makeOutExtract(renderNode, sortedByOutDegree[i]);
                }
            }
            /** Remove control edges from nodes that have too many control edges */
            function removeControlEdges(renderNode) {
                var graph = renderNode.coreGraph;
                // Collect control edges into a map by node name.
                var map = {};
                _.each(graph.edges(), function (e) {
                    if (!graph.edge(e).metaedge.numRegularEdges) {
                        (map[e.v] = map[e.v] || []).push(e);
                        (map[e.w] = map[e.w] || []).push(e);
                    }
                });
                // For each node with too many control edges, turn them into annotations.
                _.each(map, function (edges, nodeName) {
                    if (edges.length > PARAMS.maxControlDegree) {
                        _.each(edges, function (e) { return createShortcut(graph, e.v, e.w); });
                    }
                });
            }
            /**
             * Given an integer, picks a hue that is far apart from other colors.
             * The formula for picking color that avoid collision is:
             *     hue = (color range * golden ratio * index) % color range
             */
            function mapIndexToHue(id) {
                var GOLDEN_RATIO = 1.61803398875;
                // Hue of 0 is reserved for the gray nodes.
                var MIN_HUE = 1;
                var MAX_HUE = 359;
                var COLOR_RANGE = MAX_HUE - MIN_HUE;
                return MIN_HUE + ((COLOR_RANGE * GOLDEN_RATIO * id) % COLOR_RANGE);
            }
            render.mapIndexToHue = mapIndexToHue;
            ;
            /**
             * Remove edges and add to annotation instead.
             *
             * For root node, consider predefined types for source and sink.
             * We do not extract predefined type from non-root so that Variables and the
             * sgd node (op type = 'NoOp') do not get extract from inside own group.
             *
             * The order of extraction is important here as swapping the order can totally
             * screw up the graph layout.
             *
             * @param {Render.Node} renderNode Node to manipulate.
             */
            function extractHighDegrees(renderNode) {
                extractSpecifiedNodes(renderNode);
                if (PARAMS.outExtractTypes) {
                    extractPredefinedSink(renderNode);
                }
                // This has to come before extract high in-degree to protect the core part
                // that takes many variables.
                if (PARAMS.inExtractTypes) {
                    extractPredefinedSource(renderNode);
                }
                extractHighInOrOutDegree(renderNode);
                if (PARAMS.maxControlDegree) {
                    removeControlEdges(renderNode);
                }
                // Extract isolated nodes, which can be
                // (1) source-like and sink-like nodes that are not originally isolated but
                //     become isolated after further removal.
                // (2) isolated nodes with annotations on one-side.  These might be either
                //     - nodes that originally have high out-degree but because we remove
                //       high in-degree nodes first, they no longer have high in-degree when
                //       we check.  (Detecting all high-degree before removing also leads to
                //       another problem.)
                //     - nodes that do not have high degree, but their neighbors are all
                //       extracted, so it might make sense to extract them too.
                var graph = renderNode.coreGraph;
                _.each(graph.nodes(), function (n) {
                    var child = graph.node(n);
                    var degree = graph.neighbors(n).length;
                    if (child.node.include !== graph_1.InclusionType.UNSPECIFIED) {
                        return;
                    }
                    if (degree === 0) {
                        var hasOutAnnotations = child.outAnnotations.list.length > 0;
                        var hasInAnnotations = child.inAnnotations.list.length > 0;
                        if (child.isInExtract) { // Is source-like.
                            // This case only happens if detachAllEdgesForHighDegree is false.
                            // (Otherwise all source-like nodes are all isolated already.)
                            renderNode.isolatedInExtract.push(child);
                            child.node.include = graph_1.InclusionType.EXCLUDE;
                            graph.removeNode(n);
                        }
                        else if (child.isOutExtract) { // Is sink-like.
                            // This case only happens if detachAllEdgesForHighDegree is false.
                            // // (Otherwise all sink-like nodes are all isolated already.)
                            renderNode.isolatedOutExtract.push(child);
                            child.node.include = graph_1.InclusionType.EXCLUDE;
                            graph.removeNode(n);
                        }
                        else if (PARAMS.extractIsolatedNodesWithAnnotationsOnOneSide) {
                            if (hasOutAnnotations && !hasInAnnotations) {
                                child.isInExtract = true; // for ones with high out-annotations
                                renderNode.isolatedInExtract.push(child);
                                child.node.include = graph_1.InclusionType.EXCLUDE;
                                graph.removeNode(n);
                            }
                            else if (hasInAnnotations && !hasOutAnnotations) {
                                child.isOutExtract = true; // for ones with high in-annotations
                                renderNode.isolatedOutExtract.push(child);
                                child.node.include = graph_1.InclusionType.EXCLUDE;
                                graph.removeNode(n);
                            }
                            else {
                                // if a low degree node has both in- & out- annotations, do nothing
                                // because it is unclear which side it should go to.
                            }
                        }
                    }
                });
            }
            /**
             * Expands nodes in the graph until the desired node is visible.
             *
             * @param scene The scene polymer component.
             * @param renderHierarchy The render hierarchy.
             * @param tensorName The name of a tensor.
             * @return A string that is the name of the node representing the given tensor.
             *     Note that the original tensor name might differ from this returned node
             *     name. Specifically, for instance, the tensor name usually ends with an
             *     output slot index (such as :0), while the node name lacks that suffix.
             */
            function expandUntilNodeIsShown(scene, renderHierarchy, tensorName) {
                var splitTensorName = tensorName.split('/');
                // Graph names do not take into account the output slot. Strip it.
                var lastNodeNameMatch = splitTensorName[splitTensorName.length - 1].match(/(.*):\w+/);
                if (lastNodeNameMatch.length === 2) {
                    splitTensorName[splitTensorName.length - 1] = lastNodeNameMatch[1];
                }
                var nodeName = splitTensorName[0];
                var renderNode = renderHierarchy.getRenderNodeByName(nodeName);
                for (var i = 1; i < splitTensorName.length; i++) {
                    // Op nodes are not expandable.
                    if (renderNode.node.type === tf.graph.NodeType.OP) {
                        break;
                    }
                    renderHierarchy.buildSubhierarchy(nodeName);
                    renderNode.expanded = true;
                    scene.setNodeExpanded(renderNode);
                    nodeName += '/' + splitTensorName[i];
                    renderNode = renderHierarchy.getRenderNodeByName(nodeName);
                }
                return renderNode.node.name;
            }
            render.expandUntilNodeIsShown = expandUntilNodeIsShown;
        })(render = graph_1.render || (graph_1.render = {}));
    })(graph = tf.graph || (tf.graph = {}));
})(tf || (tf = {})); // close module tf.graph.render
