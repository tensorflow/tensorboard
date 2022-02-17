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

import {NgModule} from '@angular/core';
import {EffectsModule} from '@ngrx/effects';
import {createSelector, StoreModule} from '@ngrx/store';
import {
  PersistableSettings,
  PersistentSettingsConfigModule,
  ThemeValue,
} from '../persistent_settings';
import {TBFeatureFlagModule} from '../webapp_data_source/tb_feature_flag_module';
import {FeatureFlagEffects} from './effects/feature_flag_effects';
import {ForceSvgDataSourceModule} from './force_svg_data_source_module';
import {reducers} from './store/feature_flag_reducers';
import {getEnableDarkModeOverride} from './store/feature_flag_selectors';
import {
  FEATURE_FLAG_STORE_CONFIG_TOKEN,
  getConfig,
} from './store/feature_flag_store_config_provider';
import {FEATURE_FLAG_FEATURE_KEY, State} from './store/feature_flag_types';

export function getThemeSettingSelector() {
  return createSelector(getEnableDarkModeOverride, (darkModeOverride) => {
    if (darkModeOverride === null) {
      return {themeOverride: ThemeValue.BROWSER_DEFAULT};
    }
    return {
      themeOverride: darkModeOverride ? ThemeValue.DARK : ThemeValue.LIGHT,
    };
  });
}

@NgModule({
  imports: [
    ForceSvgDataSourceModule,
    TBFeatureFlagModule,
    StoreModule.forFeature(
      FEATURE_FLAG_FEATURE_KEY,
      reducers,
      FEATURE_FLAG_STORE_CONFIG_TOKEN
    ),
    EffectsModule.forFeature([FeatureFlagEffects]),
    PersistentSettingsConfigModule.defineGlobalSetting<
      State,
      PersistableSettings
    >(getThemeSettingSelector),
  ],
  providers: [
    {
      provide: FEATURE_FLAG_STORE_CONFIG_TOKEN,
      useFactory: getConfig,
    },
  ],
})
export class FeatureFlagModule {}
