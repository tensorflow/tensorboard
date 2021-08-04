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

import {EXPS_WITH_DIRTY_UPDATES_TOKEN} from './dirty_updates_registry_types';
import {DirtyUpdates} from './types';

@NgModule()
export class DirtyUpdatesRegistryModule {
  private readonly dirtyUpdates: DirtyUpdates | null = null;

  constructor(
    @Optional() @Inject(EXPS_WITH_DIRTY_UPDATES_TOKEN) eidsList: string[][]
  ) {
    if (!eidsList) {
      return;
    }
    const experimentIds: string[] = [];
    for (const eids of eidsList) {
      for (const eid of eids) {
        experimentIds.push(eid);
      }
    }
    this.dirtyUpdates = {experimentIds: experimentIds};
  }

  /**
   * Returns dirty updates if any.
   */
  getDirtyUpdates(): DirtyUpdates | null {
    return this.dirtyUpdates;
  }

  /**
   * An NgModule that registers dirty (unsaved) updates to experiments.
   *
   * Example:
   *
   * function getDirtyExperiments() : string[] {
   *   const experimentIds : string[] = [];
   *   ...
   *   return experimentIds;
   * }
   *
   * @NgModule({
   *   imports: [
   *     DirtyUpdatesRegistryModule.registerDirtyUpdates(getDirtyExperiments),
   *   ],
   *   declarations: [ExperimentsView]
   * })
   */
  static registerDirtyUpdates(
    dirtyUpdatesConfigProvider: () => string[]
  ): ModuleWithProviders<DirtyUpdatesRegistryModule> {
    return {
      ngModule: DirtyUpdatesRegistryModule,
      providers: [
        {
          provide: EXPS_WITH_DIRTY_UPDATES_TOKEN,
          multi: true,
          useFactory: dirtyUpdatesConfigProvider,
        },
      ],
    };
  }
}
