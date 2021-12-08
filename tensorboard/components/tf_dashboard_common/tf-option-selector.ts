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
import {LegacyElementMixin} from '../polymer/legacy_element_mixin';
import './tensorboard-color';

@customElement('tf-option-selector')
class TfOptionSelector extends LegacyElementMixin(PolymerElement) {
  static readonly template = html`
    <div id="wrap">
      <h3>[[name]]</h3>
      <div class="content-wrapper"><slot></slot></div>
    </div>
    <style>
      .content-wrapper ::slotted(*) {
        background: none;
        color: var(--tb-ui-dark-accent);
        font-size: 13px;
        margin-top: 10px;
      }

      .content-wrapper ::slotted(*) {
        background: none;
        color: var(--tb-ui-dark-accent);
        font-size: 13px;
        margin-top: 10px;
      }

      .content-wrapper ::slotted(.selected) {
        background-color: var(--tb-ui-dark-accent);
        color: white !important;
      }

      h3 {
        color: var(--tb-secondary-text-color);
        display: block;
        font-size: 14px;
        font-weight: normal;
        margin: 0 0 5px;
        pointer-events: none;
      }
    </style>
  `;

  @property({type: String})
  name: string;

  @property({
    type: String,
    notify: true,
    observer: '_selectedIdChanged',
  })
  selectedId: string;

  override attached() {
    this.async(function () {
      this.getEffectiveChildren().forEach(
        function (node) {
          this.listen(node, 'tap', '_selectTarget');
        }.bind(this)
      );
    });
  }

  _selectTarget(e) {
    this.selectedId = e.currentTarget.id;
  }

  _selectedIdChanged() {
    var selected = this.queryEffectiveChildren('#' + this.selectedId);
    if (!selected) {
      return;
    }
    this.getEffectiveChildren().forEach(function (node) {
      (node as HTMLElement).classList.remove('selected');
    });
    (selected as HTMLElement).classList.add('selected');
  }
}
