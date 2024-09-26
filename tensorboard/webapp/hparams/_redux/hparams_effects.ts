/* Copyright 2023 The TensorFlow Authors. All Rights Reserved.

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
import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {Store} from '@ngrx/store';
import {merge, Observable, of, throwError} from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  filter,
  map,
  switchMap,
  throttleTime,
  withLatestFrom,
} from 'rxjs/operators';

import {navigated} from '../../app_routing/actions';
import {
  getActiveRoute,
  getExperimentIdsFromRoute,
} from '../../app_routing/store/app_routing_selectors';
import {State} from '../../app_state';
import * as coreActions from '../../core/actions';
import {HttpErrorResponse} from '../../webapp_data_source/tb_http_client';

import {RouteKind} from '../../app_routing/types';
import {HparamSpec, SessionGroup} from '../types';
import * as hparamsActions from './hparams_actions';
import {HparamsDataSource} from './hparams_data_source';
import {getNumDashboardHparamsToLoad} from './hparams_selectors';

/**
 * Effects for fetching the hparams data from the backend.
 */
@Injectable()
export class HparamsEffects {
  constructor(
    private readonly actions$: Actions,
    private readonly store: Store<State>,
    private readonly dataSource: HparamsDataSource
  ) {
    this.navigated$ = this.actions$.pipe(
      ofType(navigated),
      withLatestFrom(this.store.select(getExperimentIdsFromRoute)),
      filter(([, experimentIds]) => Boolean(experimentIds)),
      map(([, experimentIds]) => experimentIds as string[]),
      distinctUntilChanged((prev, cur) => prev.join('') === cur.join(''))
    );
    this.loadHparamsOnReload$ = this.actions$.pipe(
      ofType(
        coreActions.reload,
        coreActions.manualReload,
        hparamsActions.loadAllDashboardHparams
      ),
      withLatestFrom(this.store.select(getExperimentIdsFromRoute)),
      filter(([, experimentIds]) => Boolean(experimentIds)),
      map(([, experimentIds]) => experimentIds as string[])
    );
    this.loadHparamsData$ = createEffect(() => {
      return merge(this.navigated$, this.loadHparamsOnReload$).pipe(
        withLatestFrom(
          this.store.select(getActiveRoute),
          this.store.select(getNumDashboardHparamsToLoad)
        ),
        filter(
          ([, activeRoute]) =>
            activeRoute?.routeKind === RouteKind.EXPERIMENT ||
            activeRoute?.routeKind === RouteKind.COMPARE_EXPERIMENT
        ),
        throttleTime(10),
        switchMap(([experimentIds, , numHparamsToLoad]) =>
          this.loadHparamsForExperiments(experimentIds, numHparamsToLoad)
        ),
        map((resp) => hparamsActions.hparamsFetchSessionGroupsSucceeded(resp))
      );
    });
  }

  private readonly navigated$: Observable<string[]>;

  private readonly loadHparamsOnReload$: Observable<string[]>;

  /** @export */
  loadHparamsData$;

  private loadHparamsForExperiments(
    experimentIds: string[],
    hparamsLimit: number
  ): Observable<{
    hparamSpecs: HparamSpec[];
    sessionGroups: SessionGroup[];
  }> {
    return this.dataSource
      .fetchExperimentInfo(experimentIds, hparamsLimit)
      .pipe(
        switchMap((hparamSpecs) => {
          return this.dataSource
            .fetchSessionGroups(experimentIds, hparamSpecs)
            .pipe(
              catchError((error) => {
                // HParam plugin return 400 when there are no hparams
                // for an experiment.
                if (
                  error instanceof HttpErrorResponse &&
                  error.status === 400
                ) {
                  return of([] as SessionGroup[]);
                }
                return throwError(() => error);
              }),
              map((sessionGroups) => ({hparamSpecs, sessionGroups}))
            );
        })
      );
  }
}
