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
import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {LayoutModule} from '../../core';
import {CustomizationModule} from '../../customization/customization_module';
import {RunsSelectorModule} from '../../runs/views/runs_selector/runs_selector_module';
import {MainViewModule} from './main_view/main_view_module';
import {MetricsDashboardContainer} from './metrics_container';
import {RightPaneModule} from './right_pane/right_pane_module';

@NgModule({
  declarations: [MetricsDashboardContainer],
  exports: [MetricsDashboardContainer],
  imports: [
    CommonModule,
    CustomizationModule,
    LayoutModule,
    MainViewModule,
    MatIconModule,
    RightPaneModule,
    RunsSelectorModule,
  ],
})
export class MetricsViewsModule {}
