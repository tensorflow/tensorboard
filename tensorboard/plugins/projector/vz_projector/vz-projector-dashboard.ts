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

@customElement('vz-projector-dashboard')
class VzProjectorDashboard extends PolymerElement {
  static readonly template = html`
    <template is="dom-if" if="[[dataNotFound]]">
      <div style="max-width: 540px; margin: 0 auto; padding: 80px 0 0">
        <h3>No checkpoint was found.</h3>
        <p>Probable causes:</p>
        <ul>
          <li>
            No checkpoint has been saved yet. Please refresh the page
            periodically.
          </li>

          <li>
            You are not saving any checkpoint. To save your model, create a
            <a
              href="https://www.tensorflow.org/api_docs/python/tf/compat/v1/train/Saver"
              ><code>tf.train.Saver</code></a
            >
            and save your model periodically by calling
            <code>saver.save(session, LOG_DIR/model.ckpt, step)</code>.
          </li>
        </ul>

        <p>
          If you’re new to using TensorBoard, and want to find out how to add
          data and set up your event files, check out the
          <a
            href="https://github.com/tensorflow/tensorboard/blob/master/README.md"
            >README</a
          >
          and perhaps the
          <a
            href="https://www.tensorflow.org/get_started/summaries_and_tensorboard"
            >TensorBoard tutorial</a
          >.
        </p>

        <p>
          If you think TensorBoard is configured properly, please see
          <a
            href="https://github.com/tensorflow/tensorboard/blob/master/README.md#my-tensorboard-isnt-showing-any-data-whats-wrong"
            >the section of the README devoted to missing data problems</a
          >
          and consider filing an issue on GitHub.
        </p>
      </div>
    </template>
    <template is="dom-if" if="[[!dataNotFound]]">
      <vz-projector
        id="projector"
        route-prefix="[[_routePrefix]]"
        serving-mode="server"
        page-view-logging=""
        event-logging=""
      ></vz-projector>
    </template>
  `;
  @property({type: Boolean})
  dataNotFound: boolean;

  @property({type: String})
  _routePrefix: string = '.';

  @property({type: Boolean})
  _initialized: boolean;

  reload() {
    // Do not reload the embedding projector. Reloading could take a long time.
  }

  connectedCallback() {
    super.connectedCallback();

    if (this._initialized) {
      return;
    }
    let xhr = new XMLHttpRequest();
    xhr.open('GET', this._routePrefix + '/runs');
    xhr.onload = () => {
      // Set this to true so we only initialize once.
      this._initialized = true;
      let runs = JSON.parse(xhr.responseText) as string[];
      this.set('dataNotFound', runs.length === 0);
    };
    xhr.onerror = () => {
      this.set('dataNotFound', false);
    };
    xhr.send();
  }
}
