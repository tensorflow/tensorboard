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
        var scene;
        (function (scene) {
            var edge;
            (function (edge) {
                /** Delimiter between dimensions when showing sizes of tensors. */
                var TENSOR_SHAPE_DELIM = '×';
                /** The minimum stroke width of an edge. */
                edge.MIN_EDGE_WIDTH = 0.75;
                /** The maximum stroke width of an edge. */
                edge.MAX_EDGE_WIDTH = 12;
                /** The exponent used in the power scale for edge thickness. */
                var EDGE_WIDTH_SCALE_EXPONENT = 0.3;
                /** The domain (min and max value) for the edge width. */
                var DOMAIN_EDGE_WIDTH_SCALE = [1, 5E6];
                edge.EDGE_WIDTH_SIZE_BASED_SCALE = d3.scalePow()
                    .exponent(EDGE_WIDTH_SCALE_EXPONENT)
                    .domain(DOMAIN_EDGE_WIDTH_SCALE)
                    .range([edge.MIN_EDGE_WIDTH, edge.MAX_EDGE_WIDTH])
                    .clamp(true);
                var arrowheadMap = d3.scaleQuantize().domain([edge.MIN_EDGE_WIDTH, edge.MAX_EDGE_WIDTH]).range([
                    'small', 'medium', 'large', 'xlarge'
                ]);
                /** Minimum stroke width to put edge labels in the middle of edges */
                var CENTER_EDGE_LABEL_MIN_STROKE_WIDTH = 2.5;
                function getEdgeKey(edgeObj) {
                    return edgeObj.v + graph_1.EDGE_KEY_DELIM + edgeObj.w;
                }
                edge.getEdgeKey = getEdgeKey;
                /**
                 * Select or Create a 'g.edges' group to a given sceneGroup
                 * and builds a number of 'g.edge' groups inside the group.
                 *
                 * Structure Pattern:
                 *
                 * <g class='edges'>
                 *   <g class='edge'>
                 *     <path class='edgeline'/>
                 *   </g>
                 *   ...
                 * </g>
                 *
                 *
                 * @param sceneGroup container
                 * @param graph
                 * @param sceneElement <tf-graph-scene> polymer element.
                 * @return selection of the created nodeGroups
                 */
                function buildGroup(sceneGroup, graph, sceneElement) {
                    var edges = [];
                    edges = _.reduce(graph.edges(), function (edges, edgeObj) {
                        var edgeLabel = graph.edge(edgeObj);
                        edges.push({
                            v: edgeObj.v,
                            w: edgeObj.w,
                            label: edgeLabel
                        });
                        return edges;
                    }, edges);
                    var container = scene.selectOrCreateChild(sceneGroup, 'g', scene.Class.Edge.CONTAINER);
                    // Select all children and join with data.
                    // (Note that all children of g.edges are g.edge)
                    var edgeGroups = container.selectAll(function () { return this.childNodes; }).data(edges, getEdgeKey);
                    // Make edges a group to support rendering multiple lines for metaedge
                    edgeGroups.enter()
                        .append('g')
                        .attr('class', scene.Class.Edge.GROUP)
                        .attr('data-edge', getEdgeKey)
                        .each(function (d) {
                        var edgeGroup = d3.select(this);
                        d.label.edgeGroup = edgeGroup;
                        // index node group for quick highlighting
                        sceneElement._edgeGroupIndex[getEdgeKey(d)] = edgeGroup;
                        if (sceneElement.handleEdgeSelected) {
                            // The user or some higher-level component has opted to make edges selectable.
                            edgeGroup
                                .on('click', function (d) {
                                // Stop this event's propagation so that it isn't also considered
                                // a graph-select.
                                d3.event.stopPropagation();
                                sceneElement.fire('edge-select', {
                                    edgeData: d,
                                    edgeGroup: edgeGroup
                                });
                            });
                        }
                        // Add line during enter because we're assuming that type of line
                        // normally does not change.
                        appendEdge(edgeGroup, d, sceneElement);
                    })
                        .merge(edgeGroups)
                        .each(position)
                        .each(function (d) {
                        stylize(d3.select(this), d, sceneElement);
                    });
                    edgeGroups.exit()
                        .each(function (d) {
                        delete sceneElement._edgeGroupIndex[getEdgeKey(d)];
                    })
                        .remove();
                    return edgeGroups;
                }
                edge.buildGroup = buildGroup;
                ;
                /**
                 * Returns the label for the given base edge.
                 * The label is the shape of the underlying tensor.
                 */
                function getLabelForBaseEdge(baseEdge, renderInfo) {
                    var node = renderInfo.getNodeByName(baseEdge.v);
                    if (node.outputShapes == null || _.isEmpty(node.outputShapes)) {
                        return null;
                    }
                    var shape = node.outputShapes[baseEdge.outputTensorKey];
                    if (shape == null) {
                        return null;
                    }
                    if (shape.length === 0) {
                        return 'scalar';
                    }
                    return shape.map(function (size) { return size === -1 ? '?' : size; })
                        .join(TENSOR_SHAPE_DELIM);
                }
                edge.getLabelForBaseEdge = getLabelForBaseEdge;
                /**
                 * Creates the label for the given metaedge. If the metaedge consists
                 * of only 1 tensor, and it's shape is known, the label will contain that
                 * shape. Otherwise, the label will say the number of tensors in the metaedge.
                 */
                function getLabelForEdge(metaedge, renderInfo) {
                    if (renderInfo.edgeLabelFunction) {
                        // The user has specified a means of computing the label.
                        return renderInfo.edgeLabelFunction(metaedge, renderInfo);
                    }
                    // Compute the label based on either tensor count or size.
                    var isMultiEdge = metaedge.baseEdgeList.length > 1;
                    return isMultiEdge ?
                        metaedge.baseEdgeList.length + ' tensors' :
                        getLabelForBaseEdge(metaedge.baseEdgeList[0], renderInfo);
                }
                edge.getLabelForEdge = getLabelForEdge;
                /**
                 * Computes the index into a set of points that constitute a path for which the
                 * distance along the path from the initial point is as large as possible
                 * without exceeding the length. This function was introduced after the
                 * native getPathSegAtLength method got deprecated by SVG 2.
                 * @param points Array of path control points. A point has x and y properties.
                 *   Must be of length at least 2.
                 * @param length The length (float).
                 * @param lineFunc A function that takes points and returns the "d" attribute
                 *   of a path made from connecting the points.
                 * @return The index into the points array.
                 */
                function getPathSegmentIndexAtLength(points, length, lineFunc) {
                    var path = document.createElementNS(tf.graph.scene.SVG_NAMESPACE, 'path');
                    for (var i = 1; i < points.length; i++) {
                        path.setAttribute("d", lineFunc(points.slice(0, i)));
                        if (path.getTotalLength() > length) {
                            // This many points has already exceeded the length.
                            return i - 1;
                        }
                    }
                    // The entire path is shorter than the specified length.
                    return points.length - 1;
                }
                /**
                 * Shortens the path enought such that the tip of the start/end marker will
                 * point to the start/end of the path. The marker can be of arbitrary size.
                 *
                 * @param points Array of path control points.
                 * @param marker D3 selection of the <marker> svg element.
                 * @param isStart Is the marker a `start-marker`. If false, the marker is
                 *     an `end-marker`.
                 * @return The new array of control points.
                 */
                function adjustPathPointsForMarker(points, marker, isStart) {
                    var lineFunc = d3.line()
                        .x(function (d) { return d.x; })
                        .y(function (d) { return d.y; });
                    var path = d3.select(document.createElementNS('http://www.w3.org/2000/svg', 'path'))
                        .attr('d', lineFunc(points));
                    var markerWidth = +marker.attr('markerWidth');
                    var viewBox = marker.attr('viewBox').split(' ').map(Number);
                    var viewBoxWidth = viewBox[2] - viewBox[0];
                    var refX = +marker.attr('refX');
                    var pathNode = path.node();
                    if (isStart) {
                        // The edge flows downwards. Do not make the edge go the whole way, lest we
                        // clobber the arrowhead.
                        var fractionStickingOut = 1 - refX / viewBoxWidth;
                        var length_1 = markerWidth * fractionStickingOut;
                        var point = pathNode.getPointAtLength(length_1);
                        // Figure out how many segments of the path we need to remove in order
                        // to shorten the path.
                        var segIndex = getPathSegmentIndexAtLength(points, length_1, lineFunc);
                        // Update the very first segment.
                        points[segIndex - 1] = { x: point.x, y: point.y };
                        // Ignore every point before segIndex - 1.
                        return points.slice(segIndex - 1);
                    }
                    else {
                        // The edge flows upwards. Do not make the edge go the whole way, lest we
                        // clobber the arrowhead.
                        var fractionStickingOut = 1 - refX / viewBoxWidth;
                        var length_2 = pathNode.getTotalLength() - markerWidth * fractionStickingOut;
                        var point = pathNode.getPointAtLength(length_2);
                        // Figure out how many segments of the path we need to remove in order
                        // to shorten the path.
                        var segIndex = getPathSegmentIndexAtLength(points, length_2, lineFunc);
                        // Update the very last segment.
                        points[segIndex] = { x: point.x, y: point.y };
                        // Ignore every point after segIndex.
                        return points.slice(0, segIndex + 1);
                    }
                }
                /**
                 * For a given d3 selection and data object, create a path to represent the
                 * edge described in d.label.
                 *
                 * If d.label is defined, it will be a RenderMetaedgeInfo instance. It
                 * will sometimes be undefined, for example for some Annotation edges for which
                 * there is no underlying Metaedge in the hierarchical graph.
                 */
                function appendEdge(edgeGroup, d, sceneElement, edgeClass) {
                    edgeClass = edgeClass || scene.Class.Edge.LINE; // set default type
                    if (d.label && d.label.structural) {
                        edgeClass += ' ' + scene.Class.Edge.STRUCTURAL;
                    }
                    if (d.label && d.label.metaedge && d.label.metaedge.numRefEdges) {
                        edgeClass += ' ' + scene.Class.Edge.REFERENCE_EDGE;
                    }
                    if (sceneElement.handleEdgeSelected) {
                        // The user has opted to make edges selectable.
                        edgeClass += ' ' + scene.Class.Edge.SELECTABLE;
                    }
                    // Give the path a unique id, which will be used to link
                    // the textPath (edge label) to this path.
                    var pathId = 'path_' + getEdgeKey(d);
                    var strokeWidth;
                    if (sceneElement.renderHierarchy.edgeWidthFunction) {
                        // Compute edge thickness based on the user-specified method.
                        strokeWidth = sceneElement.renderHierarchy.edgeWidthFunction(d, edgeClass);
                    }
                    else {
                        // Encode tensor size within edge thickness.
                        var size = 1;
                        if (d.label != null && d.label.metaedge != null) {
                            // There is an underlying Metaedge.
                            size = d.label.metaedge.totalSize;
                        }
                        strokeWidth = sceneElement.renderHierarchy.edgeWidthSizedBasedScale(size);
                    }
                    var path = edgeGroup.append('path')
                        .attr('id', pathId)
                        .attr('class', edgeClass)
                        .style('stroke-width', strokeWidth + 'px');
                    // Check if there is a reference edge and add an arrowhead of the right size.
                    if (d.label && d.label.metaedge) {
                        if (d.label.metaedge.numRefEdges) {
                            // We have a reference edge.
                            var markerId = "reference-arrowhead-" + arrowheadMap(strokeWidth);
                            path.style('marker-start', "url(#" + markerId + ")");
                            d.label.startMarkerId = markerId;
                        }
                        else {
                            // We have a dataflow edge.
                            var markerId = "dataflow-arrowhead-" + arrowheadMap(strokeWidth);
                            path.style('marker-end', "url(#" + markerId + ")");
                            d.label.endMarkerId = markerId;
                        }
                    }
                    if (d.label == null || d.label.metaedge == null) {
                        // There is no associated metaedge, thus no text.
                        // This happens for annotation edges.
                        return;
                    }
                    var labelForEdge = getLabelForEdge(d.label.metaedge, sceneElement.renderHierarchy);
                    if (labelForEdge == null) {
                        // We have no information to show on this edge.
                        return;
                    }
                    // Put edge label in the middle of edge only if the edge is thick enough.
                    var baseline = strokeWidth > CENTER_EDGE_LABEL_MIN_STROKE_WIDTH ?
                        'central' :
                        'text-after-edge';
                    edgeGroup.append('text')
                        .append('textPath')
                        .attr('xlink:href', '#' + pathId)
                        .attr('startOffset', '50%')
                        .attr('text-anchor', 'middle')
                        .attr('dominant-baseline', 'central')
                        .text(labelForEdge);
                }
                edge.appendEdge = appendEdge;
                ;
                edge.interpolate = d3.line()
                    .curve(d3.curveBasis)
                    .x(function (d) { return d.x; })
                    .y(function (d) { return d.y; });
                /**
                 * Returns a tween interpolator for the endpoint of an edge path.
                 */
                function getEdgePathInterpolator(d, i, a) {
                    var renderMetaedgeInfo = d.label;
                    var adjoiningMetaedge = renderMetaedgeInfo.adjoiningMetaedge;
                    var points = renderMetaedgeInfo.points;
                    // Adjust the path so that start/end markers point to the end
                    // of the path.
                    if (d.label.startMarkerId) {
                        points = adjustPathPointsForMarker(points, d3.select('#' + d.label.startMarkerId), true);
                    }
                    if (d.label.endMarkerId) {
                        points = adjustPathPointsForMarker(points, d3.select('#' + d.label.endMarkerId), false);
                    }
                    if (!adjoiningMetaedge) {
                        return d3.interpolate(a, edge.interpolate(points));
                    }
                    var renderPath = this;
                    // Get the adjoining path that matches the adjoining metaedge.
                    var adjoiningPath = (adjoiningMetaedge.edgeGroup.node()
                        .firstChild);
                    // Find the desired SVGPoint along the adjoining path, then convert those
                    // coordinates into the space of the renderPath using its Current
                    // Transformation Matrix (CTM).
                    var inbound = renderMetaedgeInfo.metaedge.inbound;
                    return function (t) {
                        var adjoiningPoint = adjoiningPath
                            .getPointAtLength(inbound ? adjoiningPath.getTotalLength() : 0)
                            .matrixTransform(adjoiningPath.getCTM())
                            .matrixTransform(renderPath.getCTM().inverse());
                        // Update the relevant point in the renderMetaedgeInfo's points list, then
                        // re-interpolate the path.
                        var index = inbound ? 0 : points.length - 1;
                        points[index].x = adjoiningPoint.x;
                        points[index].y = adjoiningPoint.y;
                        var dPath = edge.interpolate(points);
                        return dPath;
                    };
                }
                function position(d) {
                    d3.select(this)
                        .select('path.' + scene.Class.Edge.LINE)
                        .transition()
                        .attrTween('d', getEdgePathInterpolator);
                }
                ;
                /**
                 * For a given d3 selection and data object, mark the edge as a control
                 * dependency if it contains only control edges.
                 *
                 * d's label property will be a RenderMetaedgeInfo object.
                 */
                function stylize(edgeGroup, d, stylize) {
                    edgeGroup.classed('faded', d.label.isFadedOut);
                    var metaedge = d.label.metaedge;
                    edgeGroup.select('path.' + scene.Class.Edge.LINE)
                        .classed('control-dep', metaedge && !metaedge.numRegularEdges);
                }
                ;
            })(edge = scene.edge || (scene.edge = {}));
        })(scene = graph_1.scene || (graph_1.scene = {}));
    })(graph = tf.graph || (tf.graph = {}));
})(tf || (tf = {})); // close module
