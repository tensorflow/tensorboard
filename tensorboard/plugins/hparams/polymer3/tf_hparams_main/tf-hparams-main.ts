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
import { DO_NOT_SUBMIT } from "../tf-hparams-query-pane/tf-hparams-query-pane.html";
import { DO_NOT_SUBMIT } from "../tf-hparams-sessions-pane/tf-hparams-sessions-pane.html";
import { DO_NOT_SUBMIT } from "../tf-imports/vaadin-split-layout.html";
import { DO_NOT_SUBMIT } from "../tf-imports/lodash.html";
import { DO_NOT_SUBMIT } from "../tf-imports/polymer.html";
import { DO_NOT_SUBMIT } from "../tf-hparams-query-pane/tf-hparams-query-pane.html";
import { DO_NOT_SUBMIT } from "../tf-hparams-sessions-pane/tf-hparams-sessions-pane.html";
import { DO_NOT_SUBMIT } from "../tf-imports/vaadin-split-layout.html";
import { DO_NOT_SUBMIT } from "../tf-imports/lodash.html";
'use strict';
@customElement("tf-hparams-main")
class TfHparamsMain extends PolymerElement {
    static readonly template = html `<vaadin-split-layout>
      <div class="sidebar" slot="sidebar">
        <tf-hparams-query-pane id="query-pane" backend="[[backend]]" experiment-name="[[experimentName]]" configuration="{{_configuration}}" session-groups="{{_sessionGroups}}" data-loaded-with-non-empty-hparams="{{_dataLoadedWithNonEmptyHparams}}" data-loaded-with-empty-hparams="{{_dataLoadedWithEmptyHparams}}">
        </tf-hparams-query-pane>
      </div>
      <div class="center" slot="center">
        <template is="dom-if" if="[[_dataLoadedWithEmptyHparams]]">
          <div class="no-data-warning">
            <h3>No hparams data was found.</h3>
            <p>Probable causes:</p>
            <ul>
              <li>
                You haven\u2019t written any hparams data to your event files.
              </li>
              <li>
                Event files are still being loaded (try reloading this page).
              </li>
              <li>TensorBoard can\u2019t find your event files.</li>
            </ul>

            <p>
              If you\u2019re new to using TensorBoard, and want to find out how to
              add data and set up your event files, check out the
              <a href="https://github.com/tensorflow/tensorboard/blob/master/README.md">README</a>
              and perhaps the
              <a href="https://www.tensorflow.org/get_started/summaries_and_tensorboard">TensorBoard tutorial</a>.
            </p>

            <p>
              If you think TensorBoard is configured properly, please see
              <a href="https://github.com/tensorflow/tensorboard/blob/master/README.md#my-tensorboard-isnt-showing-any-data-whats-wrong">the section of the README devoted to missing data problems</a>
              and consider filing an issue on GitHub.
            </p>
          </div>
        </template>

        <template is="dom-if" if="[[_dataLoadedWithNonEmptyHparams]]">
          <tf-hparams-sessions-pane id="sessions-pane" backend="[[backend]]" help-url="[[helpUrl]]" bug-report-url="[[bugReportUrl]]" experiment-name="[[experimentName]]" configuration="[[_configuration]]" session-groups="[[_sessionGroups]]">
          </tf-hparams-sessions-pane>
        </template>
      </div>
    </vaadin-split-layout>

    <style>
      vaadin-split-layout {
        width: 100%;
      }

      .sidebar {
        width: 20%;
        height: 100%;
        overflow: auto;
        flex-grow: 0;
        flex-shrink: 0;
        min-width: 10%;
      }

      .center {
        height: 100%;
        overflow-y: auto;
        flex-grow: 1;
        flex-shrink: 1;
        width: 80%;
      }

      :host {
        display: flex;
        flex-direction: row;
        height: 100%;
        width: 100%;
      }

      .no-data-warning {
        max-width: 540px;
        margin: 80px auto 0 auto;
      }
    </style>`;
    @property({ type: Object })
    backend: object;
    @property({ type: String })
    experimentName: string;
    @property({ type: String })
    helpUrl: string;
    @property({ type: String })
    bugReportUrl: string;
    @property({ type: Object })
    _configuration: object;
    @property({ type: Array })
    _sessionGroups: unknown[];
    @property({ type: Boolean })
    _dataLoadedWithNonEmptyHparams: boolean;
    @property({ type: Boolean })
    _dataLoadedWithEmptyHparams: boolean;
    // This can be called to refresh the plugin.
    reload() {
        this.$['query-pane'].reload();
    }
}
