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

import {customElement, observe, property} from '@polymer/decorators';
import {PolymerElement} from '@polymer/polymer';
import * as d3 from 'd3';
import * as _ from 'lodash';
import {DarkModeMixin} from '../../../components/polymer/dark_mode_mixin';
import {LegacyElementMixin} from '../../../components/polymer/legacy_element_mixin';
import * as tb_debug from '../../../components/tb_debug';
import '../../../components/tf_dashboard_common/tensorboard-color';
import * as tf_graph from '../tf_graph_common/graph';
import * as tf_graph_layout from '../tf_graph_common/layout';
import * as tf_graph_minimap from '../tf_graph_common/minimap';
import * as tf_graph_scene_node from '../tf_graph_common/node';
import * as tf_graph_render from '../tf_graph_common/render';
import * as tf_graph_scene from '../tf_graph_common/scene';
import {TfGraphScene} from '../tf_graph_common/tf-graph-scene';
import * as tf_graph_util from '../tf_graph_common/util';
import {ColorBy} from '../tf_graph_common/view_types';
import './tf-graph-minimap';
import {template} from './tf-graph-scene.html';

@customElement('tf-graph-scene')
class TfGraphScene2
  extends LegacyElementMixin(DarkModeMixin(PolymerElement))
  implements TfGraphScene
{
  static readonly template = template;

  @property({type: Object})
  renderHierarchy: tf_graph_render.RenderGraphInfo;
  @property({type: String})
  name: string;
  @property({type: String})
  colorBy: ColorBy;
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
  _zoomStartCoords: object | null = null;

  /**
   * Keeps track of the current coordinates of a graph zoom/pan
   *
   * @private {{x: number, y: number}?}
   */
  @property({
    type: Object,
  })
  _zoomTransform: object | null = null;

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
  @property({type: Object}) templateIndex: (name: string) => number | null;

  /**
   * A minimap object to notify for zoom events.
   */
  private minimap: tf_graph_minimap.Minimap;

  /*
   * Dictionary for easily stylizing nodes when state changes.
   * _nodeGroupIndex[nodeName] = d3_selection of the nodeGroup
   */
  @property({
    type: Object,
  })
  _nodeGroupIndex = {};

  /*
   * Dictionary for easily stylizing annotation nodes when state changes.
   * _annotationGroupIndex[nodeName][hostNodeName] =
   *   d3_selection of the annotationGroup
   */
  @property({
    type: Object,
  })
  _annotationGroupIndex = {};

  /*
   * Dictionary for easily stylizing edges when state changes.
   * _edgeGroupIndex[edgeName] = d3_selection of the edgeGroup
   */
  @property({
    type: Object,
  })
  _edgeGroupIndex = {};

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
  getContextMenu(): HTMLElement {
    return this.$.contextMenu as HTMLElement;
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
    d3.select(this.$.svg).select('#root').selectAll('*').remove();
    // And the defs.
    tf_graph_scene_node.removeGradientDefinitions(this.$.svg as SVGElement);
  }
  /** Main method for building the scene */
  _build(renderHierarchy: tf_graph_render.RenderGraphInfo) {
    this.templateIndex = renderHierarchy.hierarchy.getTemplateIndex();
    tf_graph_util.time(
      'tf-graph-scene (layout):',
      function () {
        // layout the scene for this meta / series node
        tf_graph_layout.layoutScene(renderHierarchy.root);
      }.bind(this),
      tb_debug.GraphDebugEventId.RENDER_SCENE_LAYOUT
    );
    tf_graph_util.time(
      'tf-graph-scene (build scene):',
      function () {
        tf_graph_scene_node.buildGroupForScene(
          d3.select(this.$.root),
          renderHierarchy.root,
          this
        );
        tf_graph_scene.addGraphClickListener(this.$.svg, this);
        this._updateInputTrace();
      }.bind(this),
      tb_debug.GraphDebugEventId.RENDER_SCENE_BUILD_SCENE
    );
    // Update the minimap again when the graph is done animating.
    setTimeout(
      function () {
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
        function () {
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
        function () {
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
      function () {
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
  override attached() {
    this.set('_isAttached', true);
  }
  override detached() {
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
    var functionLibraryTitleStyle = (
      this.$$('.functionLibraryTitle') as HTMLElement
    ).style;
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
  /**
   * Called whenever the user changed the 'color by' option in the
   * UI controls.
   */
  @observe('colorBy')
  nodeColorsChanged() {
    if (this.renderHierarchy != null) {
      // Formatters will read `sceneElement.templateIndex` directly.
      // Ensure that it is up to date.
      this.templateIndex = this.renderHierarchy.hierarchy.getTemplateIndex();

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
      function () {
        this._zoomed = false;
      }.bind(this)
    );
  }
  getImageBlob(): Promise<Blob> {
    return this.minimap.getImageBlob();
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
    var nodeParents: string[] = [];
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
