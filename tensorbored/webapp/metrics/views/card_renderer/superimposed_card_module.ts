/* Copyright 2024 The TensorFlow Authors. All Rights Reserved.

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
import {DragDropModule} from '@angular/cdk/drag-drop';
import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatMenuModule} from '@angular/material/menu';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';

import {ExperimentAliasModule} from '../../../widgets/experiment_alias/experiment_alias_module';
import {IntersectionObserverModule} from '../../../widgets/intersection_observer/intersection_observer_module';
import {LineChartModule} from '../../../widgets/line_chart_v2/line_chart_module';
import {PersistResizeModule} from '../../../widgets/persist_resize_module';
import {TruncatedPathModule} from '../../../widgets/text/truncated_path_module';

import {ScalarCardDataTableModule} from './scalar_card_data_table_module';
import {ScalarCardLineChartModule} from './scalar_card_line_chart_module';
import {SuperimposedCardComponent} from './superimposed_card_component';
import {SuperimposedCardContainer} from './superimposed_card_container';

@NgModule({
  declarations: [SuperimposedCardComponent, SuperimposedCardContainer],
  exports: [SuperimposedCardContainer],
  imports: [
    CommonModule,
    DragDropModule,
    ExperimentAliasModule,
    IntersectionObserverModule,
    LineChartModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    PersistResizeModule,
    ScalarCardDataTableModule,
    ScalarCardLineChartModule,
    TruncatedPathModule,
  ],
})
export class SuperimposedCardModule {}
