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

import {Component} from '@angular/core';
import {TestBed} from '@angular/core/testing';

import {DirtyUpdatesRegistryModule} from './dirty_updates_registry_module';

@Component({
  selector: 'experiments',
  template: 'List of experiment',
})
class Experiments {}

describe('dirty_updates_registry_module', () => {
  let registry: DirtyUpdatesRegistryModule;

  beforeEach(async () => {
    function getDirtyExperiments() {
      return ['a', 'b', 'cd'];
    }

    await TestBed.configureTestingModule({
      imports: [
        DirtyUpdatesRegistryModule.registerDirtyUpdates(getDirtyExperiments),
      ],
      declarations: [Experiments],
    }).compileComponents();

    registry = TestBed.inject<DirtyUpdatesRegistryModule>(
      DirtyUpdatesRegistryModule
    );
  });

  describe('getDirtyUpdates', () => {
    it('returns unsaved updates if any', () => {
      const dirtyUpdates = registry.getDirtyUpdates();
      expect(dirtyUpdates).toEqual({experimentIds: ['a', 'b', 'cd']});
    });
  });
});
