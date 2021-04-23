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
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import {MatSnackBar} from '@angular/material/snack-bar';
import {Store} from '@ngrx/store';
import {Subject} from 'rxjs';
import {
  distinctUntilChanged,
  filter,
  map,
  switchMap,
  take,
  takeUntil,
} from 'rxjs/operators';

import {State} from '../../../app_state';
import {
  getCurrentRouteRunSelection,
  getExperimentIdsFromRoute,
} from '../../../selectors';
import {MAX_NUM_RUNS_TO_ENABLE_BY_DEFAULT} from '../../store/runs_types';
import {RunsTableColumn} from '../runs_table/types';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';

@Component({
  selector: 'runs-selector',
  template: `
    <runs-selector-component
      [experimentIds]="experimentIds$ | async"
      [columns]="columns$ | async"
      [showHparamsAndMetrics]="showHparamsAndMetrics"
    ></runs-selector-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RunsSelectorContainer implements OnInit, OnDestroy {
  @Input() showHparamsAndMetrics?: boolean;

  readonly experimentIds$ = this.store.select(getExperimentIdsFromRoute).pipe(
    map((experimentIdsOrNull) => experimentIdsOrNull ?? []),
    distinctUntilChanged((a, b) => {
      return a.every((experimentId, index) => b[index] === experimentId);
    })
  );
  readonly columns$ = this.store.select(getExperimentIdsFromRoute).pipe(
    map((ids) => {
      return [
        RunsTableColumn.CHECKBOX,
        RunsTableColumn.RUN_NAME,
        ids && ids.length > 1 ? RunsTableColumn.EXPERIMENT_NAME : null,
        RunsTableColumn.RUN_COLOR,
      ].filter((col) => col !== null) as RunsTableColumn[];
    })
  );
  private readonly ngUnsubscribe = new Subject();

  constructor(
    private readonly store: Store<State>,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    // Notify the user that new runs may not be selected. Avoid showing it too
    // often, since it would be annoying to see the alert re-appear on every
    // auto-reload (assuming a new run per reload).
    const runsExceedsLimitForRoute$ = this.experimentIds$.pipe(
      takeUntil(this.ngUnsubscribe),
      switchMap(() => {
        // Returns an Observable that emits once and completes when the current
        // route's run count goes over the limit.
        return this.store.select(getCurrentRouteRunSelection).pipe(
          distinctUntilChanged((a, b) => {
            return a === b;
          }),
          filter((runSelectionMap: Map<string, boolean> | null) => {
            if (!runSelectionMap) {
              return false;
            }
            return runSelectionMap.size > MAX_NUM_RUNS_TO_ENABLE_BY_DEFAULT;
          }),
          take(1)
        );
      })
    );
    runsExceedsLimitForRoute$.subscribe(() => {
      const text =
        `The number of runs is over ` +
        `${MAX_NUM_RUNS_TO_ENABLE_BY_DEFAULT}. New runs are unselected ` +
        `for performance reasons.`;
      this.snackBar.open(text, 'DISMISS', {
        duration: 5000,
        horizontalPosition: 'start',
        verticalPosition: 'bottom',
      });
    });
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }
}
