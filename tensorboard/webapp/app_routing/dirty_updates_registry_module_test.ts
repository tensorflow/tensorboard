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
import {DirtyUpdatesRegistryModule} from './dirty_updates_registry_module';
import {DirtyUpdates} from './types';

describe('dirty_updates_registry_module test', () => {
  async function createRegistryModule(
    dirtyUpdatesSelectors: Selector<any, DirtyUpdates>[]
  ): Promise<DirtyUpdatesRegistryModule<any>> {
    const imports = dirtyUpdatesSelectors.map((selector) =>
      DirtyUpdatesRegistryModule.registerDirtyUpdates(() => selector)
    );
    await TestBed.configureTestingModule({
      imports,
      providers: [DirtyUpdatesRegistryModule],
    }).compileComponents();
    return TestBed.inject(DirtyUpdatesRegistryModule);
  }

  describe('#getDirtyUpdatesSelectors', () => {
    it('returns selectors for getting the dirty updates', async () => {
      const getUpdatesInExpList = createSelector(
        (s) => s,
        (state: any) => {
          return {
            experimentIds: ['otter', 'penguine'],
          };
        }
      );
      const registryModule = await createRegistryModule([getUpdatesInExpList]);
      const selectors = registryModule.getDirtyUpdatesSelectors();
      expect(selectors).toEqual([getUpdatesInExpList]);
    });
  });
});
