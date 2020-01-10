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
import {NgModule, InjectionToken} from '@angular/core';
import {StoreModule, StoreConfig} from '@ngrx/store';
import {EffectsModule} from '@ngrx/effects';

import {reducers} from './store';
import {CoreEffects} from './effects';
import {CORE_FEATURE_KEY, CoreState} from './store/core_types';
import {TBServerDataSourceModule} from '../webapp_data_source/tb_server_data_source_module';
import {TBServerDataSource} from '../webapp_data_source/tb_server_data_source';
import {buildInitialState} from './store/legacy_bootstrap';

export const CORE_FEATURE_CONFIG_TOKEN: InjectionToken<
  StoreConfig<CoreState>
> = new InjectionToken<StoreConfig<CoreState>>('Core Feature Config');

export function getConfig(
  webappDataSource: TBServerDataSource
): StoreConfig<CoreState> {
  return {
    initialState: buildInitialState(webappDataSource),
  };
}

@NgModule({
  imports: [
    TBServerDataSourceModule,
    StoreModule.forFeature(
      CORE_FEATURE_KEY,
      reducers,
      CORE_FEATURE_CONFIG_TOKEN
    ),
    EffectsModule.forFeature([CoreEffects]),
  ],
  providers: [
    {
      provide: CORE_FEATURE_CONFIG_TOKEN,
      deps: [TBServerDataSource],
      useFactory: getConfig,
    },
  ],
})
export class CoreModule {}
