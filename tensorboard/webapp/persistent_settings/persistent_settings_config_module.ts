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
import {
  Inject,
  InjectionToken,
  ModuleWithProviders,
  NgModule,
  Optional,
} from '@angular/core';
import {Selector} from '@ngrx/store';
import {PersistableSettings} from './_data_source/types';

const GLOBAL_PERSISTENT_SETTINGS_TOKEN = new InjectionToken(
  '[Persistent Settings] Global Settings'
);

export type SettingSelector = Selector<any, Partial<PersistableSettings>>;

@NgModule()
export class PersistentSettingsConfigModule {
  constructor(
    @Optional()
    @Inject(GLOBAL_PERSISTENT_SETTINGS_TOKEN)
    private readonly globalSettingSelectors: SettingSelector[] | null
  ) {}

  /**
   * Returns Ngrx selectors for getting global setting values.
   */
  getGlobalSettingSelectors(): SettingSelector[] {
    return this.globalSettingSelectors ?? [];
  }

  /**
   * Registers a global setting that is to be persisted when a store emits a
   * change. For per-experiment settings, please contact TensorBoard team
   * member.
   *
   * Example usage:
   *
   * @NgModule({
   *   imports: [
   *     PersistentSettingsConfigModule.defineGlobalSetting(
   *       createSelector(baseSelector, (value) => {
   *         return {scalarSmoothing: Number(value)};
   *       }),
   *     ),
   *   ],
   * })
   * export class MyModule {}
   */
  static defineGlobalSetting(
    selector: SettingSelector
  ): ModuleWithProviders<PersistentSettingsConfigModule> {
    return {
      ngModule: PersistentSettingsConfigModule,
      providers: [
        {
          provide: GLOBAL_PERSISTENT_SETTINGS_TOKEN,
          multi: true,
          useValue: selector,
        },
      ],
    };
  }
}
