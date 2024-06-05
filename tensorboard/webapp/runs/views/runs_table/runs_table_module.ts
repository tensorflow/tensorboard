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
/**
 * @fileoverview Module for rendering list of runs from experiments in a table.
 */

import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatDialogModule} from '@angular/material/dialog';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatMenuModule} from '@angular/material/menu';
import {MatChipsModule} from '@angular/material/chips';
import {MatPaginatorModule} from '@angular/material/paginator';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatSortModule} from '@angular/material/sort';
import {MatTableModule} from '@angular/material/table';
import {ColorPickerModule} from 'ngx-color-picker';
import {MatSelectModule} from '@angular/material/select';
import {AlertModule} from '../../../alert/alert_module';
import {DataTableModule} from '../../../widgets/data_table/data_table_module';
import {ExperimentAliasModule} from '../../../widgets/experiment_alias/experiment_alias_module';
import {FilterInputModule} from '../../../widgets/filter_input/filter_input_module';
import {FilterDialogModule} from '../../../widgets/data_table/filter_dialog_module';
import {RangeInputModule} from '../../../widgets/range_input/range_input_module';
import {RegexEditDialogComponent} from './regex_edit_dialog_component';
import {RegexEditDialogContainer} from './regex_edit_dialog_container';
import {FilterbarComponent} from './filterbar_component';
import {FilterbarContainer} from './filterbar_container';
import {RunsGroupMenuButtonComponent} from './runs_group_menu_button_component';
import {RunsGroupMenuButtonContainer} from './runs_group_menu_button_container';
import {RunsDataTable} from './runs_data_table';
import {RunsTableContainer} from './runs_table_container';
import {ReactiveFormsModule} from '@angular/forms';

@NgModule({
  imports: [
    ColorPickerModule,
    CommonModule,
    DataTableModule,
    ExperimentAliasModule,
    FilterInputModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatInputModule,
    FilterDialogModule,
    MatIconModule,
    MatMenuModule,
    MatChipsModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSortModule,
    MatTableModule,
    RangeInputModule,
    AlertModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  exports: [RunsTableContainer],
  declarations: [
    RegexEditDialogComponent,
    RegexEditDialogContainer,
    FilterbarComponent,
    FilterbarContainer,
    RunsDataTable,
    RunsGroupMenuButtonComponent,
    RunsGroupMenuButtonContainer,
    RunsTableContainer,
  ],
})
export class RunsTableModule {}
