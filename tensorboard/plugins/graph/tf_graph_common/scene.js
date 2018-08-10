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
    (function (graph) {
        var scene;
        (function (scene) {
            scene.SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
            /** Enums element class of objects in the scene */
            scene.Class = {
                Node: {
                    // <g> element that contains nodes.
                    CONTAINER: 'nodes',
                    // <g> element that contains detail about a node.
                    GROUP: 'node',
                    // <g> element that contains visual elements (like rect, ellipse).
                    SHAPE: 'nodeshape',
                    // <*> element(s) under SHAPE that should receive color updates.
                    COLOR_TARGET: 'nodecolortarget',
                    // <text> element showing the node's label.
                    LABEL: 'nodelabel',
                    // <g> element that contains all visuals for the expand/collapse
                    // button for expandable group nodes.
                    BUTTON_CONTAINER: 'buttoncontainer',
                    // <circle> element that surrounds expand/collapse buttons.
                    BUTTON_CIRCLE: 'buttoncircle',
                    // <path> element of the expand button.
                    EXPAND_BUTTON: 'expandbutton',
                    // <path> element of the collapse button.
                    COLLAPSE_BUTTON: 'collapsebutton'
                },
                Edge: {
                    CONTAINER: 'edges',
                    GROUP: 'edge',
                    LINE: 'edgeline',
                    REFERENCE_EDGE: 'referenceedge',
                    REF_LINE: 'refline',
                    SELECTABLE: 'selectableedge',
                    SELECTED: 'selectededge',
                    STRUCTURAL: 'structural'
                },
                Annotation: {
                    OUTBOX: 'out-annotations',
                    INBOX: 'in-annotations',
                    GROUP: 'annotation',
                    NODE: 'annotation-node',
                    EDGE: 'annotation-edge',
                    CONTROL_EDGE: 'annotation-control-edge',
                    LABEL: 'annotation-label',
                    ELLIPSIS: 'annotation-ellipsis'
                },
                Scene: {
                    GROUP: 'scene',
                    CORE: 'core',
                    FUNCTION_LIBRARY: 'function-library',
                    INEXTRACT: 'in-extract',
                    OUTEXTRACT: 'out-extract'
                },
                Subscene: { GROUP: 'subscene' },
                OPNODE: 'op',
                METANODE: 'meta',
                SERIESNODE: 'series',
                BRIDGENODE: 'bridge',
                ELLIPSISNODE: 'ellipsis'
            };
            /**
             * The dimensions of the minimap including padding and margin.
             */
            var MINIMAP_BOX_WIDTH = 320;
            var MINIMAP_BOX_HEIGHT = 150;
            scene.healthPillEntries = [
                {
                    background_color: '#CC2F2C',
                    label: 'NaN',
                },
                {
                    background_color: '#FF8D00',
                    label: '-∞',
                },
                {
                    background_color: '#EAEAEA',
                    label: '-',
                },
                {
                    background_color: '#A5A5A5',
                    label: '0',
                },
                {
                    background_color: '#262626',
                    label: '+',
                },
                {
                    background_color: '#003ED4',
                    label: '+∞',
                },
            ];
            /**
             * Helper method for fitting the graph in the svg view.
             *
             * @param svg The main svg.
             * @param zoomG The svg group used for panning and zooming.
             * @param d3zoom The zoom behavior.
             * @param callback Called when the fitting is done.
             */
            function fit(svg, zoomG, d3zoom, callback) {
                var svgRect = svg.getBoundingClientRect();
                var sceneSize = null;
                try {
                    sceneSize = zoomG.getBBox();
                    if (sceneSize.width === 0) {
                        // There is no scene anymore. We have been detached from the dom.
                        return;
                    }
                }
                catch (e) {
                    // Firefox produced NS_ERROR_FAILURE if we have been
                    // detached from the dom.
                    return;
                }
                var scale = 0.9 *
                    Math.min(svgRect.width / sceneSize.width, svgRect.height / sceneSize.height, 2);
                var params = graph.layout.PARAMS.graph;
                var transform = d3.zoomIdentity
                    .scale(scale)
                    .translate(params.padding.paddingLeft, params.padding.paddingTop);
                d3.select(svg)
                    .transition()
                    .duration(500)
                    .call(d3zoom.transform, transform)
                    .on('end.fitted', function () {
                    // Remove the listener for the zoomend event,
                    // so we don't get called at the end of regular zoom events,
                    // just those that fit the graph to screen.
                    d3zoom.on('end.fitted', null);
                    callback();
                });
            }
            scene.fit = fit;
            ;
            /**
             * Helper method for panning the graph to center on the provided node,
             * if the node is currently off-screen.
             *
             * @param nodeName The node to center the graph on
             * @param svg The root SVG element for the graph
             * @param zoomG The svg group used for panning and zooming.
             * @param d3zoom The zoom behavior.
             * @return True if the graph had to be panned to display the
             *            provided node.
             */
            function panToNode(nodeName, svg, zoomG, d3zoom) {
                var node = d3
                    .select('[data-name="' + nodeName + '"].' + scene.Class.Node.GROUP)
                    .node();
                if (!node) {
                    return false;
                }
                // Check if the selected node is off-screen in either
                // X or Y dimension in either direction.
                var nodeBox = node.getBBox();
                var nodeCtm = node.getScreenCTM();
                var pointTL = svg.createSVGPoint();
                var pointBR = svg.createSVGPoint();
                pointTL.x = nodeBox.x;
                pointTL.y = nodeBox.y;
                pointBR.x = nodeBox.x + nodeBox.width;
                pointBR.y = nodeBox.y + nodeBox.height;
                pointTL = pointTL.matrixTransform(nodeCtm);
                pointBR = pointBR.matrixTransform(nodeCtm);
                var isOutsideOfBounds = function (start, end, lowerBound, upperBound) {
                    // Return if even a part of the interval is out of bounds.
                    return !(start > lowerBound && end < upperBound);
                };
                var svgRect = svg.getBoundingClientRect();
                // Subtract to make sure that the node is not hidden behind the minimap.
                var horizontalBound = svgRect.left + svgRect.width - MINIMAP_BOX_WIDTH;
                var verticalBound = svgRect.top + svgRect.height - MINIMAP_BOX_HEIGHT;
                if (isOutsideOfBounds(pointTL.x, pointBR.x, svgRect.left, horizontalBound) ||
                    isOutsideOfBounds(pointTL.y, pointBR.y, svgRect.top, verticalBound)) {
                    // Determine the amount to translate the graph in both X and Y dimensions in
                    // order to center the selected node. This takes into account the position
                    // of the node, the size of the svg scene, the amount the scene has been
                    // scaled by through zooming, and any previous transforms already performed
                    // by this logic.
                    var centerX = (pointTL.x + pointBR.x) / 2;
                    var centerY = (pointTL.y + pointBR.y) / 2;
                    var dx = svgRect.left + svgRect.width / 2 - centerX;
                    var dy = svgRect.top + svgRect.height / 2 - centerY;
                    // We translate by this amount. We divide the X and Y translations by the
                    // scale to undo how translateBy scales the translations (in d3 v4).
                    var svgTransform = d3.zoomTransform(svg);
                    d3.select(svg).transition().duration(500).call(d3zoom.translateBy, dx / svgTransform.k, dy / svgTransform.k);
                    return true;
                }
                return false;
            }
            scene.panToNode = panToNode;
            ;
            /**
             * Given a container d3 selection, select a child svg element of a given tag
             * and class if exists or append / insert one otherwise.  If multiple children
             * matches the tag and class name, returns only the first one.
             *
             * @param container
             * @param tagName tag name.
             * @param className (optional) Class name or a list of class names.
             * @param before (optional) reference DOM node for insertion.
             * @return selection of the element
             */
            function selectOrCreateChild(container, tagName, className, before) {
                var child = selectChild(container, tagName, className);
                if (!child.empty()) {
                    return child;
                }
                var newElement = document.createElementNS('http://www.w3.org/2000/svg', tagName);
                if (className instanceof Array) {
                    for (var i = 0; i < className.length; i++) {
                        newElement.classList.add(className[i]);
                    }
                }
                else {
                    newElement.classList.add(className);
                }
                if (before) { // if before exists, insert
                    container.node().insertBefore(newElement, before);
                }
                else { // otherwise, append
                    container.node().appendChild(newElement);
                }
                return d3.select(newElement)
                    // need to bind data to emulate d3_selection.append
                    .datum(container.datum());
            }
            scene.selectOrCreateChild = selectOrCreateChild;
            ;
            /**
             * Given a container d3 selection, select a child element of a given tag and
             * class. If multiple children matches the tag and class name, returns only
             * the first one.
             *
             * @param container
             * @param tagName tag name.
             * @param className (optional) Class name or list of class names.
             * @return selection of the element, or an empty selection
             */
            function selectChild(container, tagName, className) {
                var children = container.node().childNodes;
                for (var i = 0; i < children.length; i++) {
                    var child = children[i];
                    if (child.tagName === tagName) {
                        if (className instanceof Array) {
                            var hasAllClasses = true;
                            for (var j = 0; j < className.length; j++) {
                                hasAllClasses =
                                    hasAllClasses && child.classList.contains(className[j]);
                            }
                            if (hasAllClasses) {
                                return d3.select(child);
                            }
                        }
                        else if ((!className || child.classList.contains(className))) {
                            return d3.select(child);
                        }
                    }
                }
                return d3.select(null);
            }
            scene.selectChild = selectChild;
            ;
            /**
             * Select or create a sceneGroup and build/update its nodes and edges.
             *
             * Structure Pattern:
             *
             * <g class='scene'>
             *   <g class='core'>
             *     <g class='edges'>
             *       ... stuff from tf.graph.scene.edges.build ...
             *     </g>
             *     <g class='nodes'>
             *       ... stuff from tf.graph.scene.nodes.build ...
             *     </g>
             *   </g>
             *   <g class='in-extract'>
             *     <g class='nodes'>
             *       ... stuff from tf.graph.scene.nodes.build ...
             *     </g>
             *   </g>
             *   <g class='out-extract'>
             *     <g class='nodes'>
             *       ... stuff from tf.graph.scene.nodes.build ...
             *     </g>
             *   </g>
             * </g>
             *
             * @param container D3 selection of the parent.
             * @param renderNode render node of a metanode or series node.
             * @param sceneElement <tf-graph-scene> polymer element.
             * @param sceneClass class attribute of the scene (default='scene').
             */
            function buildGroup(container, renderNode, sceneElement, sceneClass) {
                sceneClass = sceneClass || scene.Class.Scene.GROUP;
                var isNewSceneGroup = selectChild(container, 'g', sceneClass).empty();
                var sceneGroup = selectOrCreateChild(container, 'g', sceneClass);
                // core
                var coreGroup = selectOrCreateChild(sceneGroup, 'g', scene.Class.Scene.CORE);
                var coreNodes = _.reduce(renderNode.coreGraph.nodes(), function (nodes, name) {
                    var node = renderNode.coreGraph.node(name);
                    if (!node.excluded) {
                        nodes.push(node);
                    }
                    return nodes;
                }, []);
                if (renderNode.node.type === graph.NodeType.SERIES) {
                    // For series, we want the first item on top, so reverse the array so
                    // the first item in the series becomes last item in the top, and thus
                    // is rendered on the top.
                    coreNodes.reverse();
                }
                // Create the layer of edges for this scene (paths).
                scene.edge.buildGroup(coreGroup, renderNode.coreGraph, sceneElement);
                // Create the layer of nodes for this scene (ellipses, rects etc).
                scene.node.buildGroup(coreGroup, coreNodes, sceneElement);
                // In-extract
                if (renderNode.isolatedInExtract.length > 0) {
                    var inExtractGroup = selectOrCreateChild(sceneGroup, 'g', scene.Class.Scene.INEXTRACT);
                    scene.node.buildGroup(inExtractGroup, renderNode.isolatedInExtract, sceneElement);
                }
                else {
                    selectChild(sceneGroup, 'g', scene.Class.Scene.INEXTRACT).remove();
                }
                // Out-extract
                if (renderNode.isolatedOutExtract.length > 0) {
                    var outExtractGroup = selectOrCreateChild(sceneGroup, 'g', scene.Class.Scene.OUTEXTRACT);
                    scene.node.buildGroup(outExtractGroup, renderNode.isolatedOutExtract, sceneElement);
                }
                else {
                    selectChild(sceneGroup, 'g', scene.Class.Scene.OUTEXTRACT).remove();
                }
                // Library functions
                if (renderNode.libraryFunctionsExtract.length > 0) {
                    var outExtractGroup = selectOrCreateChild(sceneGroup, 'g', scene.Class.Scene.FUNCTION_LIBRARY);
                    scene.node.buildGroup(outExtractGroup, renderNode.libraryFunctionsExtract, sceneElement);
                }
                else {
                    selectChild(sceneGroup, 'g', scene.Class.Scene.FUNCTION_LIBRARY).remove();
                }
                position(sceneGroup, renderNode);
                // Fade in the scene group if it didn't already exist.
                if (isNewSceneGroup) {
                    sceneGroup.attr('opacity', 0).transition().attr('opacity', 1);
                }
                return sceneGroup;
            }
            scene.buildGroup = buildGroup;
            ;
            /**
             * Given a scene's svg group, set  g.in-extract, g.coreGraph, g.out-extract svg
             * groups' position relative to the scene.
             *
             * @param sceneGroup
             * @param renderNode render node of a metanode or series node.
             */
            function position(sceneGroup, renderNode) {
                // Translate scenes down by the label height so that when showing graphs in
                // expanded metanodes, the graphs are below the labels.  Do not shift them
                // down for series nodes as series nodes don't have labels inside of their
                // bounding boxes.
                var yTranslate = renderNode.node.type === graph.NodeType.SERIES ?
                    0 : graph.layout.PARAMS.subscene.meta.labelHeight;
                // core
                translate(selectChild(sceneGroup, 'g', scene.Class.Scene.CORE), 0, yTranslate);
                // in-extract
                var hasInExtract = renderNode.isolatedInExtract.length > 0;
                var hasOutExtract = renderNode.isolatedOutExtract.length > 0;
                var hasLibraryFunctions = renderNode.libraryFunctionsExtract.length > 0;
                var offset = graph.layout.PARAMS.subscene.meta.extractXOffset;
                var auxWidth = 0;
                if (hasInExtract) {
                    auxWidth += renderNode.outExtractBox.width;
                }
                if (hasOutExtract) {
                    auxWidth += renderNode.outExtractBox.width;
                }
                if (hasInExtract) {
                    var inExtractX = renderNode.coreBox.width;
                    if (auxWidth < graph.layout.MIN_AUX_WIDTH) {
                        inExtractX = inExtractX - graph.layout.MIN_AUX_WIDTH +
                            renderNode.inExtractBox.width / 2;
                    }
                    else {
                        inExtractX = inExtractX -
                            renderNode.inExtractBox.width / 2 - renderNode.outExtractBox.width -
                            (hasOutExtract ? offset : 0);
                    }
                    inExtractX = inExtractX -
                        renderNode.libraryFunctionsBox.width -
                        (hasLibraryFunctions ? offset : 0);
                    translate(selectChild(sceneGroup, 'g', scene.Class.Scene.INEXTRACT), inExtractX, yTranslate);
                }
                // out-extract
                if (hasOutExtract) {
                    var outExtractX = renderNode.coreBox.width;
                    if (auxWidth < graph.layout.MIN_AUX_WIDTH) {
                        outExtractX = outExtractX - graph.layout.MIN_AUX_WIDTH +
                            renderNode.outExtractBox.width / 2;
                    }
                    else {
                        outExtractX -= renderNode.outExtractBox.width / 2;
                    }
                    outExtractX = outExtractX -
                        renderNode.libraryFunctionsBox.width -
                        (hasLibraryFunctions ? offset : 0);
                    translate(selectChild(sceneGroup, 'g', scene.Class.Scene.OUTEXTRACT), outExtractX, yTranslate);
                }
                if (hasLibraryFunctions) {
                    var libraryFunctionsExtractX = renderNode.coreBox.width -
                        renderNode.libraryFunctionsBox.width / 2;
                    translate(selectChild(sceneGroup, 'g', scene.Class.Scene.FUNCTION_LIBRARY), libraryFunctionsExtractX, yTranslate);
                }
            }
            ;
            /** Adds a click listener to a group that fires a graph-select event */
            function addGraphClickListener(graphGroup, sceneElement) {
                d3.select(graphGroup).on('click', function () {
                    sceneElement.fire('graph-select');
                });
            }
            scene.addGraphClickListener = addGraphClickListener;
            ;
            /** Helper for adding transform: translate(x0, y0) */
            function translate(selection, x0, y0) {
                // If it is already placed on the screen, make it a transition.
                if (selection.attr('transform') != null) {
                    selection = selection.transition('position');
                }
                selection.attr('transform', 'translate(' + x0 + ',' + y0 + ')');
            }
            scene.translate = translate;
            ;
            /**
             * Helper for setting position of a svg rect
             * @param rect A d3 selection of rect(s) to set position of.
             * @param cx Center x.
             * @param cy Center x.
             * @param width Width to set.
             * @param height Height to set.
             */
            function positionRect(rect, cx, cy, width, height) {
                rect.transition()
                    .attr('x', cx - width / 2)
                    .attr('y', cy - height / 2)
                    .attr('width', width)
                    .attr('height', height);
            }
            scene.positionRect = positionRect;
            ;
            /**
             * Positions a triangle and sizes it.
             * @param polygon polygon to set position of.
             * @param cx Center x.
             * @param cy Center y.
             * @param width Width of bounding box for triangle.
             * @param height Height of bounding box for triangle.
             */
            function positionTriangle(polygon, cx, cy, width, height) {
                var halfHeight = height / 2;
                var halfWidth = width / 2;
                var points = [
                    [cx, cy - halfHeight],
                    [cx + halfWidth, cy + halfHeight],
                    [cx - halfWidth, cy + halfHeight]
                ];
                polygon.transition().attr('points', points.map(function (point) { return point.join(','); }).join(' '));
            }
            scene.positionTriangle = positionTriangle;
            ;
            /**
             * Helper for setting position of a svg expand/collapse button
             * @param button container group
             * @param renderNode the render node of the group node to position
             *        the button on.
             */
            function positionButton(button, renderNode) {
                var cx = graph.layout.computeCXPositionOfNodeShape(renderNode);
                // Position the button in the top-right corner of the group node,
                // with space given the draw the button inside of the corner.
                var width = renderNode.expanded ?
                    renderNode.width : renderNode.coreBox.width;
                var height = renderNode.expanded ?
                    renderNode.height : renderNode.coreBox.height;
                var x = cx + width / 2 - 6;
                var y = renderNode.y - height / 2 + 6;
                // For unexpanded series nodes, the button has special placement due
                // to the unique visuals of this group node.
                if (renderNode.node.type === graph.NodeType.SERIES && !renderNode.expanded) {
                    x += 10;
                    y -= 2;
                }
                var translateStr = 'translate(' + x + ',' + y + ')';
                button.selectAll('path').transition().attr('transform', translateStr);
                button.select('circle').transition().attr({ cx: x, cy: y, r: graph.layout.PARAMS.nodeSize.meta.expandButtonRadius });
            }
            scene.positionButton = positionButton;
            ;
            /**
             * Helper for setting position of a svg ellipse
             * @param ellipse ellipse to set position of.
             * @param cx Center x.
             * @param cy Center x.
             * @param width Width to set.
             * @param height Height to set.
             */
            function positionEllipse(ellipse, cx, cy, width, height) {
                ellipse.transition()
                    .attr('cx', cx)
                    .attr('cy', cy)
                    .attr('rx', width / 2)
                    .attr('ry', height / 2);
            }
            scene.positionEllipse = positionEllipse;
            ;
            /**
             * @param {number} stat A stat for a health pill (such as mean or variance).
             * @param {boolean} shouldRoundOnesDigit Whether to round this number to the
             *     ones digit. Useful for say int, uint, and bool output types.
             * @return {string} A human-friendly string representation of that stat.
             */
            function humanizeHealthPillStat(stat, shouldRoundOnesDigit) {
                if (shouldRoundOnesDigit) {
                    return stat.toFixed(0);
                }
                if (Math.abs(stat) >= 1) {
                    return stat.toFixed(1);
                }
                return stat.toExponential(1);
            }
            scene.humanizeHealthPillStat = humanizeHealthPillStat;
            /**
             * Get text content describing a health pill.
             */
            function _getHealthPillTextContent(healthPill, totalCount, elementsBreakdown, numericStats) {
                var text = 'Device: ' + healthPill.device_name + '\n';
                text += 'dtype: ' + healthPill.dtype + '\n';
                var shapeStr = '(scalar)';
                if (healthPill.shape.length > 0) {
                    shapeStr = '(' + healthPill.shape.join(',') + ')';
                }
                text += '\nshape: ' + shapeStr + '\n\n';
                text += '#(elements): ' + totalCount + '\n';
                var breakdownItems = [];
                for (var i = 0; i < elementsBreakdown.length; i++) {
                    if (elementsBreakdown[i] > 0) {
                        breakdownItems.push('#(' + scene.healthPillEntries[i].label + '): ' + elementsBreakdown[i]);
                    }
                }
                text += breakdownItems.join(', ') + '\n\n';
                // In some cases (e.g., size-0 tensors; all elements are nan or inf) the
                // min/max and mean/stddev stats are meaningless.
                if (numericStats.max >= numericStats.min) {
                    text += 'min: ' + numericStats.min + ', max: ' + numericStats.max + '\n';
                    text += 'mean: ' + numericStats.mean + ', stddev: ' + numericStats.stddev;
                }
                return text;
            }
            /**
             * Renders a health pill for an op atop a node.
             * nodeGroupElement: The SVG element in which to render.
             * healthPill: A list of backend.HealthPill objects.
             * nodeInfo: Info on the associated node.
             * healthPillId: A unique numeric ID assigned to this health pill.
             * healthPillWidth: Optional width of the health pill.
             * healthPillHeight: Optional height of the health pill.
             * healthPillYOffset: Optional y-offset of the health pill (that is, the
             *   color-coded region).
             * textOffset: Optional value for the x-offset of the top text label
             *   relative to the left edge of the health pill. If not provided, will
             *   default to `healthPillWidth / 2`.
             */
            function addHealthPill(nodeGroupElement, healthPill, nodeInfo, healthPillId, healthPillWidth, healthPillHeight, healthPillYOffset, textXOffset) {
                if (healthPillWidth === void 0) { healthPillWidth = 60; }
                if (healthPillHeight === void 0) { healthPillHeight = 10; }
                if (healthPillYOffset === void 0) { healthPillYOffset = 0; }
                // Check if text already exists at location.
                d3.select(nodeGroupElement.parentNode).selectAll('.health-pill').remove();
                if (!healthPill) {
                    return;
                }
                var lastHealthPillData = healthPill.value;
                // For now, we only visualize the 6 values that summarize counts of tensor
                // elements of various categories: -Inf, negative, 0, positive, Inf, and NaN.
                var lastHealthPillElementsBreakdown = lastHealthPillData.slice(2, 8);
                var nanCount = lastHealthPillElementsBreakdown[0];
                var negInfCount = lastHealthPillElementsBreakdown[1];
                var posInfCount = lastHealthPillElementsBreakdown[5];
                var totalCount = lastHealthPillData[1];
                var numericStats = {
                    min: lastHealthPillData[8],
                    max: lastHealthPillData[9],
                    mean: lastHealthPillData[10],
                    stddev: Math.sqrt(lastHealthPillData[11])
                };
                if (healthPillWidth == null) {
                    healthPillWidth = 60;
                }
                if (healthPillHeight == null) {
                    healthPillHeight = 10;
                }
                if (healthPillYOffset == null) {
                    healthPillYOffset = 0;
                }
                if (nodeInfo != null && nodeInfo.node.type === tf.graph.NodeType.OP) {
                    // Use a smaller health pill for op nodes (rendered as smaller ellipses).
                    healthPillWidth /= 2;
                    healthPillHeight /= 2;
                }
                var healthPillGroup = document.createElementNS(scene.SVG_NAMESPACE, 'g');
                healthPillGroup.classList.add('health-pill');
                // Define the gradient for the health pill.
                var healthPillDefs = document.createElementNS(scene.SVG_NAMESPACE, 'defs');
                healthPillGroup.appendChild(healthPillDefs);
                var healthPillGradient = document.createElementNS(scene.SVG_NAMESPACE, 'linearGradient');
                // Every element in a web page must have a unique ID.
                var healthPillGradientId = 'health-pill-gradient-' + healthPillId;
                healthPillGradient.setAttribute('id', healthPillGradientId);
                var cumulativeCount = 0;
                var previousOffset = '0%';
                for (var i = 0; i < lastHealthPillElementsBreakdown.length; i++) {
                    if (!lastHealthPillElementsBreakdown[i]) {
                        // Exclude empty categories.
                        continue;
                    }
                    cumulativeCount += lastHealthPillElementsBreakdown[i];
                    // Create a color interval using 2 stop elements.
                    var stopElement0 = document.createElementNS(scene.SVG_NAMESPACE, 'stop');
                    stopElement0.setAttribute('offset', previousOffset);
                    stopElement0.setAttribute('stop-color', scene.healthPillEntries[i].background_color);
                    healthPillGradient.appendChild(stopElement0);
                    var stopElement1 = document.createElementNS(scene.SVG_NAMESPACE, 'stop');
                    var percent = (cumulativeCount * 100 / totalCount) + '%';
                    stopElement1.setAttribute('offset', percent);
                    stopElement1.setAttribute('stop-color', scene.healthPillEntries[i].background_color);
                    healthPillGradient.appendChild(stopElement1);
                    previousOffset = percent;
                }
                healthPillDefs.appendChild(healthPillGradient);
                // Create the rectangle for the health pill.
                var rect = document.createElementNS(scene.SVG_NAMESPACE, 'rect');
                rect.setAttribute('fill', 'url(#' + healthPillGradientId + ')');
                rect.setAttribute('width', String(healthPillWidth));
                rect.setAttribute('height', String(healthPillHeight));
                rect.setAttribute('y', String(healthPillYOffset));
                healthPillGroup.appendChild(rect);
                // Show a title with specific counts on hover.
                var titleSvg = document.createElementNS(scene.SVG_NAMESPACE, 'title');
                titleSvg.textContent = _getHealthPillTextContent(healthPill, totalCount, lastHealthPillElementsBreakdown, numericStats);
                healthPillGroup.appendChild(titleSvg);
                // Center this health pill just right above the node for the op.
                var shouldRoundOnesDigit = false;
                if (nodeInfo != null) {
                    var healthPillX = nodeInfo.x - healthPillWidth / 2;
                    var healthPillY = nodeInfo.y - healthPillHeight - nodeInfo.height / 2 - 2;
                    if (nodeInfo.labelOffset < 0) {
                        // The label is positioned above the node. Do not occlude the label.
                        healthPillY += nodeInfo.labelOffset;
                    }
                    healthPillGroup.setAttribute('transform', 'translate(' + healthPillX + ', ' + healthPillY + ')');
                    if (lastHealthPillElementsBreakdown[2] ||
                        lastHealthPillElementsBreakdown[3] ||
                        lastHealthPillElementsBreakdown[4]) {
                        // At least 1 "non-Inf and non-NaN" value exists (a -, 0, or + value). Show
                        // stats on tensor values.
                        // Determine if we should display the output range as integers.
                        var node_1 = nodeInfo.node;
                        var attributes = node_1.attr;
                        if (attributes && attributes.length) {
                            // Find the attribute for output type if there is one.
                            for (var i = 0; i < attributes.length; i++) {
                                if (attributes[i].key === 'T') {
                                    // Note whether the output type is an integer.
                                    var outputType = attributes[i].value['type'];
                                    shouldRoundOnesDigit =
                                        outputType && /^DT_(BOOL|INT|UINT)/.test(outputType);
                                    break;
                                }
                            }
                        }
                    }
                }
                var statsSvg = document.createElementNS(scene.SVG_NAMESPACE, 'text');
                if (Number.isFinite(numericStats.min) && Number.isFinite(numericStats.max)) {
                    var minString = humanizeHealthPillStat(numericStats.min, shouldRoundOnesDigit);
                    var maxString = humanizeHealthPillStat(numericStats.max, shouldRoundOnesDigit);
                    if (totalCount > 1) {
                        statsSvg.textContent = minString + ' ~ ' + maxString;
                    }
                    else {
                        statsSvg.textContent = minString;
                    }
                    if (nanCount > 0 || negInfCount > 0 || posInfCount > 0) {
                        statsSvg.textContent += ' (';
                        var badValueStrings = [];
                        if (nanCount > 0) {
                            badValueStrings.push("NaN\u00D7" + nanCount);
                        }
                        if (negInfCount > 0) {
                            badValueStrings.push("-\u221E\u00D7" + negInfCount);
                        }
                        if (posInfCount > 0) {
                            badValueStrings.push("+\u221E\u00D7" + posInfCount);
                        }
                        statsSvg.textContent += badValueStrings.join('; ') + ')';
                    }
                }
                else {
                    statsSvg.textContent = '(No finite elements)';
                }
                statsSvg.classList.add('health-pill-stats');
                if (textXOffset == null) {
                    textXOffset = healthPillWidth / 2;
                }
                statsSvg.setAttribute('x', String(textXOffset));
                statsSvg.setAttribute('y', String(healthPillYOffset - 2));
                healthPillGroup.appendChild(statsSvg);
                Polymer.dom(nodeGroupElement.parentNode).appendChild(healthPillGroup);
            }
            scene.addHealthPill = addHealthPill;
            /**
             * Adds health pills (which visualize tensor summaries) to a graph group.
             * @param svgRoot The root SVG element of the graph to add heath pills to.
             * @param nodeNamesToHealthPills An object mapping node name to health pill.
             * @param colors A list of colors to use.
             */
            function addHealthPills(svgRoot, nodeNamesToHealthPills, healthPillStepIndex) {
                if (!nodeNamesToHealthPills) {
                    // No health pill information available.
                    return;
                }
                // We generate a unique ID for each health pill because the ID of each element
                // in a web page must be unique, and each health pill generates a gradient
                // that its code later refers to.
                var healthPillId = 1;
                var svgRootSelection = d3.select(svgRoot);
                svgRootSelection.selectAll('g.nodeshape')
                    .each(function (nodeInfo) {
                    // Only show health pill data for this node if it is available.
                    var healthPills = nodeNamesToHealthPills[nodeInfo.node.name];
                    var healthPill = healthPills ? healthPills[healthPillStepIndex] : null;
                    addHealthPill(this, healthPill, nodeInfo, healthPillId++);
                });
            }
            scene.addHealthPills = addHealthPills;
            ;
        })(scene = graph.scene || (graph.scene = {}));
    })(graph = tf.graph || (tf.graph = {}));
})(tf || (tf = {})); // close module
