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
import {LegacyElementMixin} from '../../../components/polymer/legacy_element_mixin';
import {Backend} from '../tf_hparams_backend/tf-hparams-backend';
import '../tf_hparams_query_pane/tf-hparams-query-pane';
import '../tf_hparams_sessions_pane/tf-hparams-sessions-pane';
import '../tf_hparams_utils/hparams-split-layout';

/**
 * The entry point into the hparams plugin frontend.
 * A container for two sub-elements:
 * 1. The query-pane encapsulated by the tf-hparams-query-pane element. This
 * element issues queries to the backend to get a list of session groups. It has
 * controls to allow the user to specify filters and sorting options in the
 * issued-query. The actual filtering and sorting is done by the backend.
 * 2. The session-pane encapsulated by the tf-hparams-session-pane element. This
 * element displays multiple tabs--each providing a "view" of the list of
 * session groups. Example of views are a table-view and a parallel-coordinate
 * view.
 *
 * TODO(erez): Add aggregation of repeated trials.
 */
@customElement('tf-hparams-main')
class TfHparamsMain extends LegacyElementMixin(PolymerElement) {
  static readonly template = html`
    <hparams-split-layout>
      <div slot="content" class="sidebar">
        <tf-hparams-query-pane
          id="query-pane"
          backend="[[backend]]"
          experiment-name="[[experimentName]]"
          configuration="{{_configuration}}"
          session-groups="{{_sessionGroups}}"
          data-loaded-with-non-empty-hparams="{{_dataLoadedWithNonEmptyHparams}}"
          data-loaded-with-empty-hparams="{{_dataLoadedWithEmptyHparams}}"
        >
        </tf-hparams-query-pane>
      </div>
      <div slot="content" class="center">
        <template is="dom-if" if="[[_dataLoadedWithEmptyHparams]]">
          <div class="no-data-warning">
            <h3>No hparams data was found.</h3>
            <p>Probable causes:</p>
            <ul>
              <li>You haven’t written any hparams data to your event files.</li>
              <li>
                Event files are still being loaded (try reloading this page).
              </li>
              <li>TensorBoard can’t find your event files.</li>
            </ul>

            <p>
              If you’re new to using TensorBoard, and want to find out how to
              add data and set up your event files, check out the
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

        <template is="dom-if" if="[[_dataLoadedWithNonEmptyHparams]]">
          <tf-hparams-sessions-pane
            id="sessions-pane"
            backend="[[backend]]"
            help-url="[[helpUrl]]"
            bug-report-url="[[bugReportUrl]]"
            experiment-name="[[experimentName]]"
            configuration="[[_configuration]]"
            session-groups="[[_sessionGroups]]"
          >
          </tf-hparams-sessions-pane>
        </template>
      </div>
    </hparams-split-layout>
    <style>
      hparams-split-layout {
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

      a {
        color: var(--tb-link);
      }

      a:visited {
        color: var(--tb-link-visited);
      }
    </style>
  `;
  // An object for making HParams API requests to the backend.
  @property({type: Object})
  backend: Backend;
  // The experimentName to pass to the 'GetExperiment' API call.
  @property({type: String})
  experimentName: string;
  // The URL to use for the help button.
  @property({type: String})
  helpUrl: string;
  // The URL to use for the bug-report button.
  @property({type: String})
  bugReportUrl: string;
  @property({type: Object})
  _configuration: object;
  @property({type: Array})
  _sessionGroups: unknown[];
  @property({type: Boolean})
  _dataLoadedWithNonEmptyHparams: boolean;
  @property({type: Boolean})
  _dataLoadedWithEmptyHparams: boolean;
  // This can be called to refresh the plugin.
  reload() {
    (this.$['query-pane'] as any).reload();
  }
}
