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
import '../../../components/polymer/irons_and_papers';
import {LegacyElementMixin} from '../../../components/polymer/legacy_element_mixin';

/**
 * A frontend that directs users to upgrade to the new version of the profile
 * plugin, now distributed separately from TensorBoard.
 */
@customElement('tf-profile-redirect-dashboard')
class TfProfileRedirectDashboard extends LegacyElementMixin(PolymerElement) {
  static readonly template = html`
    <div class="message">
      <h3>The profile plugin has moved.</h3>
      <p>
        Please install the new version of the profile plugin from PyPI by
        running the following command from the machine running TensorBoard:
      </p>
      <textarea
        id="commandTextarea"
        readonly=""
        rows="1"
        on-blur="_removeCopiedMessage"
      >
[[_installCommand]]</textarea
      >
      <div id="copyContainer">
        <span id="copiedMessage"></span>
        <paper-button raised="" on-tap="_copyInstallCommand"
          >Copy to clipboard</paper-button
        >
      </div>
    </div>

    <style>
      :host {
        display: flex;
      }

      .message {
        margin: 80px auto 0 auto;
        max-width: 540px;
      }
      #commandTextarea {
        margin-top: 1ex;
        padding: 1ex 1em;
        resize: vertical;
        width: 100%;
      }
      #copyContainer {
        display: flex;
      }
      #copiedMessage {
        align-self: center;
        flex-grow: 1;
        font-style: italic;
        padding-right: 1em;
        text-align: right;
      }
    </style>
  `;
  @property({type: String})
  _installCommand: string = 'pip install -U tensorboard-plugin-profile';

  async _copyInstallCommand() {
    const doCopy = async () => {
      const textarea = this.$.commandTextarea as HTMLTextAreaElement;
      textarea.select();
      try {
        await navigator.clipboard.writeText(this._installCommand);
      } catch (error) {
        // Fallback approach.
        if (!document.execCommand('copy')) {
          return Promise.reject();
        }
      }
    };
    const copiedMessageElement = this.$.copiedMessage as HTMLSpanElement;
    try {
      await doCopy();
      copiedMessageElement.innerText = 'Copied.';
    } catch (e) {
      copiedMessageElement.innerText = 'Failed to copy to clipboard.';
    }
  }
  _removeCopiedMessage() {
    const copiedMessageElement = this.$.copiedMessage as HTMLSpanElement;
    copiedMessageElement.innerText = '';
  }
}
