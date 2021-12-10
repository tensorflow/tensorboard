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
import {TestBed} from '@angular/core/testing';
import {createSelector, Selector} from '@ngrx/store';
import {PersistentSettingsConfigModule} from './persistent_settings_config_module';
import {PersistableSettings} from './_data_source/types';

describe('persisted_settings config_module test', () => {
  async function createConfigModule(
    settingSelectors: Selector<any, Partial<PersistableSettings>>[]
  ): Promise<PersistentSettingsConfigModule<any, PersistableSettings>> {
    const imports = settingSelectors.map((selector) =>
      PersistentSettingsConfigModule.defineGlobalSetting(() => selector)
    );
    await TestBed.configureTestingModule({
      imports,
      providers: [PersistentSettingsConfigModule],
    }).compileComponents();
    return TestBed.inject(PersistentSettingsConfigModule);
  }

  describe('#getGlobalSettingSelectors', () => {
    it('returns selectors for setting the global settings', async () => {
      const getScalarSmoothing = createSelector(
        (s) => s,
        (state: any) => {
          return {
            scalarSmoothing: 0.3,
          };
        }
      );
      const getIgnoreOutlier = createSelector(
        (s) => s,
        (state: any) => {
          return {
            ignoreOutliers: false,
          };
        }
      );
      const configModule = await createConfigModule([
        getScalarSmoothing,
        getIgnoreOutlier,
      ]);
      const selectors = configModule.getGlobalSettingSelectors();
      expect(selectors).toEqual([getScalarSmoothing, getIgnoreOutlier]);
    });
  });
});
