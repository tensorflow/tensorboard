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
            var annotation;
            (function (annotation_1) {
                /**
                 * Populate a given annotation container group
                 *
                 *     <g class='{in|out}-annotations'></g>
                 *
                 * with annotation group of the following structure:
                 *
                 * <g class='annotation'>
                 *   <g class='annotation-node'>
                 *   <!--
                 *   Content here determined by Scene.node.buildGroup.
                 *   -->
                 *   </g>
                 * </g>
                 *
                 * @param container selection of the container.
                 * @param annotationData node.{in|out}Annotations
                 * @param d node to build group for.
                 * @param sceneElement <tf-graph-scene> polymer element.
                 * @return selection of appended objects
                 */
                function buildGroup(container, annotationData, d, sceneElement) {
                    // Select all children and join with data.
                    var annotationGroups = container
                        .selectAll(function () {
                        // using d3's selector function
                        // See https://github.com/mbostock/d3/releases/tag/v2.0.0
                        // (It's not listed in the d3 wiki.)
                        return this.childNodes;
                    })
                        .data(annotationData.list, function (d) { return d.node.name; });
                    annotationGroups.enter()
                        .append('g')
                        .attr('data-name', function (a) { return a.node.name; })
                        .each(function (a) {
                        var aGroup = d3.select(this);
                        // Add annotation to the index in the scene
                        sceneElement.addAnnotationGroup(a, d, aGroup);
                        // Append annotation edge
                        var edgeType = scene.Class.Annotation.EDGE;
                        var metaedge = a.renderMetaedgeInfo && a.renderMetaedgeInfo.metaedge;
                        if (metaedge && !metaedge.numRegularEdges) {
                            edgeType += ' ' + scene.Class.Annotation.CONTROL_EDGE;
                        }
                        // If any edges are reference edges, add the reference edge class.
                        if (metaedge && metaedge.numRefEdges) {
                            edgeType += ' ' + scene.Class.Edge.REF_LINE;
                        }
                        scene.edge.appendEdge(aGroup, a, sceneElement, edgeType);
                        if (a.annotationType !== graph.render.AnnotationType.ELLIPSIS) {
                            addAnnotationLabelFromNode(aGroup, a);
                            buildShape(aGroup, a);
                        }
                        else {
                            addAnnotationLabel(aGroup, a.node.name, a, scene.Class.Annotation.ELLIPSIS);
                        }
                    }).merge(annotationGroups)
                        .attr('class', function (a) {
                        return scene.Class.Annotation.GROUP + ' ' +
                            annotationToClassName(a.annotationType) + ' ' +
                            scene.node.nodeClass(a);
                    })
                        .each(function (a) {
                        var aGroup = d3.select(this);
                        update(aGroup, d, a, sceneElement);
                        if (a.annotationType !== graph.render.AnnotationType.ELLIPSIS) {
                            addInteraction(aGroup, d, a, sceneElement);
                        }
                    });
                    annotationGroups.exit()
                        .each(function (a) {
                        var aGroup = d3.select(this);
                        // Remove annotation from the index in the scene
                        sceneElement.removeAnnotationGroup(a, d, aGroup);
                    })
                        .remove();
                    return annotationGroups;
                }
                annotation_1.buildGroup = buildGroup;
                ;
                /**
                 * Maps an annotation enum to a class name used in css rules.
                 */
                function annotationToClassName(annotationType) {
                    return (graph.render.AnnotationType[annotationType] || '').toLowerCase() || null;
                }
                function buildShape(aGroup, a) {
                    if (a.annotationType === graph.render.AnnotationType.SUMMARY) {
                        var summary = scene.selectOrCreateChild(aGroup, 'use');
                        summary
                            .attr('class', 'summary')
                            .attr('xlink:href', '#summary-icon')
                            .attr('cursor', 'pointer');
                    }
                    else {
                        var shape = scene.node.buildShape(aGroup, a, scene.Class.Annotation.NODE);
                        // add title tag to get native tooltips
                        scene.selectOrCreateChild(shape, 'title').text(a.node.name);
                    }
                }
                function addAnnotationLabelFromNode(aGroup, a) {
                    var namePath = a.node.name.split('/');
                    var text = namePath[namePath.length - 1];
                    return addAnnotationLabel(aGroup, text, a, null);
                }
                function addAnnotationLabel(aGroup, label, a, additionalClassNames) {
                    var classNames = scene.Class.Annotation.LABEL;
                    if (additionalClassNames) {
                        classNames += ' ' + additionalClassNames;
                    }
                    var txtElement = aGroup.append('text')
                        .attr('class', classNames)
                        .attr('dy', '.35em')
                        .attr('text-anchor', a.isIn ? 'end' : 'start')
                        .text(label);
                    return tf.graph.scene.node.enforceLabelWidth(txtElement, -1);
                }
                function addInteraction(selection, d, annotation, sceneElement) {
                    selection
                        .on('mouseover', function (a) {
                        sceneElement.fire('annotation-highlight', { name: a.node.name, hostName: d.node.name });
                    })
                        .on('mouseout', function (a) {
                        sceneElement.fire('annotation-unhighlight', { name: a.node.name, hostName: d.node.name });
                    })
                        .on('click', function (a) {
                        // Stop this event's propagation so that it isn't also considered a
                        // graph-select.
                        d3.event.stopPropagation();
                        sceneElement.fire('annotation-select', { name: a.node.name, hostName: d.node.name });
                    });
                    if (annotation.annotationType !== graph.render.AnnotationType.SUMMARY &&
                        annotation.annotationType !== graph.render.AnnotationType.CONSTANT) {
                        selection.on('contextmenu', scene.contextmenu.getMenu(scene.node.getContextMenu(annotation.node, sceneElement)));
                    }
                }
                ;
                /**
                 * Adjust annotation's position.
                 *
                 * @param aGroup selection of a 'g.annotation' element.
                 * @param d Host node data.
                 * @param a annotation node data.
                 * @param sceneElement <tf-graph-scene> polymer element.
                 */
                function update(aGroup, d, a, sceneElement) {
                    var cx = graph.layout.computeCXPositionOfNodeShape(d);
                    // Annotations that point to embedded nodes (constants,summary)
                    // don't have a render information attached so we don't stylize these.
                    // Also we don't stylize ellipsis annotations (the string '... and X more').
                    if (a.renderNodeInfo &&
                        a.annotationType !== graph.render.AnnotationType.ELLIPSIS) {
                        scene.node.stylize(aGroup, a.renderNodeInfo, sceneElement, scene.Class.Annotation.NODE);
                    }
                    if (a.annotationType === graph.render.AnnotationType.SUMMARY) {
                        // Update the width of the annotation to give space for the image.
                        a.width += 10;
                    }
                    // label position
                    aGroup.select('text.' + scene.Class.Annotation.LABEL).transition()
                        .attr('x', cx + a.dx + (a.isIn ? -1 : 1) * (a.width / 2 + a.labelOffset))
                        .attr('y', d.y + a.dy);
                    // Some annotations (such as summary) are represented using a 12x12 image tag.
                    // Purposely omitted units (e.g. pixels) since the images are vector graphics.
                    // If there is an image, we adjust the location of the image to be vertically
                    // centered with the node and horizontally centered between the arrow and the
                    // text label.
                    aGroup.select('use.summary').transition()
                        .attr('x', cx + a.dx - 3)
                        .attr('y', d.y + a.dy - 6);
                    // Node position (only one of the shape selection will be non-empty.)
                    scene.positionEllipse(aGroup.select('.' + scene.Class.Annotation.NODE + ' ellipse'), cx + a.dx, d.y + a.dy, a.width, a.height);
                    scene.positionRect(aGroup.select('.' + scene.Class.Annotation.NODE + ' rect'), cx + a.dx, d.y + a.dy, a.width, a.height);
                    scene.positionRect(aGroup.select('.' + scene.Class.Annotation.NODE + ' use'), cx + a.dx, d.y + a.dy, a.width, a.height);
                    // Edge position
                    aGroup.select('path.' + scene.Class.Annotation.EDGE).transition().attr('d', function (a) {
                        // map relative position to absolute position
                        var points = a.points.map(function (p) { return { x: p.dx + cx, y: p.dy + d.y }; });
                        return scene.edge.interpolate(points);
                    });
                }
                ;
            })(annotation = scene.annotation || (scene.annotation = {}));
        })(scene = graph.scene || (graph.scene = {}));
    })(graph = tf.graph || (tf.graph = {}));
})(tf || (tf = {})); // close module
