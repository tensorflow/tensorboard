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
import {OverlayModule} from '@angular/cdk/overlay';
import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatMenuModule} from '@angular/material/menu';
import {LineChartAxisComponent} from './line_chart_axis_view';
import {LineChartGridView} from './line_chart_grid_view';
import {LineChartInteractiveViewComponent} from './line_chart_interactive_view';

/**
 * SubViewModule provides UI elements for a traditional line chart; axes, grid, and
 * line chart interaction layer. SubView is a rectangular region in a line chart that
 * provides certain functionality.
 */
@NgModule({
  declarations: [
    LineChartAxisComponent,
    LineChartInteractiveViewComponent,
    LineChartGridView,
  ],
  exports: [
    LineChartAxisComponent,
    LineChartInteractiveViewComponent,
    LineChartGridView,
  ],
  imports: [
    CommonModule,
    OverlayModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
  ],
})
export class SubViewModule {}
