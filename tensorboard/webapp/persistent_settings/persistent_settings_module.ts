/* Copyright 2021 The TensorFlow Authors. All Rights Reserved.

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
import {NgModule} from '@angular/core';
import {EffectsModule} from '@ngrx/effects';
import {StoreModule} from '@ngrx/store';
import {PersistentSettingsConfigModule} from './persistent_settings_config_module';
import {PersistentSettingsDataSourceModule} from './_data_source/persistent_settings_data_source_module';
import {PersistentSettingsEffects} from './_redux/persistent_settings_effects';

import {reducers} from './_redux/persistent_settings_reducers';
import {PERSISTENT_SETTINGS_FEATURE_KEY} from './_redux/persistent_settings_types';

/**
 * Persistent Settings module is responsible for persisting and loading settings
 * from other features.
 *
 * For settings of the app, like "is auto reload enabled?", please refer to
 * "settings" feature instead. `persistent_settings` does not have Redux state
 * to remember the setting but only helps with persisting settings from other
 * features.
 */
@NgModule({
  imports: [
    StoreModule.forFeature(PERSISTENT_SETTINGS_FEATURE_KEY, reducers),
    EffectsModule.forFeature([PersistentSettingsEffects]),
    PersistentSettingsDataSourceModule,
  ],
  providers: [PersistentSettingsConfigModule],
})
export class PersistentSettingsModule {}
