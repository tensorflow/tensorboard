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

import {LocalStorageModule} from '../util/local_storage';
import {PersistentSettingsConfigModule} from './persistent_settings_config_module';
import {
  PersistentSettingsDataSource,
  PersistentSettingsDataSourceImpl,
} from './_data_source/persistent_settings_data_source';
import {PersistentSettingsEffects} from './_redux/persistent_settings_effects';

@NgModule({
  imports: [
    EffectsModule.forFeature([PersistentSettingsEffects]),
    LocalStorageModule,
  ],
  providers: [
    PersistentSettingsConfigModule,
    {
      provide: PersistentSettingsDataSource,
      useClass: PersistentSettingsDataSourceImpl,
    },
  ],
})
export class PersistentSettingsModule {}
