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
// Uses `async` pipe.
import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatMenuModule} from '@angular/material/menu';
import {MatSelectModule} from '@angular/material/select';
import {MatTabsModule} from '@angular/material/tabs';
import {MatToolbarModule} from '@angular/material/toolbar';
import {CoreModule} from '../core/core_module';
import {SettingsModule} from '../settings/settings_module';
import {DarkModeToggleComponent} from './dark_mode_toggle_component';
import {DarkModeToggleContainer} from './dark_mode_toggle_container';
import {HeaderComponent} from './header_component';
import {PluginSelectorComponent} from './plugin_selector_component';
import {PluginSelectorContainer} from './plugin_selector_container';
import {ReloadContainer} from './reload_container';

@NgModule({
  declarations: [
    DarkModeToggleComponent,
    DarkModeToggleContainer,
    HeaderComponent,
    PluginSelectorComponent,
    PluginSelectorContainer,
    ReloadContainer,
  ],
  exports: [
    DarkModeToggleContainer,
    HeaderComponent,
    PluginSelectorContainer,
    ReloadContainer,
  ],
  providers: [],
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatToolbarModule,
    MatSelectModule,
    MatMenuModule,
    CommonModule,
    CoreModule,
    SettingsModule,
  ],
})
export class HeaderModule {}
