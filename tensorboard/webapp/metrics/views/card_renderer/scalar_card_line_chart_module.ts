/* Copyright 2023 The TensorFlow Authors. All Rights Reserved.

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
import {CardFobModule} from '../../../widgets/card_fob/card_fob_module';
import {LineChartModule as LineChartV2Module} from '../../../widgets/line_chart_v2/line_chart_module';
import {ScalarCardLineChartComponent} from './scalar_card_line_chart_component';
import {ScalarCardLineChartContainer} from './scalar_card_line_chart_container';
import {ScalarCardFobController} from './scalar_card_fob_controller';

@NgModule({
  declarations: [
    ScalarCardLineChartContainer,
    ScalarCardLineChartComponent,
    ScalarCardFobController,
  ],
  // TO-DO(@brendahuang b/288573332): Remove ScalarCardFobController from exports when replacing line chart with ScalarCardLineChart for ScalarCard
  exports: [ScalarCardLineChartContainer, ScalarCardFobController],
  imports: [CardFobModule, CommonModule, LineChartV2Module],
})
export class ScalarCardLineChartModule {}
