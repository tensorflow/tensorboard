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
import {customElement, property} from '@polymer/decorators';
import {DO_NOT_SUBMIT} from '../tf-imports/polymer.html';
import {DO_NOT_SUBMIT} from 'tf-graph-icon.html';
import {DO_NOT_SUBMIT} from '../tf-imports/polymer.html';
import {DO_NOT_SUBMIT} from 'tf-graph-icon.html';
@customElement('tf-node-icon')
class TfNodeIcon extends PolymerElement {
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
  @property({
    type: Object,
  })
  node: object = null;
  @property({
    type: Object,
  })
  renderInfo: object = null;
  @property({
    type: Object,
  })
  colorBy: object = 'structural';
  @property({
    type: Function,
  })
  templateIndex: object = null;
  @property({
    type: String,
  })
  type: string = null;
  @property({
    type: Boolean,
  })
  vertical: boolean = false;
  @property({
    type: Boolean,
  })
  const: boolean = false;
  @property({
    type: Boolean,
  })
  summary: boolean = false;
  @property({
    type: String,
  })
  fill: string = null;
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
    inputColorBy,
    inputTemplateIndex,
    inputFill
  ) {
    if (inputNode && inputRenderInfo && inputColorBy && inputTemplateIndex) {
      var ns = tf.graph.scene.node;
      var colorBy = ns.ColorBy[inputColorBy.toUpperCase()];
      return ns.getFillForNode(
        inputTemplateIndex,
        colorBy,
        inputRenderInfo,
        false
      );
    }
    return inputFill;
  }
  _getStrokeOverride(fillOverride) {
    return fillOverride
      ? tf.graph.scene.node.getStrokeForFill(fillOverride)
      : null;
  }
  /**
   * Returns graph-icon type from input, type, and summary.
   */
  _getType(inputNode, isSummary, isConst, inputType) {
    const {GraphIconType} = tf.graph.icon;
    if (inputNode) {
      switch (inputNode.type) {
        case tf.graph.NodeType.OP: {
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
        case tf.graph.NodeType.META:
          return GraphIconType.META;
        case tf.graph.NodeType.SERIES:
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
    const ns = tf.graph.scene.node;
    if (newFill !== oldFill) {
      ns.removeGradientDefinitions(this.$.icon.getSvgDefinableElement());
    }
    if (node && renderInfo && colorBy && templateIndex) {
      const nsColorBy = ns.ColorBy[colorBy.toUpperCase()];
      ns.getFillForNode(
        templateIndex,
        nsColorBy,
        renderInfo,
        false,
        this.$.icon.getSvgDefinableElement()
      );
    }
  }
}
