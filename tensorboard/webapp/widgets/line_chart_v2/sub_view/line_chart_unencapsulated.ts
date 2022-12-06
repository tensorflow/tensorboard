/* Copyright 2022 The TensorFlow Authors. All Rights Reserved.

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
import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';

@Component({
  selector: 'line-chart-unencapsulated',
  template: '',
  styles: [
    /**
     * Why this weird hack?
     * The prospective fob area is absolutely positioned over the XAxis.
     * This prevents hover events from reaching the XAxis.
     * The .extent-edit-button should appear when the XAxis is hovered.
     */
    `
      .line-chart:has(.horizontal-prospective-area:hover) {
        .x-axis {
          .extent-edit-button {
            visibility: visible;
          }
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // This prevents the CSS generated from being namespaced thus allowing CSS
  // to reach into the line_chart_component and card_fob_controller_component
  encapsulation: ViewEncapsulation.None,
})
export class LineChartUnencapsulated {}
