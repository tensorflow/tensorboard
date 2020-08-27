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
import '../../../../components_polymer3/tf_dashboard_common/tensorboard-color';
import '../tf_graph_common/tf-node-icon';

import {LegacyElementMixin} from '../../../../components_polymer3/polymer/legacy_element_mixin';

@customElement('tf-graph-op-compat-list-item')
class TfGraphOpCompatListItem extends LegacyElementMixin(PolymerElement) {
  static readonly template = html`
    <style>
      #list-item {
        width: 100%;
        color: #565656;
        font-size: 11pt;
        font-weight: 400;
        position: relative;
        display: inline-block;
      }

      #list-item:hover {
        background-color: var(--google-yellow-100);
      }

      .clickable {
        cursor: pointer;
      }

      #list-item span {
        margin-left: 40px;
      }

      #list-item.excluded span {
        color: #999;
      }

      #list-item span.edge-label {
        float: right;
        font-size: 10px;
        margin-left: 3px;
        margin-right: 5px;
      }

      .node-icon {
        position: absolute;
        top: 1px;
        left: 2px;
      }

      .faded span {
        color: var(--tb-graph-faded);
      }
    </style>

    <div
      id="list-item"
      on-mouseover="_nodeListener"
      on-mouseout="_nodeListener"
      on-click="_nodeListener"
    >
      <div class$="{{_fadedClass(itemRenderInfo)}}">
        <tf-node-icon
          class="node-icon"
          height="12"
          color-by="[[colorBy]]"
          color-by-params="[[colorByParams]]"
          node="[[itemNode]]"
          render-info="[[itemRenderInfo]]"
          template-index="[[templateIndex]]"
        >
        </tf-node-icon>
        <span title$="[[name]]">[[name]]</span>
      </div>
    </div>
  `;
  /**
   * The Node for the card itself, on which this item is being drawn.
   * This property is a tf.graph.Node.
   */
  @property({type: Object})
  cardNode: object;
  /**
   * The Node for the item within the card, somehow related to cardNode.
   * This property is a tf.graph.Node.
   */
  @property({type: Object})
  itemNode: object;
  /** The edge label associated with this item. */
  @property({type: String})
  edgeLabel: string;
  /**
   * The render node information for the item node. Used by the graph
   * icon in determining fill color.
   */
  @property({type: Object})
  itemRenderInfo: object;
  @property({type: String})
  name: string;
  @property({
    type: String,
    observer: '_itemTypeChanged',
  })
  itemType: string;
  @property({type: String})
  colorBy: string;
  @property({type: Object})
  colorByParams: object;
  @property({type: Object})
  templateIndex: object;
  _itemTypeChanged() {
    if (this.itemType !== 'subnode') {
      this.$['list-item'].classList.add('clickable');
    } else {
      this.$['list-item'].classList.remove('clickable');
    }
  }
  _nodeListener(event) {
    // fire node.click/mouseover/mouseout
    this.fire('node-list-item-' + event.type, {
      nodeName: this.name,
      type: this.itemType,
    });
  }
  _fadedClass(itemRenderInfo) {
    return itemRenderInfo && itemRenderInfo.isFadedOut ? 'faded' : '';
  }
}
