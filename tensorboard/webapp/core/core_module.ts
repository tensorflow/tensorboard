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
import {NgModule} from '@angular/core';
import {EffectsModule} from '@ngrx/effects';
import {createSelector, StoreModule} from '@ngrx/store';
import {DeepLinkerInterface} from '../deeplink';
import {
  PersistableSettings,
  PersistentSettingsConfigModule,
} from '../persistent_settings';
import {TBServerDataSourceModule} from '../webapp_data_source/tb_server_data_source_module';
import {CoreEffects} from './effects';
import {State} from './state';
import {getSideBarWidthInPercent, reducers} from './store';
import {
  CORE_STORE_CONFIG_TOKEN,
  getConfig,
} from './store/core_initial_state_provider';
import {CORE_FEATURE_KEY} from './store/core_types';

export function getSideBarWidthSetting() {
  return createSelector<State, number, PersistableSettings>(
    getSideBarWidthInPercent,
    (sideBarWidthInPercent) => {
      return {sideBarWidthInPercent};
    }
  );
}

@NgModule({
  imports: [
    EffectsModule.forFeature([CoreEffects]),
    StoreModule.forFeature(CORE_FEATURE_KEY, reducers, CORE_STORE_CONFIG_TOKEN),
    TBServerDataSourceModule,
    PersistentSettingsConfigModule.defineGlobalSetting<
      State,
      PersistableSettings
    >(getSideBarWidthSetting),
  ],
  providers: [
    {
      provide: CORE_STORE_CONFIG_TOKEN,
      deps: [DeepLinkerInterface],
      useFactory: getConfig,
    },
  ],
})
export class CoreModule {}
