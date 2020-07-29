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

import { PolymerElement, html } from "@polymer/polymer";
import { customElement, property } from "@polymer/decorators";
import { DO_NOT_SUBMIT } from "../tf-imports/polymer.html";
import { DO_NOT_SUBMIT } from "../tf-dashboard-common/tensorboard-color.html";
import { DO_NOT_SUBMIT } from "../tf-graph-common/tf-node-icon.html";
import { DO_NOT_SUBMIT } from "../tf-imports/polymer.html";
import { DO_NOT_SUBMIT } from "../tf-dashboard-common/tensorboard-color.html";
import { DO_NOT_SUBMIT } from "../tf-graph-common/tf-node-icon.html";
@customElement("tf-node-list-item")
class TfNodeListItem extends PolymerElement {
    static readonly template = html `<style>
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
    <div id="list-item" on-mouseover="_nodeListener" on-mouseout="_nodeListener" on-click="_nodeListener">
      <div class$="{{_fadedClass(itemRenderInfo)}}">
        <tf-node-icon class="node-icon" height="12" color-by="[[colorBy]]" color-by-params="[[colorByParams]]" node="[[itemNode]]" render-info="[[itemRenderInfo]]" template-index="[[templateIndex]]"></tf-node-icon>
        <span title$="[[name]]">[[name]]</span>
        <span class="edge-label">[[edgeLabel]]</span>
      </div>
    </div>`;
    @property({ type: Object })
    cardNode: object;
    @property({ type: Object })
    itemNode: object;
    @property({ type: String })
    edgeLabel: string;
    @property({ type: Object })
    itemRenderInfo: object;
    @property({ type: String })
    name: string;
    @property({
        type: String,
        observer: "_itemTypeChanged"
    })
    itemType: string;
    @property({ type: String })
    colorBy: string;
    @property({ type: Object })
    colorByParams: object;
    @property({ type: Function })
    templateIndex: object;
    _itemTypeChanged() {
        if (this.itemType !== "subnode") {
            this.$["list-item"].classList.add("clickable");
        }
        else {
            this.$["list-item"].classList.remove("clickable");
        }
    }
    _nodeListener(event) {
        // fire node.click/mouseover/mouseout
        this.fire("node-list-item-" + event.type, {
            cardNode: this.cardNode.name,
            nodeName: this.name,
            type: this.itemType,
        });
    }
    _fadedClass(itemRenderInfo) {
        return itemRenderInfo && itemRenderInfo.isFadedOut ? "faded" : "";
    }
}
