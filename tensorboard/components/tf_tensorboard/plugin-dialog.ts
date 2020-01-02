/* Copyright 2019 The TensorFlow Authors. All Rights Reserved.

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
import {PaperDialogElement} from '@polymer/paper-dialog';

@customElement('tf-plugin-dialog')
class TfPluginDialog extends PolymerElement {
  static readonly template = html`
    <!-- We use a custom backdrop to avoid occluding the TensorBoard navbar. -->
    <template is="dom-if" if="[[_open]]">
      <div id="dashboard-backdrop"></div>
    </template>
    <paper-dialog
      id="dialog"
      modal=""
      opened="{{_open}}"
      with-backdrop="[[_useNativeBackdrop]]"
    >
      <h2 id="dialog-title">[[_title]]</h2>
      <div class="custom-message">[[_customMessage]]</div>
    </paper-dialog>
    <style>
      /** We rely on a separate \`_hidden\` property instead of directly making use
          of the \`_open\` attribute because this CSS specification may strangely
          affect other elements throughout TensorBoard. See #899. */
      #dashboard-backdrop {
        background: rgba(0, 0, 0, 0.6);
        width: 100%;
        height: 100%;
      }

      #dialog-title {
        padding-bottom: 15px;
      }

      .custom-message {
        margin-top: 0;
        margin-bottom: 15px;
      }
    </style>
  `;
  @property({
    type: String,
  })
  _title: string | null = null;

  @property({
    type: String,
  })
  _customMessage: string | null = null;
  @property({
    type: Boolean,
  })
  _open: boolean = false;

  @property({
    type: Boolean,
    readOnly: true,
  })
  _useNativeBackdrop: boolean = false;

  openNoTensorFlowDialog() {
    this.openDialog(
      'This plugin is disabled without TensorFlow',
      'To enable this plugin in TensorBoard, install TensorFlow with ' +
        '"pip install tensorflow" or equivalent.'
    );
  }

  openOldTensorFlowDialog(version: string) {
    this.openDialog(
      'This plugin is disabled without TensorFlow ' + version,
      'To enable this plugin in TensorBoard, install TensorFlow ' +
        version +
        ' or greater with "pip install tensorflow" or equivalent.'
    );
  }

  openDialog(title: string, message: string) {
    this.set('_title', title);
    this.set('_customMessage', message);
    (this.$.dialog as PaperDialogElement).open();
  }
  closeDialog() {
    (this.$.dialog as PaperDialogElement).close();
  }

  @computed('_open')
  get _hidden(): boolean {
    return !this._open;
  }
}
