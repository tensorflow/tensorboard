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
import '../tf_hparams_scale_and_color_controls/tf-hparams-scale-and-color-controls';
import '../tf_hparams_scatter_plot_matrix_plot/tf-hparams-scatter-plot-matrix-plot';
import '../tf_hparams_session_group_details/tf-hparams-session-group-details';
import '../tf_hparams_session_group_values/tf-hparams-session-group-values';
import '../tf_hparams_utils/hparams-split-layout';

/**
 * A D3-based implementation of a scatter plot matrix of the sessions
 * groups.
 *
 * For more details on a scatter plot matrix visualization see for example:
 * https://www.itl.nist.gov/div898/handbook/eda/section3/eda33qb.htm
 *
 * There are 3 elements involved in the scatter plot visualization:
 *
 * 1. <tf-hparams-scatter-plot-matrix-plot>
 *   Renders the actual scatter plot matrix
 * 2. <tf-hparams-scale-and-color-controls>
 *   A control panel for configuring the behavior of the plot (e.g. scale
 *   of each axis, colormap, etc.)
 * 3. <tf-hparams-scatter-plot-matrix-view>
 *   The container element for the above 2 elements.
 */
@customElement('tf-hparams-scatter-plot-matrix-view')
class TfHparamsScatterPlotMatrixView extends PolymerElement {
  static readonly template = html`
    <hparams-split-layout orientation="vertical">
      <!-- Controls behavior of the scatter plot matrix
             outputs the configured options to the _options property. -->
      <tf-hparams-scale-and-color-controls
        slot="content"
        class="section"
        id="controls"
        configuration="[[configuration]]"
        session-groups="[[sessionGroups]]"
        options="{{_options}}"
      >
      </tf-hparams-scale-and-color-controls>
      <!-- The actual scatter plot matrix -->
      <tf-hparams-scatter-plot-matrix-plot
        slot="content"
        class="section"
        id="plot"
        visible-schema="[[configuration.visibleSchema]]"
        session-groups="[[sessionGroups]]"
        selected-session-group="{{_selectedGroup}}"
        closest-session-group="{{_closestGroup}}"
        options="[[_options]]"
      >
      </tf-hparams-scatter-plot-matrix-plot>
      <tf-hparams-session-group-values
        slot="content"
        class="section"
        id="values"
        visible-schema="[[configuration.visibleSchema]]"
        session-group="[[_closestOrSelected(
                                 _closestGroup, _selectedGroup)]]"
      >
      </tf-hparams-session-group-values>
      <!-- Shows session group details for the clicked marker. -->
      <tf-hparams-session-group-details
        slot="content"
        class="section"
        id="details"
        backend="[[backend]]"
        experiment-name="[[experimentName]]"
        session-group="[[_selectedGroup]]"
        visible-schema="[[configuration.visibleSchema]]"
      >
      </tf-hparams-session-group-details>
    </hparams-split-layout>
    <style>
      .section {
        padding: 10px;
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
        height: 115px;
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
  // See the property descriptions in tf-hparams-query-pane
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
