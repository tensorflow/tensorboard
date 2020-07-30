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
import * as d3 from 'd3';
import * as _ from 'lodash';
import '@polymer/iron-flex-layout/iron-flex-layout';
import '@polymer/iron-icons';
import '@polymer/paper-button';
import '@polymer/paper-input/paper-input';
import '@polymer/paper-toggle-button';

import './tf-graph-scene';
import * as tf_graph from '../tf_graph_common/graph';
import * as tf_graph_scene from '../tf_graph_common/scene';
import * as tf_graph_util from '../tf_graph_common/util';
import * as tf_graph_hierarchy from '../tf_graph_common/hierarchy';
import * as tf_graph_render from '../tf_graph_common/render';
import {LegacyElementMixin} from '../../../../components_polymer3/polymer/legacy_element_mixin';

@customElement('tf-graph')
class TfGraph extends LegacyElementMixin(PolymerElement) {
  static readonly template = html`
    <style>
      .container {
        width: 100%;
        height: 100%;
        background: white;
        box-shadow: 0 1px 5px rgba(0, 0, 0, 0.2);
      }

      .vertical {
        width: 100%;
        height: 100%;
        @apply --layout-vertical;
      }

      .auto {
        @apply --layout-flex-auto;
        @apply --layout-vertical;
      }

      h2 {
        text-align: center;
      }

      paper-button {
        text-transform: none;
      }
    </style>
    <div class="container">
      <div class="vertical">
        <template is="dom-if" if="[[title]]">
          <h2>[[title]]</h2>
        </template>
        <tf-graph-scene
          id="scene"
          class="auto"
          render-hierarchy="[[renderHierarchy]]"
          highlighted-node="[[_getVisible(highlightedNode)]]"
          selected-node="{{selectedNode}}"
          selected-edge="{{selectedEdge}}"
          color-by="[[colorBy]]"
          progress="[[progress]]"
          node-context-menu-items="[[nodeContextMenuItems]]"
          node-names-to-health-pills="[[nodeNamesToHealthPills]]"
          health-pill-step-index="{{healthPillStepIndex}}"
          handle-edge-selected="[[handleEdgeSelected]]"
          trace-inputs="[[traceInputs]]"
        ></tf-graph-scene>
      </div>
    </div>
  `;
  @property({
    type: Object,
    notify: true,
    observer: '_graphChanged',
  })
  graphHierarchy: object;
  @property({type: Object})
  basicGraph: object;
  @property({type: Object})
  stats: object;
  @property({type: Object})
  devicesForStats: object;
  @property({type: Object})
  hierarchyParams: any;
  @property({
    type: Object,
    notify: true,
  })
  progress: object;
  @property({type: String})
  title: string;
  @property({
    type: String,
    notify: true,
  })
  selectedNode: string;
  @property({
    type: Object,
    notify: true,
  })
  selectedEdge: object;
  @property({type: Object})
  _lastSelectedEdgeGroup: any;
  @property({
    type: String,
    notify: true,
  })
  highlightedNode: string;
  @property({type: String})
  colorBy: string;
  @property({
    type: Object,
    notify: true,
    readOnly: true,
  })
  colorByParams: object;
  @property({
    type: Object,
    readOnly: true,
    notify: true,
  })
  renderHierarchy: any;
  @property({type: Boolean})
  traceInputs: boolean;
  @property({type: Array})
  nodeContextMenuItems: unknown[];
  @property({
    type: Number,
  })
  _renderDepth: number = 1;
  @property({
    type: Boolean,
  })
  _allowGraphSelect: boolean = true;
  @property({type: Object})
  nodeNamesToHealthPills: object;
  @property({type: Number})
  healthPillStepIndex: number;
  @property({
    type: Object,
  })
  edgeWidthFunction: any = '';
  @property({
    type: Object,
  })
  handleNodeSelected: any = '';
  @property({
    type: Object,
  })
  edgeLabelFunction: any = '';
  @property({
    type: Object,
  })
  handleEdgeSelected: any = '';
  /**
   * Pans to a node. Assumes that the node exists.
   * @param nodeName {string} The name of the node to pan to.
   */
  panToNode(nodeName) {
    (this.$$('tf-graph-scene') as any).panToNode(nodeName);
  }
  @observe(
    'graphHierarchy',
    'edgeWidthFunction',
    'handleNodeSelected',
    'edgeLabelFunction',
    'handleEdgeSelected'
  )
  _buildNewRenderHierarchy() {
    var graphHierarchy = this.graphHierarchy;
    if (!graphHierarchy) return;
    this._buildRenderHierarchy(graphHierarchy);
  }
  @observe('stats', 'devicesForStats')
  _statsChanged() {
    var stats = this.stats;
    var devicesForStats = this.devicesForStats;
    if (this.graphHierarchy) {
      if (stats && devicesForStats) {
        tf_graph.joinStatsInfoWithGraph(
          this.basicGraph as any,
          stats as any,
          devicesForStats as any
        );
        tf_graph_hierarchy.joinAndAggregateStats(
          this.graphHierarchy as any,
          stats as any
        );
      }
      // Recompute the rendering information.
      this._buildRenderHierarchy(this.graphHierarchy);
    }
  }
  ready() {
    super.ready();

    this.addEventListener('graph-select', this._graphSelected.bind(this));
    this.addEventListener('disable-click', this._disableClick.bind(this));
    this.addEventListener('enable-click', this._enableClick.bind(this));
    // Nodes
    this.addEventListener(
      'node-toggle-expand',
      this._nodeToggleExpand.bind(this)
    );
    this.addEventListener('node-select', this._nodeSelected.bind(this));
    this.addEventListener('node-highlight', this._nodeHighlighted.bind(this));
    this.addEventListener(
      'node-unhighlight',
      this._nodeUnhighlighted.bind(this)
    );
    this.addEventListener(
      'node-toggle-extract',
      this._nodeToggleExtract.bind(this)
    );
    this.addEventListener(
      'node-toggle-seriesgroup',
      this._nodeToggleSeriesGroup.bind(this)
    );
    // Edges
    this.addEventListener('edge-select', this._edgeSelected.bind(this));

    // Annotations

    /* Note: currently highlighting/selecting annotation node has the same
     * behavior as highlighting/selecting actual node so we point to the same
     * set of event listeners.  However, we might redesign this to be a bit
     * different.
     */
    this.addEventListener('annotation-select', this._nodeSelected.bind(this));
    this.addEventListener(
      'annotation-highlight',
      this._nodeHighlighted.bind(this)
    );
    this.addEventListener(
      'annotation-unhighlight',
      this._nodeUnhighlighted.bind(this)
    );
  }
  _buildRenderHierarchy(graphHierarchy) {
    tf_graph_util.time(
      'new tf_graph_render.Hierarchy',
      function() {
        if (graphHierarchy.root.type !== tf_graph.NodeType.META) {
          // root must be metanode but sometimes Polymer's dom-if has not
          // remove tf-graph element yet in <tf-node-info>
          // and thus mistakenly pass non-metanode to this module.
          return;
        }
        var renderGraph = new tf_graph_render.RenderGraphInfo(
          graphHierarchy,
          !!this.stats /** displayingStats */
        );
        renderGraph.edgeLabelFunction = this.edgeLabelFunction;
        renderGraph.edgeWidthFunction = this.edgeWidthFunction;
        // Producing the 'color by' parameters to be consumed
        // by the tf-graph-controls panel. It contains information about the
        // min and max values and their respective colors, as well as list
        // of devices with their respective colors.
        function getColorParamsFromScale(scale) {
          return {
            minValue: scale.domain()[0],
            maxValue: scale.domain()[1],
            startColor: scale.range()[0],
            endColor: scale.range()[1],
          };
        }
        this._setColorByParams({
          compute_time: getColorParamsFromScale(
            renderGraph.computeTimeScale as any
          ),
          memory: getColorParamsFromScale(renderGraph.memoryUsageScale as any),
          device: _.map(renderGraph.deviceColorMap.domain(), function(
            deviceName
          ) {
            return {
              device: deviceName,
              color: renderGraph.deviceColorMap(deviceName),
            };
          }),
          xla_cluster: _.map(renderGraph.xlaClusterColorMap.domain(), function(
            xlaClusterName
          ) {
            return {
              xla_cluster: xlaClusterName,
              color: renderGraph.xlaClusterColorMap(xlaClusterName),
            };
          }),
        });
        this._setRenderHierarchy(renderGraph);
        this.async(function() {
          this.fire('rendered');
        });
      }.bind(this)
    );
  }
  _getVisible(name) {
    if (!name) {
      return name;
    }
    return this.renderHierarchy.getNearestVisibleAncestor(name);
  }
  fit() {
    (this.$.scene as any).fit();
  }
  _graphChanged() {
    // When a new graph is loaded, fire this event so that there is no
    // info-card being displayed for the previously-loaded graph.
    this.fire('graph-select');
  }
  _graphSelected(event) {
    // Graph selection is not allowed during an active zoom event, as the
    // click seen during a zoom/pan is part of the zooming and does not
    // indicate a user desire to click on a specific section of the graph.
    if (this._allowGraphSelect) {
      this.set('selectedNode', null);
      this.set('selectedEdge', null);
    }
    // Reset this variable as a bug in d3 zoom behavior can cause zoomend
    // callback not to be called if a right-click happens during a zoom event.
    this._allowGraphSelect = true;
  }
  _disableClick(event) {
    this._allowGraphSelect = false;
  }
  _enableClick(event) {
    this._allowGraphSelect = true;
  }
  @observe('selectedNode')
  // Called when the selected node changes, ie there is a new selected node or
  // the current one is unselected.
  _selectedNodeChanged() {
    var selectedNode = this.selectedNode;
    if (this.handleNodeSelected) {
      // A higher-level component provided a callback. Run it.
      this.handleNodeSelected(selectedNode);
    }
  }
  @observe('selectedEdge')
  // Called when the selected edge changes, ie there is a new selected edge or
  // the current one is unselected.
  _selectedEdgeChanged() {
    var selectedEdge = this.selectedEdge;
    this._deselectPreviousEdge();
    // Visually mark this new edge as selected.
    if (selectedEdge) {
      this._lastSelectedEdgeGroup.classed(
        tf_graph_scene.Class.Edge.SELECTED,
        true
      );
      // Update the color of the marker too if the edge has one.
      this._updateMarkerOfSelectedEdge(selectedEdge);
    }
    if (this.handleEdgeSelected) {
      // A higher-level component provided a callback. Run it.
      this.handleEdgeSelected(selectedEdge);
    }
  }
  // Called only when a new (non-null) node is selected.
  _nodeSelected(event) {
    if (this._allowGraphSelect) {
      this.set('selectedNode', event.detail.name);
    }
    // Reset this variable as a bug in d3 zoom behavior can cause zoomend
    // callback not to be called if a right-click happens during a zoom event.
    this._allowGraphSelect = true;
  }
  _edgeSelected(event) {
    if (this._allowGraphSelect) {
      this.set('_lastSelectedEdgeGroup', event.detail.edgeGroup);
      this.set('selectedEdge', event.detail.edgeData);
    }
    // Reset this variable as a bug in d3 zoom behavior can cause zoomend
    // callback not to be called if a right-click happens during a zoom event.
    this._allowGraphSelect = true;
  }
  _nodeHighlighted(event) {
    this.set('highlightedNode', event.detail.name);
  }
  _nodeUnhighlighted(event) {
    this.set('highlightedNode', null);
  }
  _nodeToggleExpand(event) {
    // Immediately select the node that is about to be expanded.
    this._nodeSelected(event);
    // Compute the sub-hierarchy scene.
    var nodeName = event.detail.name;
    var renderNode = this.renderHierarchy.getRenderNodeByName(nodeName);
    // Op nodes are not expandable.
    if (renderNode.node.type === tf_graph.NodeType.OP) {
      return;
    }
    this.renderHierarchy.buildSubhierarchy(nodeName);
    renderNode.expanded = !renderNode.expanded;
    // Expand the node with some delay so that the user can immediately see
    // the visual effect of selecting that node, before the expansion is
    // done.
    this.async(function() {
      this.$.scene.setNodeExpanded(renderNode);
    }, 75);
  }
  _nodeToggleExtract(event) {
    // Toggle the include setting of the specified node appropriately.
    var nodeName = event.detail.name;
    this.nodeToggleExtract(nodeName);
  }
  nodeToggleExtract(nodeName) {
    var renderNode = this.renderHierarchy.getRenderNodeByName(nodeName);
    if (renderNode.node.include == tf_graph.InclusionType.INCLUDE) {
      renderNode.node.include = tf_graph.InclusionType.EXCLUDE;
    } else if (renderNode.node.include == tf_graph.InclusionType.EXCLUDE) {
      renderNode.node.include = tf_graph.InclusionType.INCLUDE;
    } else {
      renderNode.node.include = this.renderHierarchy.isNodeAuxiliary(renderNode)
        ? tf_graph.InclusionType.INCLUDE
        : tf_graph.InclusionType.EXCLUDE;
    }
    // Rebuild the render hierarchy.
    this._buildRenderHierarchy(this.graphHierarchy);
  }
  _nodeToggleSeriesGroup(event) {
    // Toggle the group setting of the specified node appropriately.
    var nodeName = event.detail.name;
    this.nodeToggleSeriesGroup(nodeName);
  }
  nodeToggleSeriesGroup(nodeName) {
    // Toggle the group setting of the specified node appropriately.
    tf_graph.toggleNodeSeriesGroup(this.hierarchyParams.seriesMap, nodeName);
    // Rebuild the render hierarchy with the updated series grouping map.
    this.set('progress', {
      value: 0,
      msg: '',
    });
    var tracker = tf_graph_util.getTracker(this);
    var hierarchyTracker = tf_graph_util.getSubtaskTracker(
      tracker,
      100,
      'Namespace hierarchy'
    );
    tf_graph_hierarchy
      .build(this.basicGraph as any, this.hierarchyParams, hierarchyTracker)
      .then(
        function(graphHierarchy) {
          this.set('graphHierarchy', graphHierarchy);
          this._buildRenderHierarchy(this.graphHierarchy);
        }.bind(this)
      );
  }
  _deselectPreviousEdge() {
    const selectedSelector = '.' + tf_graph_scene.Class.Edge.SELECTED;
    // Visually mark the previously selected edge (if any) as deselected.
    d3.select(selectedSelector)
      .classed(tf_graph_scene.Class.Edge.SELECTED, false)
      .each((d: any, i) => {
        // Reset its marker.
        if (d.label) {
          const paths = d3.select(this).selectAll('path.edgeline');
          if (d.label.startMarkerId) {
            paths.style('marker-start', `url(#${d.label.startMarkerId})`);
          }
          if (d.label.endMarkerId) {
            paths.style('marker-end', `url(#${d.label.endMarkerId})`);
          }
        }
      });
  }
  _updateMarkerOfSelectedEdge(selectedEdge) {
    if (selectedEdge.label) {
      // The marker will vary based on the direction of the edge.
      const markerId =
        selectedEdge.label.startMarkerId || selectedEdge.label.endMarkerId;
      if (markerId) {
        // Find the corresponding marker for a selected edge.
        const selectedMarkerId = markerId.replace('dataflow-', 'selected-');
        let selectedMarker = this.$$('#' + selectedMarkerId) as HTMLElement;
        if (!selectedMarker) {
          // The marker for a selected edge of this size does not exist yet. Create it.
          const originalMarker = this.$.scene.querySelector('#' + markerId);
          selectedMarker = originalMarker.cloneNode(true) as HTMLElement;
          selectedMarker.setAttribute('id', selectedMarkerId);
          selectedMarker.classList.add('selected-arrowhead');
          originalMarker.parentNode.appendChild(selectedMarker);
        }
        // Make the path use this new marker while it is selected.
        const markerAttribute = selectedEdge.label.startMarkerId
          ? 'marker-start'
          : 'marker-end';
        this._lastSelectedEdgeGroup
          .selectAll('path.edgeline')
          .style(markerAttribute, `url(#${selectedMarkerId})`);
      }
    }
  }
  not(x) {
    return !x;
  }
}
