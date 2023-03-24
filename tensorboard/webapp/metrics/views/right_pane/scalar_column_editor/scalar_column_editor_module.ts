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
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatIconModule} from '@angular/material/icon';
import {MatTabsModule} from '@angular/material/tabs';
import {MatButtonModule} from '@angular/material/button';
import {ScalarColumnEditorComponent} from './scalar_column_editor_component';
import {ScalarColumnEditorContainer} from './scalar_column_editor_container';
import {DataTableHeaderModule} from '../../../../widgets/data_table/data_table_header_module';

@NgModule({
  declarations: [ScalarColumnEditorComponent, ScalarColumnEditorContainer],
  exports: [ScalarColumnEditorContainer],
  imports: [
    CommonModule,
    DataTableHeaderModule,
    MatCheckboxModule,
    MatTabsModule,
    MatIconModule,
    MatButtonModule,
  ],
})
export class ScalarColumnEditorModule {}
