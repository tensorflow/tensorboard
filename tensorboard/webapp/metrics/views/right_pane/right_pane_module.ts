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
import {MatButtonModule} from '@angular/material/button';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatIconModule} from '@angular/material/icon';
import {MatSelectModule} from '@angular/material/select';
import {MatSliderModule} from '@angular/material/slider';
import {FeatureFlagModule} from '../../../feature_flag/feature_flag_module';
import {DropdownModule} from '../../../widgets/dropdown/dropdown_module';
import {RangeInputModule} from '../../../widgets/range_input/range_input_module';
import {RightPaneComponent} from './right_pane_component';
import {SettingsViewComponent} from './settings_view_component';
import {SettingsViewContainer} from './settings_view_container';
import {SavingPinsCheckboxComponent} from './saving_pins_checkbox_component';
import {SavingPinsDialogModule} from './saving_pins_dialog/saving_pins_dialog_module';

@NgModule({
  declarations: [
    RightPaneComponent,
    SettingsViewComponent,
    SettingsViewContainer,
    SavingPinsCheckboxComponent,
  ],
  exports: [RightPaneComponent],
  imports: [
    CommonModule,
    DropdownModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCheckboxModule,
    SavingPinsDialogModule,
    MatIconModule,
    MatSelectModule,
    MatSliderModule,
    FeatureFlagModule,
    RangeInputModule,
  ],
})
export class RightPaneModule {}
