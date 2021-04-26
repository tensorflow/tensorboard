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
import {Action, Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {alertReported} from '../../../alert/actions';

import {State} from '../../../app_state';
import {
  getCurrentRouteRunSelection,
  getExperimentIdsFromRoute,
} from '../../../selectors';
import {MAX_NUM_RUNS_TO_ENABLE_BY_DEFAULT} from '../../store/runs_types';
import {RunsTableColumn} from '../runs_table/types';
import {RunsSelectorComponent} from './runs_selector_component';
import {RunsSelectorContainer} from './runs_selector_container';

describe('runs selector test', () => {
  let store: MockStore<State>;
  let selectSpy: jasmine.Spy;
  let actualActions: Action[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule],
      providers: [provideMockStore()],
      declarations: [RunsSelectorContainer, RunsSelectorComponent],
      // Ignore implementation detail of runs-table; it has own test.
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    spyOn(store, 'dispatch').and.callFake((action: Action) => {
      actualActions.push(action);
    });
    actualActions = [];
    selectSpy = spyOn(store, 'select').and.callThrough();
  });

  describe('runs table', () => {
    it('renders no exp name when only one exp is being viewed', () => {
      store.overrideSelector(getExperimentIdsFromRoute, ['123']);
      const fixture = TestBed.createComponent(RunsSelectorContainer);
      fixture.detectChanges();

      const runsTable = fixture.debugElement.query(By.css('runs-table'))
        .componentInstance;
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

      const runsTable = fixture.debugElement.query(By.css('runs-table'))
        .componentInstance;
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

      const runsTable = fixture.debugElement.query(By.css('runs-table'))
        .componentInstance;
      expect(runsTable.columns).toEqual([
        RunsTableColumn.CHECKBOX,
        RunsTableColumn.RUN_NAME,
        RunsTableColumn.RUN_COLOR,
      ]);
    });
  });

  fdescribe('"too many runs" alert', () => {
    function createRunSelectionMap(runCount: number): Map<string, boolean> {
      const map = new Map<string, boolean>();
      for (let i = 0; i < runCount; i++) {
        map.set(`run${i}`, true);
      }
      return map;
    }

    const tooManyRunsAlertMessage = jasmine.stringMatching('exceeds');

    it('triggers when number of runs exceeds limit', () => {
      store.overrideSelector(getExperimentIdsFromRoute, ['123']);
      store.overrideSelector(
        getCurrentRouteRunSelection,
        createRunSelectionMap(MAX_NUM_RUNS_TO_ENABLE_BY_DEFAULT)
      );
      const fixture = TestBed.createComponent(RunsSelectorContainer);
      fixture.detectChanges();

      expect(actualActions).toEqual([]);

      // Change # of runs to 1 over limit.
      store.overrideSelector(
        getCurrentRouteRunSelection,
        createRunSelectionMap(MAX_NUM_RUNS_TO_ENABLE_BY_DEFAULT + 1)
      );
      store.refreshState();

      expect(actualActions).toEqual([
        alertReported({localizedMessage: tooManyRunsAlertMessage as any}),
      ]);
    });

    it('does not show when already shown', () => {
      store.overrideSelector(getExperimentIdsFromRoute, ['123']);
      store.overrideSelector(
        getCurrentRouteRunSelection,
        createRunSelectionMap(MAX_NUM_RUNS_TO_ENABLE_BY_DEFAULT + 1)
      );
      const fixture = TestBed.createComponent(RunsSelectorContainer);
      fixture.detectChanges();

      expect(actualActions).toEqual([
        alertReported({localizedMessage: tooManyRunsAlertMessage as any}),
      ]);

      store.overrideSelector(
        getCurrentRouteRunSelection,
        createRunSelectionMap(MAX_NUM_RUNS_TO_ENABLE_BY_DEFAULT + 2)
      );
      store.refreshState();

      expect(actualActions).toEqual([
        alertReported({localizedMessage: tooManyRunsAlertMessage as any}),
      ]);
    });

    it('re-shows after a new route with too many runs', () => {
      store.overrideSelector(getExperimentIdsFromRoute, ['123']);
      store.overrideSelector(
        getCurrentRouteRunSelection,
        createRunSelectionMap(MAX_NUM_RUNS_TO_ENABLE_BY_DEFAULT + 1)
      );
      const fixture = TestBed.createComponent(RunsSelectorContainer);
      fixture.detectChanges();

      expect(actualActions).toEqual([
        alertReported({localizedMessage: tooManyRunsAlertMessage as any}),
      ]);

      store.overrideSelector(getExperimentIdsFromRoute, ['456']);
      store.refreshState();

      expect(actualActions).toEqual([
        alertReported({localizedMessage: tooManyRunsAlertMessage as any}),
        alertReported({localizedMessage: tooManyRunsAlertMessage as any}),
      ]);
    });

    it('does not re-show after a new route with too few runs', () => {
      store.overrideSelector(getExperimentIdsFromRoute, ['123']);
      store.overrideSelector(
        getCurrentRouteRunSelection,
        createRunSelectionMap(MAX_NUM_RUNS_TO_ENABLE_BY_DEFAULT + 1)
      );
      const fixture = TestBed.createComponent(RunsSelectorContainer);
      fixture.detectChanges();

      expect(actualActions).toEqual([
        alertReported({localizedMessage: tooManyRunsAlertMessage as any}),
      ]);

      store.overrideSelector(getExperimentIdsFromRoute, ['456']);
      store.overrideSelector(
        getCurrentRouteRunSelection,
        createRunSelectionMap(MAX_NUM_RUNS_TO_ENABLE_BY_DEFAULT)
      );
      store.refreshState();

      expect(actualActions).toEqual([
        alertReported({localizedMessage: tooManyRunsAlertMessage as any}),
      ]);
    });
  });
});
