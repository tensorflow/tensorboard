/* Copyright 2019 The TensorFlow Authors. All Rights Reserved.

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
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatLegacyButtonModule} from '@angular/material/legacy-button';
import {MatLegacyCheckboxModule} from '@angular/material/legacy-checkbox';
import {MatLegacyDialogModule} from '@angular/material/legacy-dialog';
import {MatIconModule} from '@angular/material/icon';
import {MatLegacyInputModule} from '@angular/material/legacy-input';
import {SettingsPolymerInteropContainer} from './polymer_interop_container';
import {SettingsButtonComponent} from './settings_button_component';
import {SettingsButtonContainer} from './settings_button_container';
import {SettingsDialogComponent} from './settings_dialog_component';
import {SettingsDialogContainer} from './settings_dialog_container';

@NgModule({
  declarations: [
    SettingsButtonComponent,
    SettingsButtonContainer,
    SettingsDialogComponent,
    SettingsDialogContainer,
    SettingsPolymerInteropContainer,
  ],
  exports: [
    SettingsButtonComponent,
    SettingsButtonContainer,
    SettingsDialogContainer,
    SettingsPolymerInteropContainer,
  ],
  entryComponents: [SettingsDialogContainer],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatLegacyButtonModule,
    MatLegacyCheckboxModule,
    MatLegacyDialogModule,
    MatIconModule,
    MatLegacyInputModule,
  ],
})
export class SettingsModule {}
