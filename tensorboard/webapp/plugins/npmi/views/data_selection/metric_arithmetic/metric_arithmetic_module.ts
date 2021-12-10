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
import {MatChipsModule} from '@angular/material/chips';
import {MetricArithmeticComponent} from './metric_arithmetic_component';
import {MetricArithmeticContainer} from './metric_arithmetic_container';
import {MetricArithmeticElementModule} from './metric_arithmetic_element/metric_arithmetic_element_module';
import {MetricArithmeticOperatorModule} from './metric_arithmetic_operator/metric_arithmetic_operator_module';

@NgModule({
  declarations: [MetricArithmeticComponent, MetricArithmeticContainer],
  imports: [
    CommonModule,
    MatChipsModule,
    MetricArithmeticElementModule,
    MetricArithmeticOperatorModule,
  ],
  exports: [MetricArithmeticContainer],
})
export class MetricArithmeticModule {}
