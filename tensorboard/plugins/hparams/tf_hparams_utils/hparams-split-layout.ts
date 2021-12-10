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

@customElement('hparams-split-layout')
class HparamsSplitLayout extends PolymerElement {
  static readonly template = html`
    <slot name="content"></slot>

    <style>
      :host {
        display: block;
      }

      :host slot {
        display: flex;
        height: 100%;
        width: 100%;
      }

      :host ::slotted(*) {
        flex: 0 0 auto;
      }

      :host([orientation='horizontal']) slot {
        flex-direction: row;
        overflow-x: auto;
      }

      :host([orientation='vertical']) slot {
        flex-direction: column;
        overflow-y: auto;
      }

      :host ::slotted(*:not(:last-child)) {
        border: 0 solid var(--divider-color, #ccc);
      }

      :host([orientation='vertical']) ::slotted(*:not(:last-child)) {
        border-bottom-width: 5px;
      }

      :host([orientation='horizontal']) ::slotted(*:not(:last-child)) {
        border-right-width: 5px;
      }
    </style>
  `;
  @property({type: String, reflectToAttribute: true})
  orientation: 'vertical' | 'horizontal' = 'horizontal';
}
