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
import {createSelector, StoreModule} from '@ngrx/store';
import {
  PersistableSettings,
  PersistentSettingsConfigModule,
} from '../persistent_settings';
import {reducers} from './_redux/settings_reducers';
import {
  getPageSize,
  getReloadEnabled,
  getReloadPeriodInMs,
} from './_redux/settings_selectors';
import {SETTINGS_FEATURE_KEY, State} from './_redux/settings_types';
import {SettingsModule as ViewModule} from './_views/settings_module';

export function createAutoReloadSettingSelector() {
  return createSelector(getReloadEnabled, (autoReload) => {
    return {autoReload};
  });
}

export function createAutoReloadPeriodInMsSelector() {
  return createSelector(getReloadPeriodInMs, (autoReloadPeriodInMs) => {
    return {autoReloadPeriodInMs};
  });
}

export function createPageSizeSelector() {
  return createSelector(getPageSize, (pageSize) => {
    return {pageSize};
  });
}

@NgModule({
  exports: [ViewModule],
  imports: [
    StoreModule.forFeature(SETTINGS_FEATURE_KEY, reducers),
    PersistentSettingsConfigModule.defineGlobalSetting<
      State,
      PersistableSettings
    >(createAutoReloadSettingSelector),
    PersistentSettingsConfigModule.defineGlobalSetting<
      State,
      PersistableSettings
    >(createAutoReloadPeriodInMsSelector),
    PersistentSettingsConfigModule.defineGlobalSetting<
      State,
      PersistableSettings
    >(createPageSizeSelector),
  ],
})
export class SettingsModule {}
