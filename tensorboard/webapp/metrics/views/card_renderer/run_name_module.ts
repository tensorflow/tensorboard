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
import {ExperimentAliasModule} from '../../../widgets/experiment_alias/experiment_alias_module';
import {RunNameComponent} from './run_name_component';
import {RunNameContainer} from './run_name_container';

@NgModule({
  declarations: [RunNameContainer, RunNameComponent],
  exports: [RunNameContainer],
  imports: [CommonModule, ExperimentAliasModule],
})
export class RunNameModule {}
