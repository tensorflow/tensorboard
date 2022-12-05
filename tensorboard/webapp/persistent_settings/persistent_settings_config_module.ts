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
import {Inject, ModuleWithProviders, NgModule, Optional} from '@angular/core';
import {
  GLOBAL_PERSISTENT_SETTINGS_TOKEN,
  SettingSelector,
} from './persistent_settings_config_types';

@NgModule()
export class PersistentSettingsConfigModule<State, Settings extends {}> {
  private readonly globalSettingSelectors: SettingSelector<State, Settings>[] =
    [];

  constructor(
    @Optional()
    @Inject(GLOBAL_PERSISTENT_SETTINGS_TOKEN)
    globalSettingSelectorFactories: Array<
      () => SettingSelector<State, Settings>
    > | null
  ) {
    if (!globalSettingSelectorFactories) {
      return;
    }
    this.globalSettingSelectors = globalSettingSelectorFactories.map(
      (factory) => factory()
    );
  }

  /**
   * Returns Ngrx selectors for getting global setting values.
   */
  getGlobalSettingSelectors(): SettingSelector<State, Settings>[] {
    return this.globalSettingSelectors ?? [];
  }

  /**
   * Registers a global setting that is to be persisted when a store emits a
   * change. For per-experiment settings, please contact TensorBoard team
   * member.
   *
   * Do note that if you specify the Settings type to be something other than
   * PeristableSettings, you will need to supply a custom Converter for the
   * DataSource. Please refer to `SettingsConverter` in
   * PersistentSettingsDataSource.
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
  static defineGlobalSetting<State, Settings extends {}>(
    selectorFactory: () => SettingSelector<State, Settings>
  ): ModuleWithProviders<PersistentSettingsConfigModule<State, Settings>> {
    return {
      ngModule: PersistentSettingsConfigModule,
      providers: [
        {
          provide: GLOBAL_PERSISTENT_SETTINGS_TOKEN,
          multi: true,
          useValue: selectorFactory,
        },
      ],
    };
  }
}
