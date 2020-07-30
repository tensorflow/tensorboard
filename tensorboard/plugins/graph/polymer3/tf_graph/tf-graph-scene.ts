/* Copyright 2020 The TensorFlow Authors. All Rights Reserved.

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

import {PolymerElement, html} from '@polymer/polymer';
import {customElement, observe, property} from '@polymer/decorators';
import * as _ from 'lodash';
import * as d3 from 'd3';

import './tf-graph-minimap';
import '../../../../components_polymer3/tf_dashboard_common/tensorboard-color';

import * as tf_graph from '../tf_graph_common/graph';
import * as tf_graph_scene from '../tf_graph_common/scene';
import * as tf_graph_scene_node from '../tf_graph_common/node';
import * as tf_graph_util from '../tf_graph_common/util';
import * as tf_graph_layout from '../tf_graph_common/layout';
import * as tf_graph_render from '../tf_graph_common/render';

import {LegacyElementMixin} from '../../../../components_polymer3/polymer/legacy_element_mixin';

@customElement('tf-graph-scene')
class TfGraphScene2 extends LegacyElementMixin(PolymerElement) {
  static readonly template = html`
    <style>
      :host {
        display: flex;
        font-size: 20px;
        height: 100%;
        width: 100%;
      }

      #svg {
        flex: 1;
        font-family: Roboto, sans-serif;
        height: 100%;
        overflow: hidden;
        width: 100%;
      }

      #hidden {
        position: fixed;
        top: 0px;
        visibility: hidden;
      }

      /* --- Node and annotation-node for Metanode --- */

      .meta > .nodeshape > rect,
      .meta > .annotation-node > rect {
        cursor: pointer;
        fill: hsl(0, 0%, 70%);
      }
      .node.meta.highlighted > .nodeshape > rect,
      .node.meta.highlighted > .annotation-node > rect {
        stroke-width: 2;
      }
      .annotation.meta.highlighted > .nodeshape > rect,
      .annotation.meta.highlighted > .annotation-node > rect {
        stroke-width: 1;
      }
      .meta.selected > .nodeshape > rect,
      .meta.selected > .annotation-node > rect {
        stroke: red;
        stroke-width: 2;
      }
      .node.meta.selected.expanded > .nodeshape > rect,
      .node.meta.selected.expanded > .annotation-node > rect {
        stroke: red;
        stroke-width: 3;
      }
      .annotation.meta.selected > .nodeshape > rect,
      .annotation.meta.selected > .annotation-node > rect {
        stroke: red;
        stroke-width: 2;
      }
      .node.meta.selected.expanded.highlighted > .nodeshape > rect,
      .node.meta.selected.expanded.highlighted > .annotation-node > rect {
        stroke: red;
        stroke-width: 4;
      }

      .faded,
      .faded rect,
      .faded ellipse,
      .faded path,
      .faded use,
      #rectHatch line,
      #ellipseHatch line {
        color: #e0d4b3 !important;
        fill: white;
        stroke: #e0d4b3 !important;
      }

      .faded path {
        stroke-width: 1px !important;
      }

      .faded rect {
        fill: url(#rectHatch) !important;
      }

      .faded ellipse,
      .faded use {
        fill: url(#ellipseHatch) !important;
      }

      .faded text {
        opacity: 0;
      }

      /* Rules used for input-tracing. */
      .input-highlight > * > rect,
      .input-highlight > * > ellipse,
      .input-highlight > * > use {
        fill: white;
        stroke: #ff9800 !important;
      }

      /*  - Faded non-input styling */
      .non-input > * > rect,
.non-input > * > ellipse,
.non-input > * > use,
/* For Const nodes. */
.non-input > * > .constant:not([class*="input-highlight"]) >
  .annotation-node > ellipse,
/* For styling of annotation nodes of non-input nodes. */
.non-input > g > .annotation > .annotation-node > rect {
        stroke: #e0d4b3 !important;
        stroke-width: inherit;
        stroke-dasharray: inherit;
      }

      .non-input path {
        visibility: hidden;
      }

      .non-input > .nodeshape > rect,
.non-input > .annotation-node > rect,
/* For styling of annotation nodes of non-input nodes. */
.non-input > g > .annotation > .annotation-node > rect {
        fill: url(#rectHatch) !important;
      }

      .non-input ellipse,
      .non-input use {
        fill: url(#ellipseHatch) !important;
      }

      .non-input > text {
        opacity: 0;
      }

      .non-input .annotation > .annotation-edge {
        marker-end: url(#annotation-arrowhead-faded);
      }

      .non-input .annotation > .annotation-edge.refline {
        marker-start: url(#ref-annotation-arrowhead-faded);
      }

      /* Input edges. */
      .input-edge-highlight > text {
        fill: black !important;
      }
      .input-highlight > .in-annotations > .annotation > .annotation-edge,
      .input-highlight-selected
        > .in-annotations
        > .annotation
        > .annotation-edge {
        stroke: #999 !important;
      }

      /* Non-input edges. */
      .non-input-edge-highlight,
.non-input > g > .annotation > path,
/* Annotation styles (label and edges respectively). */
.non-input > g >
.annotation:not(.input-highlight):not(.input-highlight-selected) >
.annotation-label
/*.annotation-edge*/
 {
        visibility: hidden;
      }

      /* --- Op Node --- */

      .op > .nodeshape > .nodecolortarget,
      .op > .annotation-node > .nodecolortarget {
        cursor: pointer;
        fill: #fff;
        stroke: #ccc;
      }

      .op.selected > .nodeshape > .nodecolortarget,
      .op.selected > .annotation-node > .nodecolortarget {
        stroke: red;
        stroke-width: 2;
      }

      .op.highlighted > .nodeshape > .nodecolortarget,
      .op.highlighted > .annotation-node > .nodecolortarget {
        stroke-width: 2;
      }

      /* --- Series Node --- */

      /* By default, don't show the series background <rect>. */
      .series > .nodeshape > rect {
        fill: hsl(0, 0%, 70%);
        fill-opacity: 0;
        stroke-dasharray: 5, 5;
        stroke-opacity: 0;
        cursor: pointer;
      }

      /* Once expanded, show the series background <rect> and hide the <use>. */
      .series.expanded > .nodeshape > rect {
        fill-opacity: 0.15;
        stroke: hsl(0, 0%, 70%);
        stroke-opacity: 1;
      }
      .series.expanded > .nodeshape > use {
        visibility: hidden;
      }

      /**
 * TODO: Simplify this by applying a stable class name to all <g>
 * elements that currently have either the nodeshape or annotation-node classes.
 */
      .series > .nodeshape > use,
      .series > .annotation-node > use {
        stroke: #ccc;
      }
      .series.highlighted > .nodeshape > use,
      .series.highlighted > .annotation-node > use {
        stroke-width: 2;
      }
      .series.selected > .nodeshape > use,
      .series.selected > .annotation-node > use {
        stroke: red;
        stroke-width: 2;
      }

      .series.selected > .nodeshape > rect {
        stroke: red;
        stroke-width: 2;
      }

      .annotation.series.selected > .annotation-node > use {
        stroke: red;
        stroke-width: 2;
      }

      /* --- Bridge Node --- */
      .bridge > .nodeshape > rect {
        stroke: #f0f;
        opacity: 0.2;
        display: none;
      }

      /* --- Structural Elements --- */
      .edge > path.edgeline.structural {
        stroke: #f0f;
        opacity: 0.2;
        display: none;
      }

      /* Reference Edge */
      .edge > path.edgeline.referenceedge {
        stroke: #ffb74d;
        opacity: 1;
      }

      /* --- Series Nodes --- */

      /* Hide the rect for a series' annotation. */
      .series > .annotation-node > rect {
        display: none;
      }

      /* --- Node label --- */

      .node > text.nodelabel {
        cursor: pointer;
        fill: #444;
      }

      .meta.expanded > text.nodelabel {
        font-size: 9px;
      }

      .series > text.nodelabel {
        font-size: 8px;
      }

      .op > text.nodelabel {
        font-size: 6px;
      }

      .bridge > text.nodelabel {
        display: none;
      }

      .node.meta.expanded > text.nodelabel {
        cursor: normal;
      }

      .annotation.meta.highlighted > text.annotation-label {
        fill: #50a3f7;
      }

      .annotation.meta.selected > text.annotation-label {
        fill: #4285f4;
      }

      /* --- Annotation --- */

      /* only applied for annotations that are not summary or constant.
(.summary, .constant gets overridden below) */
      .annotation > .annotation-node > * {
        stroke-width: 0.5;
        stroke-dasharray: 1, 1;
      }

      .annotation.summary > .annotation-node > *,
      .annotation.constant > .annotation-node > * {
        stroke-width: 1;
        stroke-dasharray: none;
      }

      .annotation > .annotation-edge {
        fill: none;
        stroke: #aaa;
        stroke-width: 0.5;
        marker-end: url(#annotation-arrowhead);
      }

      .faded .annotation > .annotation-edge {
        marker-end: url(#annotation-arrowhead-faded);
      }

      .annotation > .annotation-edge.refline {
        marker-start: url(#ref-annotation-arrowhead);
      }

      .faded .annotation > .annotation-edge.refline {
        marker-start: url(#ref-annotation-arrowhead-faded);
      }

      .annotation > .annotation-control-edge {
        stroke-dasharray: 1, 1;
      }

      #annotation-arrowhead {
        fill: #aaa;
      }

      #annotation-arrowhead-faded {
        fill: #e0d4b3;
      }

      #ref-annotation-arrowhead {
        fill: #aaa;
      }

      #ref-annotation-arrowhead-faded {
        fill: #e0d4b3;
      }

      .annotation > .annotation-label {
        font-size: 5px;
        cursor: pointer;
      }
      .annotation > .annotation-label.annotation-ellipsis {
        cursor: default;
      }

      /* Hide annotations on expanded meta nodes since they're redundant. */
      .expanded > .in-annotations,
      .expanded > .out-annotations {
        display: none;
      }

      /* --- Annotation: Constant --- */

      .constant > .annotation-node > ellipse {
        cursor: pointer;
        fill: white;
        stroke: #848484;
      }

      .constant.selected > .annotation-node > ellipse {
        fill: white;
        stroke: red;
      }

      .constant.highlighted > .annotation-node > ellipse {
        stroke-width: 1.5;
      }

      /* --- Annotation: Summary --- */

      .summary > .annotation-node > ellipse {
        cursor: pointer;
        fill: #db4437;
        stroke: #db4437;
      }

      .summary.selected > .annotation-node > ellipse {
        fill: #a52714;
        stroke: #a52714;
      }

      .summary.highlighted > .annotation-node > ellipse {
        stroke-width: 1.5;
      }

      /* --- Edge --- */

      .edge > path.edgeline {
        fill: none;
        stroke: #bbb;
        stroke-linecap: round;
        stroke-width: 0.75;
      }

      .edge .selectableedge {
        cursor: pointer;
      }

      .selectededge > path.edgeline {
        cursor: default;
        stroke: #f00;
      }

      .edge.selectededge text {
        fill: #000;
      }

      /* Labels showing tensor shapes on edges */
      .edge > text {
        font-size: 3.5px;
        fill: #666;
      }

      .dataflow-arrowhead {
        fill: #bbb;
      }

      .reference-arrowhead {
        fill: #ffb74d;
      }

      .selected-arrowhead {
        fill: #f00;
      }

      .edge .control-dep {
        stroke-dasharray: 2, 2;
      }

      /* --- Group node expand/collapse button --- */

      /* Hides expand/collapse buttons when a node isn't expanded or highlighted. Using
   incredibly small opacity so that the bounding box of the <g> parent still takes
   this container into account even when it isn't visible */
      .node:not(.highlighted):not(.expanded) > .nodeshape > .buttoncontainer {
        opacity: 0.01;
      }
      .node.highlighted > .nodeshape > .buttoncontainer {
        cursor: pointer;
      }
      .buttoncircle {
        fill: #e7811d;
      }
      .buttoncircle:hover {
        fill: #b96717;
      }
      .expandbutton,
      .collapsebutton {
        stroke: white;
      }
      /* Do not let the path elements in the button take pointer focus */
      .node > .nodeshape > .buttoncontainer > .expandbutton,
      .node > .nodeshape > .buttoncontainer > .collapsebutton {
        pointer-events: none;
      }
      /* Only show the expand button when a node is collapsed and only show the
   collapse button when a node is expanded. */
      .node.expanded > .nodeshape > .buttoncontainer > .expandbutton {
        display: none;
      }
      .node:not(.expanded) > .nodeshape > .buttoncontainer > .collapsebutton {
        display: none;
      }

      .health-pill-stats {
        font-size: 4px;
        text-anchor: middle;
      }

      .health-pill rect {
        filter: url(#health-pill-shadow);
        rx: 3;
        ry: 3;
      }

      .titleContainer {
        position: relative;
        top: 20px;
      }

      .title,
      .auxTitle,
      .functionLibraryTitle {
        position: absolute;
      }

      #minimap {
        position: absolute;
        right: 20px;
        bottom: 20px;
      }

      .context-menu {
        position: absolute;
        display: none;
        background-color: #e2e2e2;
        border-radius: 2px;
        font-size: 14px;
        min-width: 150px;
        border: 1px solid #d4d4d4;
      }

      .context-menu ul {
        list-style-type: none;
        margin: 0;
        padding: 0;
        cursor: default;
      }

      .context-menu ul li {
        padding: 4px 16px;
      }

      .context-menu ul li:hover {
        background-color: #f3913e;
        color: white;
      }
    </style>
    <div class="titleContainer">
      <div id="title" class="title">Main Graph</div>
      <div id="auxTitle" class="auxTitle">Auxiliary Nodes</div>
      <div id="functionLibraryTitle" class="functionLibraryTitle">
        Functions
      </div>
    </div>
    <svg id="svg">
      <defs>
        <!-- Arrow heads for reference edge paths of different predefined sizes per color. -->
        <path
          id="reference-arrowhead-path"
          d="M 0,0 L 10,5 L 0,10 C 3,7 3,3 0,0"
        ></path>
        <marker
          class="reference-arrowhead"
          id="reference-arrowhead-small"
          viewBox="0 0 10 10"
          markerWidth="5"
          markerHeight="5"
          refX="2"
          refY="5"
          orient="auto-start-reverse"
          markerUnits="userSpaceOnUse"
        >
          <use xlink:href="#reference-arrowhead-path"></use>
        </marker>
        <marker
          class="reference-arrowhead"
          id="reference-arrowhead-medium"
          viewBox="0 0 10 10"
          markerWidth="13"
          markerHeight="13"
          refX="2"
          refY="5"
          orient="auto-start-reverse"
          markerUnits="userSpaceOnUse"
        >
          <use xlink:href="#reference-arrowhead-path"></use>
        </marker>
        <marker
          class="reference-arrowhead"
          id="reference-arrowhead-large"
          viewBox="0 0 10 10"
          markerWidth="16"
          markerHeight="16"
          refX="2"
          refY="5"
          orient="auto-start-reverse"
          markerUnits="userSpaceOnUse"
        >
          <use xlink:href="#reference-arrowhead-path"></use>
        </marker>
        <marker
          class="reference-arrowhead"
          id="reference-arrowhead-xlarge"
          viewBox="0 0 10 10"
          markerWidth="20"
          markerHeight="20"
          refX="2"
          refY="5"
          orient="auto-start-reverse"
          markerUnits="userSpaceOnUse"
        >
          <use xlink:href="#reference-arrowhead-path"></use>
        </marker>

        <!-- Arrow heads for dataflow edge paths of different predefined sizes per color. -->
        <path
          id="dataflow-arrowhead-path"
          d="M 0,0 L 10,5 L 0,10 C 3,7 3,3 0,0"
        ></path>
        <marker
          class="dataflow-arrowhead"
          id="dataflow-arrowhead-small"
          viewBox="0 0 10 10"
          markerWidth="5"
          markerHeight="5"
          refX="2"
          refY="5"
          orient="auto-start-reverse"
          markerUnits="userSpaceOnUse"
        >
          <use xlink:href="#dataflow-arrowhead-path"></use>
        </marker>
        <marker
          class="dataflow-arrowhead"
          id="dataflow-arrowhead-medium"
          viewBox="0 0 10 10"
          markerWidth="13"
          markerHeight="13"
          refX="2"
          refY="5"
          orient="auto-start-reverse"
          markerUnits="userSpaceOnUse"
        >
          <use xlink:href="#dataflow-arrowhead-path"></use>
        </marker>
        <marker
          class="dataflow-arrowhead"
          id="dataflow-arrowhead-large"
          viewBox="0 0 10 10"
          markerWidth="16"
          markerHeight="16"
          refX="2"
          refY="5"
          orient="auto-start-reverse"
          markerUnits="userSpaceOnUse"
        >
          <use xlink:href="#dataflow-arrowhead-path"></use>
        </marker>
        <marker
          class="dataflow-arrowhead"
          id="dataflow-arrowhead-xlarge"
          viewBox="0 0 10 10"
          markerWidth="20"
          markerHeight="20"
          refX="2"
          refY="5"
          orient="auto-start-reverse"
          markerUnits="userSpaceOnUse"
        >
          <use xlink:href="#dataflow-arrowhead-path"></use>
        </marker>

        <!-- Arrow head for annotation edge paths. -->
        <marker
          id="annotation-arrowhead"
          markerWidth="5"
          markerHeight="5"
          refX="5"
          refY="2.5"
          orient="auto"
        >
          <path d="M 0,0 L 5,2.5 L 0,5 L 0,0"></path>
        </marker>
        <marker
          id="annotation-arrowhead-faded"
          markerWidth="5"
          markerHeight="5"
          refX="5"
          refY="2.5"
          orient="auto"
        >
          <path d="M 0,0 L 5,2.5 L 0,5 L 0,0"></path>
        </marker>
        <marker
          id="ref-annotation-arrowhead"
          markerWidth="5"
          markerHeight="5"
          refX="0"
          refY="2.5"
          orient="auto"
        >
          <path d="M 5,0 L 0,2.5 L 5,5 L 5,0"></path>
        </marker>
        <marker
          id="ref-annotation-arrowhead-faded"
          markerWidth="5"
          markerHeight="5"
          refX="0"
          refY="2.5"
          orient="auto"
        >
          <path d="M 5,0 L 0,2.5 L 5,5 L 5,0"></path>
        </marker>
        <!-- Template for an Op node ellipse. -->
        <ellipse
          id="op-node-stamp"
          rx="7.5"
          ry="3"
          stroke="inherit"
          fill="inherit"
        ></ellipse>
        <!-- Template for an Op node annotation ellipse (smaller). -->
        <ellipse
          id="op-node-annotation-stamp"
          rx="5"
          ry="2"
          stroke="inherit"
          fill="inherit"
        ></ellipse>
        <!-- Vertically stacked series of Op nodes when unexpanded. -->
        <g id="op-series-vertical-stamp">
          <use xlink:href="#op-node-stamp" x="8" y="9"></use>
          <use xlink:href="#op-node-stamp" x="8" y="6"></use>
          <use xlink:href="#op-node-stamp" x="8" y="3"></use>
        </g>
        <!-- Horizontally stacked series of Op nodes when unexpanded. -->
        <g id="op-series-horizontal-stamp">
          <use xlink:href="#op-node-stamp" x="16" y="4"></use>
          <use xlink:href="#op-node-stamp" x="12" y="4"></use>
          <use xlink:href="#op-node-stamp" x="8" y="4"></use>
        </g>
        <!-- Horizontally stacked series of Op nodes for annotation. -->
        <g id="op-series-annotation-stamp">
          <use xlink:href="#op-node-annotation-stamp" x="9" y="2"></use>
          <use xlink:href="#op-node-annotation-stamp" x="7" y="2"></use>
          <use xlink:href="#op-node-annotation-stamp" x="5" y="2"></use>
        </g>
        <svg
          id="summary-icon"
          fill="#848484"
          height="12"
          viewBox="0 0 24 24"
          width="12"
        >
          <path
            d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"
          ></path>
        </svg>

        <!-- Hatch patterns for faded out nodes. -->
        <pattern
          id="rectHatch"
          patternTransform="rotate(45 0 0)"
          width="5"
          height="5"
          patternUnits="userSpaceOnUse"
        >
          <line x1="0" y1="0" x2="0" y2="5" style="stroke-width: 1"></line>
        </pattern>
        <pattern
          id="ellipseHatch"
          patternTransform="rotate(45 0 0)"
          width="2"
          height="2"
          patternUnits="userSpaceOnUse"
        >
          <line x1="0" y1="0" x2="0" y2="2" style="stroke-width: 1"></line>
        </pattern>

        <!-- A shadow for health pills. -->
        <filter
          id="health-pill-shadow"
          x="-40%"
          y="-40%"
          width="180%"
          height="180%"
        >
          <feGaussianBlur in="SourceAlpha" stdDeviation="0.8"></feGaussianBlur>
          <feOffset dx="0" dy="0" result="offsetblur"></feOffset>
          <feFlood flood-color="#000000"></feFlood>
          <feComposite in2="offsetblur" operator="in"></feComposite>
          <feMerge>
            <feMergeNode></feMergeNode>
            <feMergeNode in="SourceGraphic"></feMergeNode>
          </feMerge>
        </filter>
      </defs>
      <!-- Make a large rectangle that fills the svg space so that
  zoom events get captured on safari -->
      <rect fill="white" width="10000" height="10000"></rect>
      <g id="root"></g>
    </svg>
    <tf-graph-minimap id="minimap"></tf-graph-minimap>
    <div id="contextMenu" class="context-menu"></div>
  `;
  @property({type: Object})
  renderHierarchy: tf_graph_render.RenderGraphInfo;
  @property({type: String})
  name: string;
  @property({type: String})
  colorBy: string;
  @property({type: Boolean})
  traceInputs: boolean;

  // For each render hierarchy, we only fit it to the viewport once (when the scene is attached to
  // the DOM). We do not fit the hierarchy again (unless the user clicks the reset button). For
  // instance, if the user enters a certain view in the graph, switches to another dashboard, and
  // returns to the graph dashboard, the user expects the previous view. These properties enable
  // that behavior.

  /** Whether the scene has fit the current render hierarchy (to the viewport) at least once. */
  @property({type: Boolean})
  _hasRenderHierarchyBeenFitOnce: boolean;

  /** Whether this scene element is currently attached to a parent element. */
  @property({type: Boolean})
  _isAttached: boolean;

  /** This property is a d3_zoom object. */
  @property({type: Object})
  _zoom: object;
  @property({
    type: String,
    observer: '_highlightedNodeChanged',
  })
  highlightedNode: string;
  @property({
    type: String,
    observer: '_selectedNodeChanged',
  })
  selectedNode: string;

  // An optional callback that implements the tf.graph.edge.EdgeSelectionCallback signature. If
  // provided, edges are selectable, and this callback is run when an edge is selected.
  @property({type: Object})
  handleEdgeSelected: object;

  /** Keeps track of if the graph has been zoomed/panned since loading */
  @property({
    type: Boolean,
    observer: '_onZoomChanged',
  })
  _zoomed: boolean = false;

  /**
   * Keeps track of the starting coordinates of a graph zoom/pan.
   *
   * @private {{x: number, y: number}?}
   */
  @property({
    type: Object,
  })
  _zoomStartCoords: object = null;

  /**
   * Keeps track of the current coordinates of a graph zoom/pan
   *
   * @private {{x: number, y: number}?}
   */
  @property({
    type: Object,
  })
  _zoomTransform: object = null;

  /** Maximum distance of a zoom event for it to be interpreted as a click */
  @property({
    type: Number,
  })
  _maxZoomDistanceForClick: number = 20;

  /**
   * Scale mapping from template name to a number between 0 and N-1
   * where N is the number of different template names. Used by
   * tf_graph_scene_node when computing node color by structure.
   * This property is a d3.scale.ordinal object.
   */
  @property({type: Object})
  templateIndex: Function;

  /**
   * A minimap object to notify for zoom events.
   * This property is a tf.scene.Minimap object.
   */
  @property({type: Object})
  minimap: object;

  /*
   * Dictionary for easily stylizing nodes when state changes.
   * _nodeGroupIndex[nodeName] = d3_selection of the nodeGroup
   */
  @property({
    type: Object,
  })
  _nodeGroupIndex: object = function() {
    return {};
  };

  /*
   * Dictionary for easily stylizing annotation nodes when state changes.
   * _annotationGroupIndex[nodeName][hostNodeName] =
   *   d3_selection of the annotationGroup
   */
  @property({
    type: Object,
  })
  _annotationGroupIndex: object = function() {
    return {};
  };

  /*
   * Dictionary for easily stylizing edges when state changes.
   * _edgeGroupIndex[edgeName] = d3_selection of the edgeGroup
   */
  @property({
    type: Object,
  })
  _edgeGroupIndex: object = function() {
    return {};
  };

  /**
   * Max font size for metanode label strings.
   */
  @property({
    type: Number,
  })
  maxMetanodeLabelLengthFontSize: number = 9;

  /**
   * Min font size for metanode label strings.
   */
  @property({
    type: Number,
  })
  minMetanodeLabelLengthFontSize: number = 6;

  /**
   * Metanode label strings longer than this are given smaller fonts.
   */
  @property({
    type: Number,
  })
  maxMetanodeLabelLengthLargeFont: number = 11;

  /**
   * Metanode label strings longer than this are truncated with ellipses.
   */
  @property({
    type: Number,
  })
  maxMetanodeLabelLength: number = 18;
  @property({type: Object})
  progress: any;

  // An array of ContextMenuItem objects. Items that appear in the context
  // menu for a node.
  @property({type: Array})
  nodeContextMenuItems: unknown[];

  // A mapping between node name to the tf_graph_scene.HealthPill to render.
  @property({type: Object})
  nodeNamesToHealthPills: object;

  // The step of health pills to show throughout the graph.
  @property({type: Number})
  healthPillStepIndex: number;
  getNode(nodeName) {
    return this.renderHierarchy.getRenderNodeByName(nodeName);
  }
  isNodeExpanded(node) {
    return node.expanded;
  }
  setNodeExpanded(renderNode) {
    this._build(this.renderHierarchy);
    this._updateLabels(!this._zoomed);
  }
  /**
   * Pans to a node. Assumes that the node exists.
   * @param nodeName {string} The name of the node to pan to.
   */
  panToNode(nodeName) {
    const zoomed = tf_graph_scene.panToNode(
      nodeName,
      this.$.svg,
      this.$.root,
      this._zoom
    );
    if (zoomed) {
      this._zoomed = true;
    }
  }
  /**
   * Returns the outer-most SVG that renders the graph.
   */
  getGraphSvgRoot(): SVGElement {
    return this.$.svg as SVGElement;
  }
  /**
   * @returns {!HTMLElement}
   */
  getContextMenu() {
    return this.$.contextMenu;
  }
  /**
   * Resets the state of the component. Called whenever the whole graph
   * (dataset) changes.
   */
  _resetState() {
    // Reset the state of the component.
    this._nodeGroupIndex = {};
    this._annotationGroupIndex = {};
    this._edgeGroupIndex = {};
    this._updateLabels(false);
    // Remove all svg elements under the 'root' svg group.
    d3.select(this.$.svg)
      .select('#root')
      .selectAll('*')
      .remove();
    // And the defs.
    tf_graph_scene_node.removeGradientDefinitions(this.$.svg as SVGElement);
  }
  /** Main method for building the scene */
  _build(renderHierarchy) {
    this.templateIndex = renderHierarchy.hierarchy.getTemplateIndex();
    tf_graph_util.time(
      'tf-graph-scene (layout):',
      function() {
        // layout the scene for this meta / series node
        tf_graph_layout.layoutScene(renderHierarchy.root);
      }.bind(this)
    );
    tf_graph_util.time(
      'tf-graph-scene (build scene):',
      function() {
        tf_graph_scene.buildGroup(
          d3.select(this.$.root),
          renderHierarchy.root,
          this
        );
        tf_graph_scene.addGraphClickListener(this.$.svg, this);
        this._updateInputTrace();
      }.bind(this)
    );
    // Update the minimap again when the graph is done animating.
    setTimeout(
      function() {
        this._updateHealthPills(
          this.nodeNamesToHealthPills,
          this.healthPillStepIndex
        );
        this.minimap.update();
      }.bind(this),
      tf_graph_layout.PARAMS.animation.duration
    );
  }
  ready() {
    super.ready();
    this._zoom = d3
      .zoom()
      .on(
        'end',
        function() {
          if (this._zoomStartCoords) {
            // Calculate the total distance dragged during the zoom event.
            // If it is sufficiently small, then fire an event indicating
            // that zooming has ended. Otherwise wait to fire the zoom end
            // event, so that a mouse click registered as part of this zooming
            // is ignored (as this mouse click was part of a zooming, and should
            // not be used to indicate an actual click on the graph).
            var dragDistance = Math.sqrt(
              Math.pow(this._zoomStartCoords.x - this._zoomTransform.x, 2) +
                Math.pow(this._zoomStartCoords.y - this._zoomTransform.y, 2)
            );
            if (dragDistance < this._maxZoomDistanceForClick) {
              this._fireEnableClick();
            } else {
              setTimeout(this._fireEnableClick.bind(this), 50);
            }
          }
          this._zoomStartCoords = null;
        }.bind(this)
      )
      .on(
        'zoom',
        function() {
          // Store the coordinates of the zoom event.
          this._zoomTransform = d3.event.transform;
          // If this is the first zoom event after a zoom-end, then
          // store the coordinates as the start coordinates as well,
          // and fire an event to indicate that zooming has started.
          // This doesn't use the zoomstart event, as d3 sends this
          // event on mouse-down, even if there has been no dragging
          // done to translate the graph around.
          if (!this._zoomStartCoords) {
            this._zoomStartCoords = this._zoomTransform;
            this.fire('disable-click');
          }
          this._zoomed = true;
          d3.select(this.$.root).attr('transform', d3.event.transform);
          // Notify the minimap.
          this.minimap.zoom(d3.event.transform);
        }.bind(this)
      );
    d3.select(this.$.svg)
      .call(this._zoom as any)
      .on('dblclick.zoom', null);
    d3.select(window).on(
      'resize',
      function() {
        // Notify the minimap that the user's window was resized.
        // The minimap will figure out the new dimensions of the main svg
        // and will use the existing translate and scale params.
        this.minimap.zoom();
      }.bind(this)
    );
    // Initialize the minimap.
    this.minimap = (this.$.minimap as any).init(
      this.$.svg,
      this.$.root,
      this._zoom,
      tf_graph_layout.PARAMS.minimap.size,
      tf_graph_layout.PARAMS.subscene.meta.labelHeight
    );
  }
  attached() {
    this.set('_isAttached', true);
  }
  detached() {
    this.set('_isAttached', false);
  }
  @observe('renderHierarchy')
  _renderHierarchyChanged() {
    var renderHierarchy = this.renderHierarchy;
    this._hasRenderHierarchyBeenFitOnce = false;
    this._resetState();
    this._build(renderHierarchy);
  }

  // Animation and fitting must come after the observer for the hierarchy changing because we must
  // first build the render hierarchy.
  @observe('_isAttached', 'renderHierarchy')
  _animateAndFit() {
    var isAttached = this._isAttached;
    var renderHierarchy = this.renderHierarchy;
    if (this._hasRenderHierarchyBeenFitOnce || !isAttached) {
      // Do not animate and fit if the scene has already fitted this render hierarchy once. Or if
      // the graph dashboard is not attached (in which case the scene lacks DOM info for fitting).
      return;
    }
    // Fit to screen after the graph is done animating.
    setTimeout(this.fit.bind(this), tf_graph_layout.PARAMS.animation.duration);
  }
  _updateLabels(showLabels) {
    var mainGraphTitleElement = this.$$('.title') as HTMLElement;
    var titleStyle = mainGraphTitleElement.style;
    var auxTitleElement = this.$$('.auxTitle') as HTMLElement;
    var auxTitleStyle = auxTitleElement.style;
    var functionLibraryTitleStyle = (this.$$(
      '.functionLibraryTitle'
    ) as HTMLElement).style;
    const root = d3.select(this.$.svg);
    var core = root
      .select(
        '.' +
          tf_graph_scene.Class.Scene.GROUP +
          '>.' +
          tf_graph_scene.Class.Scene.CORE
      )
      .node();
    // Only show labels if the graph is fully loaded.
    if (showLabels && core && this.progress && this.progress.value === 100) {
      var aux =
        root
          .select(
            '.' +
              tf_graph_scene.Class.Scene.GROUP +
              '>.' +
              tf_graph_scene.Class.Scene.INEXTRACT
          )
          .node() ||
        root
          .select(
            '.' +
              tf_graph_scene.Class.Scene.GROUP +
              '>.' +
              tf_graph_scene.Class.Scene.OUTEXTRACT
          )
          .node();
      var coreX = (core as any).getCTM().e;
      var auxX = aux ? (aux as any).getCTM().e : null;
      titleStyle.display = 'inline';
      titleStyle.left = coreX + 'px';
      if (auxX !== null && auxX !== coreX) {
        auxTitleStyle.display = 'inline';
        // Make sure that the aux title is positioned rightwards enough so as to
        // prevent overlap with the main graph title.
        auxX = Math.max(
          coreX + mainGraphTitleElement.getBoundingClientRect().width,
          auxX
        );
        auxTitleStyle.left = auxX + 'px';
      } else {
        auxTitleStyle.display = 'none';
      }
      let functionLibrary = root
        .select(
          '.' +
            tf_graph_scene.Class.Scene.GROUP +
            '>.' +
            tf_graph_scene.Class.Scene.FUNCTION_LIBRARY
        )
        .node();
      let functionLibraryX = functionLibrary
        ? (functionLibrary as any).getCTM().e
        : null;
      if (functionLibraryX !== null && functionLibraryX !== auxX) {
        functionLibraryTitleStyle.display = 'inline';
        // Make sure that the function library title is positioned rightwards
        // enough so as to prevent overlap with other content.
        functionLibraryX = Math.max(
          auxX + auxTitleElement.getBoundingClientRect().width,
          functionLibraryX
        );
        functionLibraryTitleStyle.left = functionLibraryX + 'px';
      } else {
        functionLibraryTitleStyle.display = 'none';
      }
    } else {
      titleStyle.display = 'none';
      auxTitleStyle.display = 'none';
      functionLibraryTitleStyle.display = 'none';
    }
  }
  @observe('colorBy')
  /**
   * Called whenever the user changed the 'color by' option in the
   * UI controls.
   */
  _colorByChanged() {
    if (this.renderHierarchy != null) {
      // We iterate through each svg node and update its state.
      _.each(this._nodeGroupIndex, (nodeGroup, nodeName) => {
        this._updateNodeState(nodeName);
      });
      // Notify also the minimap.
      (this.minimap as any).update();
    }
  }
  fit() {
    this._hasRenderHierarchyBeenFitOnce = true;
    tf_graph_scene.fit(
      this.$.svg,
      this.$.root,
      this._zoom,
      function() {
        this._zoomed = false;
      }.bind(this)
    );
  }
  isNodeSelected(n) {
    return n === this.selectedNode;
  }
  isNodeHighlighted(n) {
    return n === this.highlightedNode;
  }
  addAnnotationGroup(a, d, selection) {
    var an = a.node.name;
    this._annotationGroupIndex[an] = this._annotationGroupIndex[an] || {};
    this._annotationGroupIndex[an][d.node.name] = selection;
  }
  getAnnotationGroupsIndex(a) {
    return this._annotationGroupIndex[a];
  }
  removeAnnotationGroup(a, d) {
    delete this._annotationGroupIndex[a.node.name][d.node.name];
  }
  addNodeGroup(n, selection) {
    this._nodeGroupIndex[n] = selection;
  }
  getNodeGroup(n) {
    return this._nodeGroupIndex[n];
  }
  removeNodeGroup(n) {
    delete this._nodeGroupIndex[n];
  }
  addEdgeGroup(n, selection) {
    this._edgeGroupIndex[n] = selection;
  }
  getEdgeGroup(e) {
    return this._edgeGroupIndex[e];
  }
  @observe('nodeNamesToHealthPills', 'healthPillStepIndex')
  _updateHealthPills() {
    var nodeNamesToHealthPills = this.nodeNamesToHealthPills;
    var healthPillStepIndex = this.healthPillStepIndex;
    tf_graph_scene.addHealthPills(
      this.$.svg as SVGElement,
      nodeNamesToHealthPills as any,
      healthPillStepIndex
    );
  }
  /**
   * Update node and annotation node of the given name.
   * @param  {String} n node name
   */
  _updateNodeState(n) {
    var node = this.getNode(n);
    var nodeGroup = this.getNodeGroup(n);
    if (nodeGroup) {
      tf_graph_scene_node.stylize(nodeGroup, node, this as any);
    }
    if (
      node.node.type === tf_graph.NodeType.META &&
      (node.node as any).associatedFunction &&
      !node.isLibraryFunction
    ) {
      // The node is that of a function call. Also link the node within the
      // function library. This clarifies to the user that the library function
      // is being used.
      var libraryFunctionNodeName =
        tf_graph.FUNCTION_LIBRARY_NODE_PREFIX +
        (node.node as any).associatedFunction;
      var functionGroup = d3.select(
        '.' +
          tf_graph_scene.Class.Scene.GROUP +
          '>.' +
          tf_graph_scene.Class.Scene.FUNCTION_LIBRARY +
          ' g[data-name="' +
          libraryFunctionNodeName +
          '"]'
      );
      tf_graph_scene_node.stylize(functionGroup, node, this as any);
    }
    var annotationGroupIndex = this.getAnnotationGroupsIndex(n);
    _.each(annotationGroupIndex, (aGroup, hostName) => {
      tf_graph_scene_node.stylize(
        aGroup,
        node,
        this as any,
        tf_graph_scene.Class.Annotation.NODE
      );
    });
  }
  /**
   * Handles new node selection. 1) Updates the selected-state of each node,
   * 2) triggers input tracing.
   * @param selectedNode {string} The name of the newly selected node.
   * @param oldSelectedNode {string} The name of the previously selected node.
   * @private
   */
  _selectedNodeChanged(selectedNode, oldSelectedNode) {
    if (selectedNode === oldSelectedNode) {
      return;
    }
    if (oldSelectedNode) {
      this._updateNodeState(oldSelectedNode);
    }
    if (!selectedNode) {
      return;
    }
    // Update the minimap to reflect the highlighted (selected) node.
    (this.minimap as any).update();
    var node = this.renderHierarchy.hierarchy.node(selectedNode);
    var nodeParents = [];
    // Create list of all metanode parents of the selected node.
    while (
      node.parentNode != null &&
      node.parentNode.name != tf_graph.ROOT_NAME
    ) {
      node = (node as any).parentNode;
      nodeParents.push(node.name);
    }
    // Ensure each parent metanode is built and expanded.
    var topParentNodeToBeExpanded;
    _.forEachRight(nodeParents, (parentName) => {
      this.renderHierarchy.buildSubhierarchy(parentName);
      var renderNode = this.renderHierarchy.getRenderNodeByName(parentName);
      if (renderNode.node.isGroupNode && !renderNode.expanded) {
        renderNode.expanded = true;
        if (!topParentNodeToBeExpanded) {
          topParentNodeToBeExpanded = renderNode;
        }
      }
    });
    // If any expansion was needed to display this selected node, then
    // inform the scene of the top-most expansion.
    if (topParentNodeToBeExpanded) {
      this.setNodeExpanded(topParentNodeToBeExpanded);
      this._zoomed = true;
    }
    if (selectedNode) {
      this._updateNodeState(selectedNode);
    }
    // Give time for any expanding to finish before panning to a node.
    // Otherwise, the pan will be computed from incorrect measurements.
    setTimeout(() => {
      this.panToNode(selectedNode);
    }, tf_graph_layout.PARAMS.animation.duration);
  }
  _highlightedNodeChanged(highlightedNode, oldHighlightedNode) {
    if (highlightedNode === oldHighlightedNode) {
      return;
    }
    if (highlightedNode) {
      this._updateNodeState(highlightedNode);
    }
    if (oldHighlightedNode) {
      this._updateNodeState(oldHighlightedNode);
    }
  }
  _onZoomChanged() {
    this._updateLabels(!this._zoomed);
  }
  _fireEnableClick() {
    this.fire('enable-click');
  }

  // When renderHierarchy changes, we need to first build the new SVG based
  // on the new hierarchy (and it is asynchronous). We will let that observer
  // update the input trace.
  @observe('traceInputs', 'selectedNode')
  _updateInputTrace() {
    tf_graph_scene_node.updateInputTrace(
      this.getGraphSvgRoot(),
      this.renderHierarchy,
      this.selectedNode,
      this.traceInputs
    );
  }
}
