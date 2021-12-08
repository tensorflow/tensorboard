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

import {ScrollingModule} from '@angular/cdk/scrolling';
import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {DebugTensorValueModule} from '../debug_tensor_value/debug_tensor_value_module';
import {GraphExecutionsComponent} from './graph_executions_component';
import {GraphExecutionsContainer} from './graph_executions_container';

@NgModule({
  declarations: [GraphExecutionsComponent, GraphExecutionsContainer],
  imports: [CommonModule, DebugTensorValueModule, ScrollingModule],
  exports: [GraphExecutionsContainer],
})
export class GraphExecutionsModule {}
