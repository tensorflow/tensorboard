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
import {MatSnackBar, MatSnackBarModule} from '@angular/material/snack-bar';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';

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
  let snackBarOpenSpy: jasmine.Spy;
  let snackbar: MatSnackBar;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, MatSnackBarModule],
      providers: [provideMockStore()],
      declarations: [RunsSelectorContainer, RunsSelectorComponent],
      // Ignore implementation detail of runs-table; it has own test.
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    selectSpy = spyOn(store, 'select').and.callThrough();
    snackbar = TestBed.inject(MatSnackBar);
    snackBarOpenSpy = spyOn(snackbar, 'open');
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

  describe('"too many runs" alert', () => {
    function createRunSelectionMap(runCount: number): Map<string, boolean> {
      const map = new Map<string, boolean>();
      for (let i = 0; i < runCount; i++) {
        map.set(`run${i}`, true);
      }
      return map;
    }

    it('shows when there are too many runs', () => {
      store.overrideSelector(getExperimentIdsFromRoute, ['123']);
      store.overrideSelector(
        getCurrentRouteRunSelection,
        createRunSelectionMap(MAX_NUM_RUNS_TO_ENABLE_BY_DEFAULT)
      );
      const fixture = TestBed.createComponent(RunsSelectorContainer);
      fixture.detectChanges();

      expect(snackBarOpenSpy).not.toHaveBeenCalled();

      store.overrideSelector(
        getCurrentRouteRunSelection,
        createRunSelectionMap(MAX_NUM_RUNS_TO_ENABLE_BY_DEFAULT + 1)
      );
      store.refreshState();

      expect(snackBarOpenSpy).toHaveBeenCalledTimes(1);
    });

    it('does not show when there are too few runs', () => {
      store.overrideSelector(getExperimentIdsFromRoute, ['123']);
      store.overrideSelector(
        getCurrentRouteRunSelection,
        createRunSelectionMap(MAX_NUM_RUNS_TO_ENABLE_BY_DEFAULT)
      );
      const fixture = TestBed.createComponent(RunsSelectorContainer);
      fixture.detectChanges();

      expect(snackBarOpenSpy).not.toHaveBeenCalled();
    });

    it('does not show when already shown', () => {
      store.overrideSelector(getExperimentIdsFromRoute, ['123']);
      store.overrideSelector(
        getCurrentRouteRunSelection,
        createRunSelectionMap(MAX_NUM_RUNS_TO_ENABLE_BY_DEFAULT + 1)
      );
      const fixture = TestBed.createComponent(RunsSelectorContainer);
      fixture.detectChanges();

      expect(snackBarOpenSpy).toHaveBeenCalledTimes(1);

      store.overrideSelector(
        getCurrentRouteRunSelection,
        createRunSelectionMap(MAX_NUM_RUNS_TO_ENABLE_BY_DEFAULT + 2)
      );
      store.refreshState();

      expect(snackBarOpenSpy).toHaveBeenCalledTimes(1);
    });

    it('re-shows after a new route with too many runs', () => {
      store.overrideSelector(getExperimentIdsFromRoute, ['123']);
      store.overrideSelector(
        getCurrentRouteRunSelection,
        createRunSelectionMap(MAX_NUM_RUNS_TO_ENABLE_BY_DEFAULT + 1)
      );
      const fixture = TestBed.createComponent(RunsSelectorContainer);
      fixture.detectChanges();

      expect(snackBarOpenSpy).toHaveBeenCalledTimes(1);

      store.overrideSelector(getExperimentIdsFromRoute, ['456']);
      store.refreshState();

      expect(snackBarOpenSpy).toHaveBeenCalledTimes(2);
    });

    it('does not re-show after a new route with too few runs', () => {
      store.overrideSelector(getExperimentIdsFromRoute, ['123']);
      store.overrideSelector(
        getCurrentRouteRunSelection,
        createRunSelectionMap(MAX_NUM_RUNS_TO_ENABLE_BY_DEFAULT + 1)
      );
      const fixture = TestBed.createComponent(RunsSelectorContainer);
      fixture.detectChanges();

      expect(snackBarOpenSpy).toHaveBeenCalledTimes(1);

      store.overrideSelector(getExperimentIdsFromRoute, ['456']);
      store.overrideSelector(
        getCurrentRouteRunSelection,
        createRunSelectionMap(MAX_NUM_RUNS_TO_ENABLE_BY_DEFAULT)
      );
      store.refreshState();

      expect(snackBarOpenSpy).toHaveBeenCalledTimes(1);
    });
  });
});
