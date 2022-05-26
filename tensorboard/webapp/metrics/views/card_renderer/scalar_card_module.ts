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
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatMenuModule} from '@angular/material/menu';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {DataTableModule} from '../../../widgets/data_table/data_table_module';
import {ExperimentAliasModule} from '../../../widgets/experiment_alias/experiment_alias_module';
import {IntersectionObserverModule} from '../../../widgets/intersection_observer/intersection_observer_module';
import {LineChartModule as LineChartV2Module} from '../../../widgets/line_chart_v2/line_chart_module';
import {LinkedTimeFobModule} from '../../../widgets/linked_time_fob/linked_time_fob_module';
import {ResizeDetectorModule} from '../../../widgets/resize_detector_module';
import {TruncatedPathModule} from '../../../widgets/text/truncated_path_module';
import {DataDownloadModule} from './data_download_module';
import {ScalarCardComponent} from './scalar_card_component';
import {ScalarCardContainer} from './scalar_card_container';
import {ScalarCardLinkedTimeFobController} from './scalar_card_linked_time_fob_controller';
import {VisSelectedTimeWarningModule} from './vis_selected_time_warning_module';

@NgModule({
  declarations: [
    ScalarCardContainer,
    ScalarCardComponent,
    ScalarCardLinkedTimeFobController,
  ],
  exports: [ScalarCardContainer],
  imports: [
    CommonModule,
    DataDownloadModule,
    DataTableModule,
    ExperimentAliasModule,
    IntersectionObserverModule,
    LineChartV2Module,
    LinkedTimeFobModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    ResizeDetectorModule,
    TruncatedPathModule,
    VisSelectedTimeWarningModule,
  ],
})
export class ScalarCardModule {}
