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
 * A frontend that directs users to install the Learning Interoperability Plugin
 * (LIT) instead of the What-If Tools, since the latter is no longer maintained.
 */
@customElement('tf-wit-redirect-dashboard')
class TfWITRedirectDashboard extends LegacyElementMixin(PolymerElement) {
  static readonly template = html`
    <div class="message">
      <h3>The What-If Tool is no longer supported.</h3>
      <p>
        The
        <a href="https://pair-code.github.io/lit/"
          >Learning Interpretability Tool (LIT)</a
        >
        is an actively maintained alternative. Please follow the instructions
        <a href="https://pair-code.github.io/lit/setup/">here</a> to install and
        use this tool.
      </p>
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
    </div>
  `;
}
