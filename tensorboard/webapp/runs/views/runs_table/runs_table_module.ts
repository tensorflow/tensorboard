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
import {MatLegacyButtonModule} from '@angular/material/legacy-button';
import {MatLegacyCheckboxModule} from '@angular/material/legacy-checkbox';
import {MatLegacyDialogModule} from '@angular/material/legacy-dialog';
import {MatLegacyFormFieldModule} from '@angular/material/legacy-form-field';
import {MatIconModule} from '@angular/material/icon';
import {MatLegacyInputModule} from '@angular/material/legacy-input';
import {MatLegacyMenuModule} from '@angular/material/legacy-menu';
import {MatLegacyPaginatorModule} from '@angular/material/legacy-paginator';
import {MatLegacyProgressSpinnerModule} from '@angular/material/legacy-progress-spinner';
import {MatSortModule} from '@angular/material/sort';
import {MatLegacyTableModule} from '@angular/material/legacy-table';
import {ColorPickerModule} from 'ngx-color-picker';
import {AlertModule} from '../../../alert/alert_module';
import {DataTableModule} from '../../../widgets/data_table/data_table_module';
import {ExperimentAliasModule} from '../../../widgets/experiment_alias/experiment_alias_module';
import {FilterInputModule} from '../../../widgets/filter_input/filter_input_module';
import {RangeInputModule} from '../../../widgets/range_input/range_input_module';
import {RegexEditDialogComponent} from './regex_edit_dialog_component';
import {RegexEditDialogContainer} from './regex_edit_dialog_container';
import {RunsGroupMenuButtonComponent} from './runs_group_menu_button_component';
import {RunsGroupMenuButtonContainer} from './runs_group_menu_button_container';
import {RunsDataTable} from './runs_data_table';
import {RunsTableComponent} from './runs_table_component';
import {RunsTableContainer} from './runs_table_container';

@NgModule({
  imports: [
    ColorPickerModule,
    CommonModule,
    DataTableModule,
    ExperimentAliasModule,
    FilterInputModule,
    MatLegacyFormFieldModule,
    MatLegacyButtonModule,
    MatLegacyCheckboxModule,
    MatLegacyDialogModule,
    MatLegacyInputModule,
    MatIconModule,
    MatLegacyMenuModule,
    MatLegacyPaginatorModule,
    MatLegacyProgressSpinnerModule,
    MatSortModule,
    MatLegacyTableModule,
    RangeInputModule,
    AlertModule,
  ],
  exports: [RunsTableContainer],
  entryComponents: [RegexEditDialogContainer],
  declarations: [
    RegexEditDialogComponent,
    RegexEditDialogContainer,
    RunsDataTable,
    RunsGroupMenuButtonComponent,
    RunsGroupMenuButtonContainer,
    RunsTableComponent,
    RunsTableContainer,
  ],
})
export class RunsTableModule {}
