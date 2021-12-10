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
  DirtyUpdatesSelector,
  DIRTY_UPDATES_TOKEN,
} from './dirty_updates_registry_types';

@NgModule()
export class DirtyUpdatesRegistryModule<State> {
  constructor(
    @Optional()
    @Inject(DIRTY_UPDATES_TOKEN)
    private readonly dirtyUpdatesSelectorFactories: Array<
      DirtyUpdatesSelector<State>
    > | null
  ) {}

  /**
   * Returns Ngrx selectors for getting dirty updates.
   */
  getDirtyUpdatesSelectors(): DirtyUpdatesSelector<State>[] {
    return this.dirtyUpdatesSelectorFactories ?? [];
  }

  /**
   * Registers a selector for dirty (unsaved) updates to experiments.
   *
   * Example usage:
   *
   * function getDirtyUpdatesSelector() {
   *   return createSelector(getDirtyExperimentIds, (experimentIds) => {
   *     return {experimentIds: experimentIds}
   *   });
   * }
   *
   * @NgModule({
   *   imports: [
   *     DirtyUpdatesRegistryModule.registerDirtyUpdates<
   *       State
   *     >(getDirtyUpdatesSelector),
   *     ),
   *   ],
   * })
   * export class MyModule {}
   */
  static registerDirtyUpdates<State>(
    dirtyUpdateSelectorFactory: () => DirtyUpdatesSelector<State>
  ): ModuleWithProviders<DirtyUpdatesRegistryModule<any>> {
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
