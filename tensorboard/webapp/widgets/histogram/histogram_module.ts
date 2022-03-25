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
import {IntersectionObserverModule} from '../intersection_observer/intersection_observer_module';
import {LinkedTimeFobModule} from '../linked_time_fob/linked_time_fob_module';
import {ResizeDetectorModule} from '../resize_detector_module';
import {HistogramComponent} from './histogram_component';
import {HistogramLinkedTimeFobController} from './histogram_linked_time_fob_controller';

@NgModule({
  declarations: [HistogramComponent, HistogramLinkedTimeFobController],
  exports: [HistogramComponent],
  imports: [
    CommonModule,
    ResizeDetectorModule,
    IntersectionObserverModule,
    LinkedTimeFobModule,
  ],
})
export class HistogramModule {}
