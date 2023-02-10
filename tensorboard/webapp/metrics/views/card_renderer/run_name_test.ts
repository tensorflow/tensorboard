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
import {TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {Store} from '@ngrx/store';
import {MockStore} from '@ngrx/store/testing';
import {State} from '../../../app_state';
import {buildRun} from '../../../runs/store/testing';
import {
  getExperimentIdForRunId,
  getExperimentIdToExperimentAliasMap,
  getRun,
} from '../../../selectors';
import {provideMockTbStore} from '../../../testing/utils';
import {ExperimentAliasModule} from '../../../widgets/experiment_alias/experiment_alias_module';
import {RunNameComponent} from './run_name_component';
import {RunNameContainer} from './run_name_container';

describe('card run name', () => {
  let store: MockStore<State>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, ExperimentAliasModule],
      declarations: [RunNameContainer, RunNameComponent],
      providers: [provideMockTbStore()],
    }).compileComponents();

    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    store.overrideSelector(getExperimentIdForRunId, 'eid');
    store.overrideSelector(getExperimentIdToExperimentAliasMap, {});
    store.overrideSelector(getRun, null);
  });

  afterEach(() => {
    store?.resetSelectors();
  });

  it('renders exp display name and run name', () => {
    store.overrideSelector(getExperimentIdForRunId, 'eid');
    store.overrideSelector(getExperimentIdToExperimentAliasMap, {
      eid: {aliasText: 'Cat', aliasNumber: 1},
    });
    store.overrideSelector(getRun, buildRun({id: 'rid', name: 'Meow'}));

    const fixture = TestBed.createComponent(RunNameContainer);
    fixture.componentInstance.runId = 'rid';
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toBe('1Cat/Meow');
  });

  it('renders only run name when there is no exp display name', () => {
    store.overrideSelector(getExperimentIdForRunId, 'eid');
    store.overrideSelector(getExperimentIdToExperimentAliasMap, {
      cat: {aliasText: 'Cat', aliasNumber: 1},
    });
    store.overrideSelector(getRun, buildRun({id: 'rid', name: 'Bark/woof'}));

    const fixture = TestBed.createComponent(RunNameContainer);
    fixture.componentInstance.runId = 'rid';
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toBe('Bark/woof');
  });

  it('renders "Unknown run" if the `runId` does not exist in store', () => {
    store.overrideSelector(getExperimentIdForRunId, null);
    store.overrideSelector(getExperimentIdToExperimentAliasMap, {
      cat: {aliasText: 'Cat', aliasNumber: 1},
    });
    store.overrideSelector(getRun, null);

    const fixture = TestBed.createComponent(RunNameContainer);
    fixture.componentInstance.runId = 'rid';
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toBe('rid');
  });
});
