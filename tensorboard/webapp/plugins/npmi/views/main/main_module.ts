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
import {FormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatIconModule} from '@angular/material/icon';
import {RunsSelectorModule} from '../../../../runs/views/runs_selector/runs_selector_module';
import {AnnotationsListModule} from '../annotations_list/annotations_list_module';
import {DataSelectionModule} from './../data_selection/data_selection_module';
import {SelectedAnnotationsModule} from './../selected_annotations/selected_annotations_module';
import {ViolinFiltersModule} from './../violin_filters/violin_filters_module';
import {MainComponent} from './main_component';
import {MainContainer} from './main_container';

@NgModule({
  declarations: [MainComponent, MainContainer],
  imports: [
    CommonModule,
    FormsModule,
    MatCheckboxModule,
    MatIconModule,
    RunsSelectorModule,
    DataSelectionModule,
    MatButtonModule,
    ViolinFiltersModule,
    AnnotationsListModule,
    SelectedAnnotationsModule,
  ],
  exports: [MainContainer],
})
export class MainModule {}
