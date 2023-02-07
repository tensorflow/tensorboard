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
import {NO_ERRORS_SCHEMA} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {Store} from '@ngrx/store';
import {MockStore} from '@ngrx/store/testing';
import {State} from '../../../app_state';
import {getExperimentIdsFromRoute} from '../../../selectors';
import {provideMockTbStore} from '../../../testing/utils';
import {RunsTableColumn} from '../runs_table/types';
import {RunsSelectorComponent} from './runs_selector_component';
import {RunsSelectorContainer} from './runs_selector_container';

describe('runs selector test', () => {
  let store: MockStore<State>;
  let selectSpy: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule],
      providers: [provideMockTbStore()],
      declarations: [RunsSelectorContainer, RunsSelectorComponent],
      // Ignore implementation detail of runs-table; it has own test.
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    selectSpy = spyOn(store, 'select').and.callThrough();
  });

  afterEach(() => {
    store?.resetSelectors();
  });

  describe('runs table', () => {
    it('renders no exp name when only one exp is being viewed', () => {
      store.overrideSelector(getExperimentIdsFromRoute, ['123']);
      const fixture = TestBed.createComponent(RunsSelectorContainer);
      fixture.detectChanges();

      const runsTable = fixture.debugElement.query(
        By.css('runs-table')
      ).componentInstance;
      expect(runsTable.columns).toEqual([
        RunsTableColumn.CHECKBOX,
        RunsTableColumn.RUN_NAME,
        RunsTableColumn.RUN_COLOR,
      ]);
    });

    it('renders exp name when more than one exp being viewed', () => {
      store.overrideSelector(getExperimentIdsFromRoute, ['123', '456']);
      const fixture = TestBed.createComponent(RunsSelectorContainer);
      fixture.detectChanges();

      const runsTable = fixture.debugElement.query(
        By.css('runs-table')
      ).componentInstance;
      expect(runsTable.columns).toEqual([
        RunsTableColumn.CHECKBOX,
        RunsTableColumn.RUN_NAME,
        RunsTableColumn.EXPERIMENT_NAME,
        RunsTableColumn.RUN_COLOR,
      ]);
    });

    it('does not render exp name when getExperimentIds return null', () => {
      store.overrideSelector(getExperimentIdsFromRoute, null);
      const fixture = TestBed.createComponent(RunsSelectorContainer);
      fixture.detectChanges();

      const runsTable = fixture.debugElement.query(
        By.css('runs-table')
      ).componentInstance;
      expect(runsTable.columns).toEqual([
        RunsTableColumn.CHECKBOX,
        RunsTableColumn.RUN_NAME,
        RunsTableColumn.RUN_COLOR,
      ]);
    });
  });
});
