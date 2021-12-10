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
import '../tf_hparams_parallel_coords_plot/tf-hparams-parallel-coords-plot';
import '../tf_hparams_scale_and_color_controls/tf-hparams-scale-and-color-controls';
import '../tf_hparams_session_group_details/tf-hparams-session-group-details';
import '../tf_hparams_session_group_values/tf-hparams-session-group-values';
import '../tf_hparams_utils/hparams-split-layout';

/**
 * There are 3 elements involved in the parallel coordinates visualization:
 *
 * 1. <tf-hparams-parallel-coords-plot>
 *   Renders the actual parallel coordinate plot. See the comments in the
 *   code for that element for more details.
 * 2. <tf-hparams-scale-and-color-controls>
 *   A control panel for configuring the behavior of the plot (e.g. scale
 *   of each axis, colormap, etc.)
 * 3. <tf-hparams-parallel-coords-view>
 *   The container element for the above 2 elements.
 */
@customElement('tf-hparams-parallel-coords-view')
class TfHparamsParallelCoordsView extends PolymerElement {
  static readonly template = html`
    <!-- Controls behavior of parallel coordinates plot
         outputs set options to the _options property.
      -->
    <hparams-split-layout orientation="vertical">
      <!-- The scale and color controls. -->
      <tf-hparams-scale-and-color-controls
        id="controls"
        slot="content"
        class="section"
        configuration="[[configuration]]"
        session-groups="[[sessionGroups]]"
        options="{{_options}}"
      >
      </tf-hparams-scale-and-color-controls>
      <!-- The actual parallel coordinates plot -->
      <tf-hparams-parallel-coords-plot
        id="plot"
        slot="content"
        class="section"
        session-groups="[[sessionGroups]]"
        selected-session-group="{{_selectedGroup}}"
        closest-session-group="{{_closestGroup}}"
        options="[[_options]]"
      >
      </tf-hparams-parallel-coords-plot>
      <tf-hparams-session-group-values
        id="values"
        slot="content"
        class="section"
        visible-schema="[[configuration.visibleSchema]]"
        session-group="[[_closestOrSelected(
                             _closestGroup, _selectedGroup)]]"
      >
      </tf-hparams-session-group-values>
      <tf-hparams-session-group-details
        id="details"
        slot="content"
        class="section"
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
      #values {
        height: 115px;
      }
      #details {
        flex-grow: 1;
        max-height: fit-content;
      }
    </style>
  `;
  // See the property descriptions in tf-hparams-query-pane.html
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
