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

import {customElement, property} from '@polymer/decorators';
import {html, PolymerElement} from '@polymer/polymer';
import {LegacyElementMixin} from '../../../components/polymer/legacy_element_mixin';
import * as tf_graph from '../tf_graph_common/graph';
import * as tf_graph_scene_node from '../tf_graph_common/node';
import './tf-graph-icon';
import * as tf_graph_icon from './tf-graph-icon';
import {ColorBy} from './view_types';

@customElement('tf-node-icon')
class TfNodeIcon extends LegacyElementMixin(PolymerElement) {
  static readonly template = html`
    <style>
      tf-graph-icon {
        --tb-graph-faded: var(--tb-graph-faded);
      }
    </style>
    <tf-graph-icon
      id="icon"
      type="[[_getType(node, summary, const, type)]]"
      height="[[height]]"
      fill-override="[[_fillOverride]]"
      stroke-override="[[_getStrokeOverride(_fillOverride)]]"
      faded="[[_getFaded(renderInfo)]]"
      vertical="[[_isVertical(node, vertical)]]"
    ></tf-graph-icon>
  `;

  /**
   * Node to represent with an icon. Optional, but if specified, its
   * properties override those defined in the type, vertical, const and
   * summary properties.
   * This property is a tf.graph.Node.
   */
  @property({
    type: Object,
  })
  node: object | null = null;

  /**
   * Render node information associated with this node. Optional. If
   * specified, this is only used when computing the fill of the icon
   * element.
   * This property is a tf.graph.render.RenderNodeInfo.
   */
  @property({
    type: Object,
  })
  renderInfo: object | null = null;

  /**
   * String indicating the type of coloring to use for this node, used
   * only for determining the fill.
   */
  @property({
    type: Object,
  })
  colorBy: ColorBy = ColorBy.STRUCTURE;

  /**
   * Function used by structural coloring algorithm to determine which
   * color to use based on the template ID of the node. Optional.
   */
  @property({
    type: Object,
  })
  templateIndex: ((name: string) => number | null) | null = null;

  /** Type of node to draw (ignored if node is set). */
  @property({
    type: String,
  })
  type: string | null = null;

  /** Direction for series (ignored for other types). */
  @property({
    type: Boolean,
  })
  vertical: boolean = false;

  /** Whether the op is Const (ignored for non-ops). */
  @property({
    type: Boolean,
  })
  const: boolean = false;

  /** Whether the op is a Summary (ignored for non-ops). */
  @property({
    type: Boolean,
  })
  summary: boolean = false;

  /**
   * Fill for the icon, optional. If fill is specified and node is not
   * specified, then this value will override the default for the
   * element. However, if node is specified, this value will be ignored.
   */
  @property({
    type: String,
  })
  fill: string | null = null;

  /** Height of the SVG element in pixels, used for scaling. */
  @property({
    type: Number,
  })
  height: number = 20;

  @property({
    type: String,
    computed:
      '_computeFillOverride(node, renderInfo, colorBy, templateIndex, fill)',
    observer: '_onFillOverrideChanged',
  })
  _fillOverride: string;

  /**
   * Returns fill value based on node and configuration. If any of those
   * configurations or node value missing, it returns `fill` property.
   * Note that if this evaluates to null, it will be chosen based on
   * the type of the node.
   */
  _computeFillOverride(
    inputNode,
    inputRenderInfo,
    inputColorBy: ColorBy,
    inputTemplateIndex,
    inputFill
  ) {
    if (inputNode && inputRenderInfo && inputTemplateIndex) {
      return tf_graph_scene_node.getFillForNode(
        inputTemplateIndex,
        inputColorBy,
        inputRenderInfo,
        false
      );
    }
    return inputFill;
  }
  _getStrokeOverride(fillOverride) {
    return fillOverride
      ? tf_graph_scene_node.getStrokeForFill(fillOverride)
      : null;
  }
  /**
   * Returns graph-icon type from input, type, and summary.
   */
  _getType(inputNode, isSummary, isConst, inputType) {
    const {GraphIconType} = tf_graph_icon;
    if (inputNode) {
      switch (inputNode.type) {
        case tf_graph.NodeType.OP: {
          const opName = inputNode.op;
          // TODO(tensorboarad-team): `op` should have a predictable type.
          // Remove the type check.
          if (typeof opName !== 'string') return GraphIconType.OP;
          if (opName === 'Const' || isConst) return GraphIconType.CONST;
          if (opName.endsWith('Summary') || isSummary) {
            return GraphIconType.SUMMARY;
          }
          return GraphIconType.OP;
        }
        case tf_graph.NodeType.META:
          return GraphIconType.META;
        case tf_graph.NodeType.SERIES:
          return GraphIconType.SERIES;
      }
    }
    return inputType;
  }
  /**
   * Test whether the specified node should be represented as a vertical
   * series. Defaults to the value of the vertical property if node is
   * not specified.
   */
  _isVertical(inputNode, inputVertical) {
    if (inputNode) {
      return inputNode.hasNonControlEdges;
    }
    return !!inputVertical;
  }
  _getFaded(itemRenderInfo) {
    return itemRenderInfo && itemRenderInfo.isFadedOut;
  }
  _onFillOverrideChanged(newFill, oldFill) {
    const {node, renderInfo, colorBy, templateIndex} = this;
    if (newFill !== oldFill) {
      tf_graph_scene_node.removeGradientDefinitions(
        (this.$.icon as any).getSvgDefinableElement()
      );
    }
    if (node && renderInfo && templateIndex) {
      tf_graph_scene_node.getFillForNode(
        templateIndex,
        colorBy,
        renderInfo as any,
        false,
        (this.$.icon as any).getSvgDefinableElement()
      );
    }
  }
}
