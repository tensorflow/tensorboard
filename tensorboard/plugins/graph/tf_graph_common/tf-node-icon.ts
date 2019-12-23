/* Copyright 2016 The TensorFlow Authors. All Rights Reserved.

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
import {customElement, property, computed} from '@polymer/decorators';
import './tf-graph-icon.html';
import {ColorBy} from './tf-graph-scene';
import {RenderNodeInfo} from './render';
import {Node, NodeType, OpNode} from './graph';
import {
  getFillForNode,
  getStrokeForFill,
  removeGradientDefinitions,
} from './node';
import {GraphIconType, TfGraphIcon} from './tf-graph-icon';

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
  node: Node | null = null;

  @property({
    type: Object,
  })
  renderInfo: RenderNodeInfo | null = null;

  @property({
    type: String,
  })
  colorBy: ColorBy = ColorBy.STRUCTURE;

  @property({
    type: Object,
  })
  templateIndex: null | ((id: string) => number) = null;

  @property({
    type: String,
  })
  type: string | null = null;

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
  fill: string | null = null;

  @property({
    type: Number,
  })
  height: number = 20;

  @computed('node', 'renderInfo', 'colorBy', 'templateIndex', 'fill')
  get _fillOverride(): string | null {
    var inputNode = this.node;
    var inputRenderInfo = this.renderInfo;
    var inputTemplateIndex = this.templateIndex;
    var inputFill = this.fill;
    if (inputNode && inputRenderInfo && inputTemplateIndex) {
      return getFillForNode(
        inputTemplateIndex,
        this.colorBy,
        inputRenderInfo,
        false
      );
    }
    return inputFill;
  }

  _getStrokeOverride(fillOverride: string) {
    return fillOverride ? getStrokeForFill(fillOverride) : null;
  }
  /**
   * Returns graph-icon type from input, type, and summary.
   */
  _getType(
    inputNode: Node,
    isSummary: boolean,
    isConst: boolean,
    inputType: string | null
  ) {
    if (inputNode) {
      switch (inputNode.type) {
        case NodeType.OP: {
          const opName = (inputNode as OpNode).op;
          // TODO(tensorboarad-team): `op` should have a predictable type.
          // Remove the type check.
          if (typeof opName !== 'string') return GraphIconType.OP;
          if (opName === 'Const' || isConst) return GraphIconType.CONST;
          if (opName.endsWith('Summary') || isSummary) {
            return GraphIconType.SUMMARY;
          }
          return GraphIconType.OP;
        }
        case NodeType.META:
          return GraphIconType.META;
        case NodeType.SERIES:
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
  _isVertical(inputNode: Node, inputVertical: boolean) {
    if (inputNode) {
      return (inputNode as any).hasNonControlEdges;
    }
    return !!inputVertical;
  }

  _getFaded(itemRenderInfo: RenderNodeInfo) {
    return itemRenderInfo && itemRenderInfo.isFadedOut;
  }

  _onFillOverrideChanged(newFill: string, oldFill: string) {
    const {node, renderInfo, colorBy, templateIndex} = this;
    const iconEl = this.$.icon as TfGraphIcon;
    if (newFill !== oldFill) {
      removeGradientDefinitions(iconEl.getSvgDefinableElement());
    }
    if (node && renderInfo && templateIndex) {
      getFillForNode(
        templateIndex,
        colorBy,
        renderInfo,
        false,
        iconEl.getSvgDefinableElement()
      );
    }
  }
}
