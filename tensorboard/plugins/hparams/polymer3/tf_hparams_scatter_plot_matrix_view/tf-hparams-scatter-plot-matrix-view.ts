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
import {DO_NOT_SUBMIT} from '../tf-imports/polymer.html';
import {DO_NOT_SUBMIT} from '../tf-hparams-scale-and-color-controls/tf-hparams-scale-and-color-controls.html';
import {DO_NOT_SUBMIT} from '../tf-hparams-scatter-plot-matrix-plot/tf-hparams-scatter-plot-matrix-plot.html';
import {DO_NOT_SUBMIT} from '../tf-hparams-session-group-details/tf-hparams-session-group-details.html';
import {DO_NOT_SUBMIT} from '../tf-hparams-session-group-values/tf-hparams-session-group-values.html';
import {DO_NOT_SUBMIT} from '../tf-imports/vaadin-split-layout.html';
import {DO_NOT_SUBMIT} from '../tf-imports/polymer.html';
import {DO_NOT_SUBMIT} from '../tf-hparams-scale-and-color-controls/tf-hparams-scale-and-color-controls.html';
import {DO_NOT_SUBMIT} from '../tf-hparams-scatter-plot-matrix-plot/tf-hparams-scatter-plot-matrix-plot.html';
import {DO_NOT_SUBMIT} from '../tf-hparams-session-group-details/tf-hparams-session-group-details.html';
import {DO_NOT_SUBMIT} from '../tf-hparams-session-group-values/tf-hparams-session-group-values.html';
import {DO_NOT_SUBMIT} from '../tf-imports/vaadin-split-layout.html';
'use strict';
@customElement('tf-hparams-scatter-plot-matrix-view')
class TfHparamsScatterPlotMatrixView extends PolymerElement {
  static readonly template = html`
    <div class="pane">
      <vaadin-split-layout vertical="">
        <!-- Controls behavior of the scatter plot matrix
             outputs the configured options to the _options property. -->
        <tf-hparams-scale-and-color-controls
          class="section"
          id="controls"
          configuration="[[configuration]]"
          session-groups="[[sessionGroups]]"
          options="{{_options}}"
        >
        </tf-hparams-scale-and-color-controls>
        <vaadin-split-layout vertical="">
          <!-- The actual scatter plot matrix -->
          <tf-hparams-scatter-plot-matrix-plot
            class="section"
            id="plot"
            visible-schema="[[configuration.visibleSchema]]"
            session-groups="[[sessionGroups]]"
            selected-session-group="{{_selectedGroup}}"
            closest-session-group="{{_closestGroup}}"
            options="[[_options]]"
          >
          </tf-hparams-scatter-plot-matrix-plot>
          <vaadin-split-layout vertical="">
            <tf-hparams-session-group-values
              class="section"
              id="values"
              visible-schema="[[configuration.visibleSchema]]"
              session-group="[[_closestOrSelected(
                                 _closestGroup, _selectedGroup)]]"
            >
            </tf-hparams-session-group-values>
            <!-- Shows session group details for the clicked marker. -->
            <tf-hparams-session-group-details
              class="section"
              id="details"
              backend="[[backend]]"
              experiment-name="[[experimentName]]"
              session-group="[[_selectedGroup]]"
              visible-schema="[[configuration.visibleSchema]]"
            >
            </tf-hparams-session-group-details>
          </vaadin-split-layout>
        </vaadin-split-layout>
      </vaadin-split-layout>
    </div>
    <style>
      .pane {
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      .section {
        margin: 10px;
      }
      #controls {
        flex-grow: 0;
        flex-shrink: 0;
        flex-basis: auto;
        height: auto;
        overflow-y: auto;
        max-height: fit-content;
      }
      #plot {
        flex-grow: 1;
        flex-shrink: 1;
        flex-basis: auto;
        height: auto;
        overflow-y: auto;
        max-height: fit-content;
      }
      #values {
        flex-grow: 0;
        flex-shrink: 0;
        flex-basis: auto;
        height: 95px;
        overflow-y: auto;
        max-height: fit-content;
      }
      #details {
        flex-grow: 0;
        flex-shrink: 1;
        flex-basis: auto;
        height: auto;
        overflow-y: auto;
        max-height: fit-content;
      }
      vaadin-split-layout {
        height: 100%;
      }
    </style>
  `;
  @property({type: Object})
  backend: object;
  @property({type: String})
  experimentName: string;
  @property({type: Object})
  configuration: object;
  @property({type: Array})
  sessionGroups: unknown[];
  _closestOrSelected(closestSessionGroup, selectedSessionGroup) {
    if (closestSessionGroup !== null) {
      return closestSessionGroup;
    }
    return selectedSessionGroup;
  }
}
