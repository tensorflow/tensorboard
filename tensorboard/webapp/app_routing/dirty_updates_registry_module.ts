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
  DIRTY_UPDATES_TOKEN,
  DirtyUpdatesSelector,
} from './dirty_updates_registry_types';

@NgModule()
export class DirtyUpdatesRegistryModule<State, Updates> {
  private readonly dirtyUpdatesSelectors: DirtyUpdatesSelector<
    State,
    Updates
  >[] = [];

  constructor(
    @Optional()
    @Inject(DIRTY_UPDATES_TOKEN)
    dirtyUpdatesSelectorFactories: Array<
      DirtyUpdatesSelector<State, Updates>
    > | null
  ) {
    if (!dirtyUpdatesSelectorFactories) {
      return;
    }
    this.dirtyUpdatesSelectors = dirtyUpdatesSelectorFactories;
  }

  /**
   * Returns Ngrx selectors for getting dirty updates.
   */
  getDirtyUpdatesSelectors(): DirtyUpdatesSelector<State, Updates>[] {
    return this.dirtyUpdatesSelectors ?? [];
  }

  /**
   * Registers a selector for dirty (unsaved) updates to experiments.
   *
   * Example usage:
   *
   * @NgModule({
   *   imports: [
   *     DirtyUpdatesRegistryModule.registerDirtyUpdates(
   *       createSelector(baseSelector, (values) => {
   *         return {experimentIds: values};
   *       }),
   *     ),
   *   ],
   * })
   * export class MyModule {}
   */
  static registerDirtyUpdates<State, Updates>(
    dirtyUpdateSelectorFactory: DirtyUpdatesSelector<State, Updates>
  ): ModuleWithProviders<DirtyUpdatesRegistryModule<any, {}>> {
    return {
      ngModule: DirtyUpdatesRegistryModule,
      providers: [
        {
          provide: DIRTY_UPDATES_TOKEN,
          multi: true,
          useFactory: dirtyUpdateSelectorFactory,
        },
      ],
    };
  }
}
