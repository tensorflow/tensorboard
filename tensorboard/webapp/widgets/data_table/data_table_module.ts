/* Copyright 2022 The TensorFlow Authors. All Rights Reserved.

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
import {MatButtonModule} from '@angular/material/button';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {DataTableComponent} from './data_table_component';
import {HeaderCellComponent} from './header_cell_component';
import {DataTableHeaderModule} from './data_table_header_module';
import {ContentCellComponent} from './content_cell_component';
import {ContentRowComponent} from './content_row_component';
import {ColumnSelectorModule} from './column_selector_module';
import {FilterDialogModule} from './filter_dialog_module';
import {ContextMenuModule} from './context_menu_module';

@NgModule({
  declarations: [
    ContentCellComponent,
    ContentRowComponent,
    DataTableComponent,
    HeaderCellComponent,
  ],
  exports: [
    ContentCellComponent,
    ContentRowComponent,
    DataTableComponent,
    HeaderCellComponent,
  ],
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    DataTableHeaderModule,
    ColumnSelectorModule,
    FilterDialogModule,
    ContextMenuModule,
  ],
})
export class DataTableModule {}
