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
        var template;
        (function (template) {
            /**
             * Detect repeating patterns of subgraphs.
             * Assign templateId to each subgraph if it belongs to a template.
             * Returns clusters of similar subgraphs .
             *
             * @param graph
             * @param verifyTemplate whether to run the template verification algorithm
             * @return a dict (template id => Array of node names)
             */
            function detect(h, verifyTemplate) {
                // In any particular subgraph, there are either
                // - leaf nodes (which do not have subgraph)
                // - metanode nodes - some of them have only one member (singular metanode)
                //                    and some have multiple members (non-singular metanode)
                // First, generate a nearest neighbor hash of metanode nodes.
                var nnGroups = clusterSimilarSubgraphs(h);
                // For each metanode, compare its subgraph (starting from shallower groups)
                // and assign template id.
                var templates = groupTemplateAndAssignId(nnGroups, verifyTemplate);
                // Sort the templates by minimum level in the graph at which they appear,
                // as this leads to optimal setting of the colors of each template for
                // maximum differentiation.
                return _(templates)
                    .pairs()
                    .sortBy(function (pair) {
                    return pair[1].level;
                })
                    .map(function (pair) {
                    return [pair[0], pair[1].nodes];
                })
                    .object()
                    .value();
            }
            template.detect = detect;
            ;
            /**
             * @return Unique string for a metanode based on depth, |V|, |E| and
             * op type histogram.
             */
            function getSignature(metanode) {
                // depth=<number> |V|=<number> |E|=<number>
                var props = _.map({
                    'depth': metanode.depth,
                    '|V|': metanode.metagraph.nodes().length,
                    '|E|': metanode.metagraph.edges().length
                }, function (v, k) { return k + '=' + v; })
                    .join(' ');
                // optype1=count1,optype2=count2
                var ops = _.map(metanode.opHistogram, function (count, op) {
                    return op + '=' + count;
                }).join(',');
                return props + ' [ops] ' + ops;
            }
            /**
             * Generate a nearest neighbor hash of metanodes
             * based on depth, |V|, |E|, and opHistogram of their subgraph
             * (excluding leaf nodes and singular metanodes).
             * @param graph The graph
             * @return Array of pairs of [signature,
             *   Object with min level of the template and an Array of tf.graph.Group]
             *   sort by ascending order of minimum depth at which metanode appears.
             */
            function clusterSimilarSubgraphs(h) {
                /** a dict from metanode.signature() => Array of tf.graph.Groups */
                var hashDict = _(h.getNodeMap()).reduce(function (hash, node, name) {
                    if (node.type !== graph_1.NodeType.META) {
                        return hash;
                    }
                    var levelOfMetaNode = name.split('/').length - 1;
                    var signature = getSignature(node);
                    var templateInfo = hash[signature] ||
                        { nodes: [], level: levelOfMetaNode };
                    hash[signature] = templateInfo;
                    templateInfo.nodes.push(node);
                    if (templateInfo.level > levelOfMetaNode) {
                        templateInfo.level = levelOfMetaNode;
                    }
                    return hash;
                }, {});
                return _(hashDict)
                    .pairs()
                    .filter(function (pair) {
                    var nodes = pair[1].nodes;
                    if (nodes.length > 1) {
                        // There is more than 1 node with this template. It is worth assigning
                        // a unique color to this template.
                        return true;
                    }
                    // If there is only 1 node with this template, only make a template for
                    // it if it represents a function. In that case, the graph explorer may
                    // add more nodes with the template later.
                    var node = nodes[0];
                    return node.type === graph_1.NodeType.META &&
                        node.associatedFunction;
                })
                    .sortBy(function (pair) {
                    // sort by depth
                    // (all members in the same nnGroup has equal depth)
                    return pair[1].nodes[0].depth;
                })
                    .value();
            }
            function groupTemplateAndAssignId(nnGroups, verifyTemplate) {
                // For each metanode, compare its subgraph (starting from shallower groups)
                // and assign template id.
                var result = {};
                return _.reduce(nnGroups, function (templates, nnGroupPair) {
                    var signature = nnGroupPair[0], nnGroup = nnGroupPair[1].nodes, clusters = [];
                    nnGroup.forEach(function (metanode) {
                        // check with each existing cluster
                        for (var i = 0; i < clusters.length; i++) {
                            var similar = !verifyTemplate ||
                                isSimilarSubgraph(clusters[i].metanode.metagraph, metanode.metagraph);
                            // if similar, just add this metanode to the cluster
                            if (similar) {
                                // get template from the first one
                                metanode.templateId = clusters[i].metanode.templateId;
                                clusters[i].members.push(metanode.name);
                                return;
                            }
                        }
                        // otherwise create a new cluster with id 'signature [count] '
                        metanode.templateId = signature + '[' + clusters.length + ']';
                        clusters.push({
                            metanode: metanode,
                            members: [metanode.name]
                        });
                    });
                    clusters.forEach(function (c) {
                        templates[c.metanode.templateId] = {
                            level: nnGroupPair[1].level,
                            nodes: c.members
                        };
                    });
                    return templates;
                }, result);
            }
            function sortNodes(names, graph, prefix) {
                return _.sortByAll(names, function (name) {
                    var node = graph.node(name);
                    return node.op;
                }, function (name) {
                    var node = graph.node(name);
                    return node.templateId;
                }, function (name) {
                    return graph.neighbors(name).length;
                }, function (name) {
                    return graph.predecessors(name).length;
                }, function (name) {
                    return graph.successors(name).length;
                }, function (name) {
                    return name.substr(prefix.length);
                });
            }
            function isSimilarSubgraph(g1, g2) {
                if (!tf.graph.hasSimilarDegreeSequence(g1, g2)) {
                    return false;
                }
                // if we want to skip, just return true here.
                // return true;
                // Verify sequence by running DFS
                var g1prefix = g1.graph().name;
                var g2prefix = g2.graph().name;
                var visited1 = {};
                var visited2 = {};
                var stack = [];
                /**
                 * push sources or successors into the stack
                 * if the visiting pattern has been similar.
                 */
                function stackPushIfNotDifferent(n1, n2) {
                    var sub1 = n1.substr(g1prefix.length), sub2 = n2.substr(g2prefix.length);
                    /* tslint:disable */
                    if (visited1[sub1] ^ visited2[sub1]) {
                        console.warn('different visit pattern', '[' + g1prefix + ']', sub1, '[' + g2prefix + ']', sub2);
                        return true;
                    }
                    /* tslint:enable */
                    if (!visited1[sub1]) {
                        visited1[sub1] = visited2[sub2] = true;
                        stack.push({ n1: n1, n2: n2 });
                    }
                    return false;
                }
                // check if have same # of sources then sort and push
                var sources1 = g1.sources();
                var sources2 = g2.sources();
                if (sources1.length !== sources2.length) {
                    /* tslint:disable */
                    console.log('different source length');
                    /* tslint:enable */
                    return false;
                }
                sources1 = sortNodes(sources1, g1, g1prefix);
                sources2 = sortNodes(sources2, g2, g2prefix);
                for (var i = 0; i < sources1.length; i++) {
                    var different = stackPushIfNotDifferent(sources1[i], sources2[i]);
                    if (different) {
                        return false;
                    }
                }
                while (stack.length > 0) {
                    var cur = stack.pop();
                    // check node
                    var similar = isSimilarNode(g1.node(cur.n1), g2.node(cur.n2));
                    if (!similar) {
                        return false;
                    }
                    // check if have same # of successors then sort and push
                    var succ1 = g1.successors(cur.n1), succ2 = g2.successors(cur.n2);
                    if (succ1.length !== succ2.length) {
                        /* tslint:disable */
                        console.log('# of successors mismatch', succ1, succ2);
                        /* tslint:enable */
                        return false;
                    }
                    succ1 = sortNodes(succ1, g1, g1prefix);
                    succ2 = sortNodes(succ2, g2, g2prefix);
                    for (var j = 0; j < succ1.length; j++) {
                        var different = stackPushIfNotDifferent(succ1[j], succ2[j]);
                        if (different) {
                            return false;
                        }
                    }
                }
                return true;
            }
            /**
             * Returns if two nodes have identical structure.
             */
            function isSimilarNode(n1, n2) {
                if (n1.type === graph_1.NodeType.META) {
                    // compare metanode
                    var metanode1 = n1;
                    var metanode2 = n2;
                    return metanode1.templateId && metanode2.templateId &&
                        metanode1.templateId === metanode2.templateId;
                }
                else if (n1.type === graph_1.NodeType.OP && n2.type === graph_1.NodeType.OP) {
                    // compare leaf node
                    return n1.op === n2.op;
                }
                else if (n1.type === graph_1.NodeType.SERIES && n2.type === graph_1.NodeType.SERIES) {
                    // compare series node sizes and operations
                    // (only need to check one op as all op nodes are identical in series)
                    var sn1 = n1;
                    var sn2 = n2;
                    var seriesnode1Count = sn1.metagraph.nodeCount();
                    return (seriesnode1Count === sn2.metagraph.nodeCount() &&
                        (seriesnode1Count === 0 ||
                            (sn1.metagraph.node(sn1.metagraph.nodes()[0]).op ===
                                sn2.metagraph.node(sn2.metagraph.nodes()[0]).op)));
                }
                return false;
            }
        })(template = graph_1.template || (graph_1.template = {}));
    })(graph = tf.graph || (tf.graph = {}));
})(tf || (tf = {}));
