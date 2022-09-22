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
import * as d3 from 'd3';
import {graphlib} from 'dagre';
import * as _ from 'lodash';
import * as tf_graph_common from './common';
import {Class, MAX_EDGE_WIDTH, MIN_EDGE_WIDTH} from './common';
import {BaseEdge, EDGE_KEY_DELIM, Metaedge, OpNode} from './graph';
import * as render from './render';
import {EdgeData} from './render';
import {TfGraphScene} from './tf-graph-scene';

/** Delimiter between dimensions when showing sizes of tensors. */
const TENSOR_SHAPE_DELIM = '\u00D7';

let arrowheadMap = d3
  .scaleQuantize<String>()
  .domain([MIN_EDGE_WIDTH, MAX_EDGE_WIDTH])
  .range(['small', 'medium', 'large', 'xlarge']);
/** Minimum stroke width to put edge labels in the middle of edges */
const CENTER_EDGE_LABEL_MIN_STROKE_WIDTH = 2.5;

/**
 * Function run when an edge is selected.
 */
export interface EdgeSelectionCallback {
  (edgeData: EdgeData): void;
}
export function getEdgeKey(edgeObj: EdgeData) {
  return edgeObj.v + EDGE_KEY_DELIM + edgeObj.w;
}
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
export function buildGroup(
  sceneGroup,
  graph: graphlib.Graph,
  sceneElement: TfGraphScene
) {
  const sceneComponent = sceneElement as any;
  let edges: EdgeData[] = [];
  edges = _.reduce(
    graph.edges(),
    (edges, edgeObj) => {
      let edgeLabel = graph.edge(edgeObj);
      edges.push({
        v: edgeObj.v,
        w: edgeObj.w,
        label: edgeLabel,
      });
      return edges;
    },
    edges
  );
  let container = tf_graph_common.selectOrCreateChild(
    sceneGroup,
    'g',
    Class.Edge.CONTAINER
  );
  // Select all children and join with data.
  // (Note that all children of g.edges are g.edge)
  let edgeGroups = (container as any)
    .selectAll(function () {
      return this.childNodes;
    })
    .data(edges, getEdgeKey);
  // Make edges a group to support rendering multiple lines for metaedge
  edgeGroups
    .enter()
    .append('g')
    .attr('class', Class.Edge.GROUP)
    .attr('data-edge', getEdgeKey)
    .each(function (d: EdgeData) {
      let edgeGroup = d3.select(this);
      d.label.edgeGroup = edgeGroup;
      // index node group for quick highlighting
      sceneComponent._edgeGroupIndex[getEdgeKey(d)] = edgeGroup;
      if (sceneComponent.handleEdgeSelected) {
        // The user or some higher-level component has opted to make edges selectable.
        edgeGroup.on('click', (d) => {
          // Stop this event's propagation so that it isn't also considered
          // a graph-select.
          (<Event>d3.event).stopPropagation();
          sceneComponent.fire('edge-select', {
            edgeData: d,
            edgeGroup: edgeGroup,
          });
        });
      }
      // Add line during enter because we're assuming that type of line
      // normally does not change.
      appendEdge(edgeGroup, d, sceneComponent);
    })
    .merge(edgeGroups)
    .each(function () {
      position(sceneElement, this);
    })
    .each(function (d) {
      stylize(d3.select(this), d, sceneComponent);
    });
  edgeGroups
    .exit()
    .each((d) => {
      delete sceneComponent._edgeGroupIndex[getEdgeKey(d)];
    })
    .remove();
  return edgeGroups;
}
/**
 * Returns the label for the given base edge.
 * The label is the shape of the underlying tensor.
 */
export function getLabelForBaseEdge(
  baseEdge: BaseEdge,
  renderInfo: render.RenderGraphInfo
): string {
  let node = <OpNode>renderInfo.getNodeByName(baseEdge.v!);
  if (node.outputShapes == null || _.isEmpty(node.outputShapes)) {
    return null!;
  }
  let shape = node.outputShapes[baseEdge.outputTensorKey];
  if (shape == null) {
    return null!;
  }
  if (shape.length === 0) {
    return 'scalar';
  }
  return shape
    .map((size) => {
      return size === -1 ? '?' : size;
    })
    .join(TENSOR_SHAPE_DELIM);
}
/**
 * Creates the label for the given metaedge. If the metaedge consists
 * of only 1 tensor, and it's shape is known, the label will contain that
 * shape. Otherwise, the label will say the number of tensors in the metaedge.
 */
export function getLabelForEdge(
  metaedge: Metaedge,
  renderInfo: render.RenderGraphInfo
): string {
  if (renderInfo.edgeLabelFunction) {
    // The user has specified a means of computing the label.
    return renderInfo.edgeLabelFunction(metaedge, renderInfo);
  }
  // Compute the label based on either tensor count or size.
  let isMultiEdge = metaedge.baseEdgeList.length > 1;
  return isMultiEdge
    ? metaedge.baseEdgeList.length + ' tensors'
    : getLabelForBaseEdge(metaedge.baseEdgeList[0], renderInfo);
}
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
function getPathSegmentIndexAtLength(
  points: render.Point[],
  length: number,
  lineFunc: (points: render.Point[]) => string
): number {
  const path = document.createElementNS(tf_graph_common.SVG_NAMESPACE, 'path');
  for (let i = 1; i < points.length; i++) {
    path.setAttribute('d', lineFunc(points.slice(0, i)));
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
function adjustPathPointsForMarker(
  points: render.Point[],
  marker: d3.Selection<any, any, any, any>,
  isStart: boolean
): render.Point[] {
  let lineFunc = d3
    .line<render.Point>()
    .x((d) => d.x)
    .y((d) => d.y);
  let path = d3
    .select(document.createElementNS('http://www.w3.org/2000/svg', 'path'))
    .attr('d', lineFunc(points)!);
  let markerWidth = +marker.attr('markerWidth');
  let viewBox = marker.attr('viewBox').split(' ').map(Number);
  let viewBoxWidth = viewBox[2] - viewBox[0];
  let refX = +marker.attr('refX');
  let pathNode = <SVGPathElement>path.node();
  if (isStart) {
    // The edge flows downwards. Do not make the edge go the whole way, lest we
    // clobber the arrowhead.
    const fractionStickingOut = 1 - refX / viewBoxWidth;
    const length = markerWidth * fractionStickingOut;
    const point = pathNode.getPointAtLength(length);
    // Figure out how many segments of the path we need to remove in order
    // to shorten the path.
    // @ts-ignore TS2345: Argument of type 'Line<Point>' is not assignable to parameter of type '(points: Point[]) => string'.
    const segIndex = getPathSegmentIndexAtLength(points, length, lineFunc);
    // Update the very first segment.
    points[segIndex - 1] = {x: point.x, y: point.y};
    // Ignore every point before segIndex - 1.
    return points.slice(segIndex - 1);
  } else {
    // The edge flows upwards. Do not make the edge go the whole way, lest we
    // clobber the arrowhead.
    const fractionStickingOut = 1 - refX / viewBoxWidth;
    const length =
      pathNode.getTotalLength() - markerWidth * fractionStickingOut;
    const point = pathNode.getPointAtLength(length);
    // Figure out how many segments of the path we need to remove in order
    // to shorten the path.
    // @ts-ignore TS2345: Argument of type 'Line<Point>' is not assignable to parameter of type '(points: Point[]) => string'.
    const segIndex = getPathSegmentIndexAtLength(points, length, lineFunc);
    // Update the very last segment.
    points[segIndex] = {x: point.x, y: point.y};
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
export function appendEdge(
  edgeGroup,
  d: EdgeData,
  sceneElement: {
    renderHierarchy: render.RenderGraphInfo;
    handleEdgeSelected: Function;
  },
  edgeClass?: string
) {
  edgeClass = edgeClass || Class.Edge.LINE; // set default type
  if (d.label && d.label.structural) {
    edgeClass += ' ' + Class.Edge.STRUCTURAL;
  }
  if (d.label && d.label.metaedge && d.label.metaedge.numRefEdges) {
    edgeClass += ' ' + Class.Edge.REFERENCE_EDGE;
  }
  if (sceneElement.handleEdgeSelected) {
    // The user has opted to make edges selectable.
    edgeClass += ' ' + Class.Edge.SELECTABLE;
  }
  // Give the path a unique id, which will be used to link
  // the textPath (edge label) to this path.
  let pathId = 'path_' + getEdgeKey(d);
  let strokeWidth;
  if (sceneElement.renderHierarchy.edgeWidthFunction) {
    // Compute edge thickness based on the user-specified method.
    strokeWidth = sceneElement.renderHierarchy.edgeWidthFunction(d, edgeClass);
  } else {
    // Encode tensor size within edge thickness.
    let size = 1;
    if (d.label != null && d.label.metaedge != null) {
      // There is an underlying Metaedge.
      size = d.label.metaedge.totalSize;
    }
    strokeWidth = sceneElement.renderHierarchy.edgeWidthSizedBasedScale(size);
  }
  let path = edgeGroup
    .append('path')
    .attr('id', pathId)
    .attr('class', edgeClass)
    .style('stroke-width', strokeWidth + 'px');
  // Check if there is a reference edge and add an arrowhead of the right size.
  if (d.label && d.label.metaedge) {
    if (d.label.metaedge.numRefEdges) {
      // We have a reference edge.
      const markerId = `reference-arrowhead-${arrowheadMap(strokeWidth)}`;
      path.style('marker-start', `url(#${markerId})`);
      d.label.startMarkerId = markerId;
    } else {
      // We have a dataflow edge.
      const markerId = `dataflow-arrowhead-${arrowheadMap(strokeWidth)}`;
      path.style('marker-end', `url(#${markerId})`);
      d.label.endMarkerId = markerId;
    }
  }
  if (d.label == null || d.label.metaedge == null) {
    // There is no associated metaedge, thus no text.
    // This happens for annotation edges.
    return;
  }
  let labelForEdge = getLabelForEdge(
    d.label.metaedge,
    sceneElement.renderHierarchy
  );
  if (labelForEdge == null) {
    // We have no information to show on this edge.
    return;
  }
  // Put edge label in the middle of edge only if the edge is thick enough.
  let baseline =
    strokeWidth > CENTER_EDGE_LABEL_MIN_STROKE_WIDTH
      ? 'central'
      : 'text-after-edge';
  edgeGroup
    .append('text')
    .append('textPath')
    .attr('xlink:href', '#' + pathId)
    .attr('startOffset', '50%')
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .text(labelForEdge);
}
export let interpolate: d3.Line<{
  x: number;
  y: number;
}> = d3
  .line<{
    x: number;
    y: number;
  }>()
  .curve(d3.curveBasis)
  .x((d) => {
    return d.x;
  })
  .y((d) => {
    return d.y;
  });
/**
 * Returns a tween interpolator for the endpoint of an edge path.
 */
function getEdgePathInterpolator(
  component: HTMLElement,
  renderPath: SVGPathElement,
  d: EdgeData,
  i: number,
  a: SVGPathElement[]
) {
  let renderMetaedgeInfo = <render.RenderMetaedgeInfo>d.label;
  let adjoiningMetaedge = renderMetaedgeInfo.adjoiningMetaedge;
  let points = renderMetaedgeInfo.points;
  // Adjust the path so that start/end markers point to the end
  // of the path.
  const {shadowRoot} = component;
  if (d.label.startMarkerId) {
    points = adjustPathPointsForMarker(
      points,
      d3.select(shadowRoot?.querySelector('#' + d.label.startMarkerId)!),
      true
    );
  }
  if (d.label.endMarkerId) {
    points = adjustPathPointsForMarker(
      points,
      d3.select(shadowRoot?.querySelector('#' + d.label.endMarkerId)!),
      false
    );
  }
  if (!adjoiningMetaedge) {
    return d3.interpolate(a, interpolate(points)!);
  }
  // Get the adjoining path that matches the adjoining metaedge.
  let adjoiningPath = <SVGPathElement>(
    (<HTMLElement>adjoiningMetaedge.edgeGroup.node()).firstChild
  );
  // Find the desired SVGPoint along the adjoining path, then convert those
  // coordinates into the space of the renderPath using its Current
  // Transformation Matrix (CTM).
  let inbound = renderMetaedgeInfo.metaedge.inbound;
  return function (t) {
    let adjoiningPoint = adjoiningPath
      .getPointAtLength(inbound ? adjoiningPath.getTotalLength() : 0)
      .matrixTransform(adjoiningPath.getCTM()!)
      .matrixTransform(renderPath.getCTM()?.inverse()!);
    // Update the relevant point in the renderMetaedgeInfo's points list, then
    // re-interpolate the path.
    let index = inbound ? 0 : points.length - 1;
    points[index].x = adjoiningPoint.x;
    points[index].y = adjoiningPoint.y;
    let dPath = interpolate(points);
    return dPath;
  };
}
function position(component: HTMLElement, edgeGroup: HTMLElement) {
  d3.select(edgeGroup)
    .select('path.' + Class.Edge.LINE)
    .transition()
    // @ts-ignore TS2769: No overload matches this call. complicated return type mismatch issue
    .attrTween('d', function (d: EdgeData, i: number, a: SVGPathElement[]) {
      return getEdgePathInterpolator(
        component,
        this as SVGPathElement,
        d,
        i,
        a
      );
    });
}
/**
 * For a given d3 selection and data object, mark the edge as a control
 * dependency if it contains only control edges.
 *
 * d's label property will be a RenderMetaedgeInfo object.
 */
function stylize(edgeGroup, d: EdgeData, stylize) {
  edgeGroup.classed('faded', d.label.isFadedOut);
  let metaedge = d.label.metaedge;
  edgeGroup
    .select('path.' + Class.Edge.LINE)
    .classed('control-dep', metaedge && !metaedge.numRegularEdges);
}
