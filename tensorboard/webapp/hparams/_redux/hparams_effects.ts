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
import {Observable, of, throwError, merge} from 'rxjs';
import {
  catchError,
  filter,
  map,
  switchMap,
  withLatestFrom,
  throttleTime,
  distinctUntilChanged,
} from 'rxjs/operators';

import {navigated} from '../../app_routing/actions';
import {
  getActiveRoute,
  getExperimentIdsFromRoute,
} from '../../app_routing/store/app_routing_selectors';
import {State} from '../../app_state';
import * as coreActions from '../../core/actions';
import * as runsActions from '../../runs/actions/runs_actions';
import {HttpErrorResponse} from '../../webapp_data_source/tb_http_client';

import * as hparamsActions from './hparams_actions';
import {HparamsDataSource} from './hparams_data_source';
import {HparamAndMetricSpec, SessionGroup} from '../types';
import {getEnableHparamsInTimeSeries} from '../../feature_flag/store/feature_flag_selectors';
import {RouteKind} from '../../app_routing/types';

/**
 * Effects for fetching the hparams data from the backend.
 */
@Injectable()
export class HparamsEffects {
  constructor(
    private readonly actions$: Actions,
    private readonly store: Store<State>,
    private readonly dataSource: HparamsDataSource
  ) {}

  private readonly runTableShown$: Observable<string[]> = this.actions$.pipe(
    ofType(runsActions.runTableShown),
    map(({experimentIds}) => experimentIds),
    distinctUntilChanged((prev, cur) => prev.join('') === cur.join(''))
  );

  private readonly navigated$: Observable<string[]> = this.actions$.pipe(
    ofType(navigated),
    withLatestFrom(this.store.select(getExperimentIdsFromRoute)),
    filter(([, experimentIds]) => Boolean(experimentIds)),
    map(([, experimentIds]) => experimentIds as string[]),
    distinctUntilChanged((prev, cur) => prev.join('') === cur.join(''))
  );

  private readonly loadHparamsOnNavigationOrReload$: Observable<string[]> =
    this.actions$.pipe(
      ofType(coreActions.reload, coreActions.manualReload),
      withLatestFrom(this.store.select(getExperimentIdsFromRoute)),
      filter(([, experimentIds]) => Boolean(experimentIds)),
      map(([, experimentIds]) => experimentIds as string[])
    );

  /** @export */
  loadHparamsData$ = createEffect(() => {
    return merge(
      this.navigated$,
      this.runTableShown$,
      this.loadHparamsOnNavigationOrReload$
    ).pipe(
      withLatestFrom(
        this.store.select(getEnableHparamsInTimeSeries),
        this.store.select(getActiveRoute)
      ),
      filter(
        ([, getEnableHparamsInTimeSeries]) => getEnableHparamsInTimeSeries
      ),
      filter(
        ([, , activeRoute]) =>
          activeRoute?.routeKind === RouteKind.EXPERIMENT ||
          activeRoute?.routeKind === RouteKind.COMPARE_EXPERIMENT
      ),
      throttleTime(10),
      switchMap(([experimentIds]) =>
        this.loadHparamsForExperiments(experimentIds)
      ),
      map((resp) => hparamsActions.hparamsFetchSessionGroupsSucceeded(resp))
    );
  });

  private loadHparamsForExperiments(experimentIds: string[]): Observable<{
    hparamsAndMetricsSpecs: HparamAndMetricSpec;
    sessionGroups: SessionGroup[];
  }> {
    return this.dataSource.fetchExperimentInfo(experimentIds).pipe(
      switchMap((hparamsAndMetricsSpecs) => {
        return this.dataSource
          .fetchSessionGroups(experimentIds, hparamsAndMetricsSpecs)
          .pipe(
            catchError((error) => {
              // HParam plugin return 400 when there are no hparams
              // for an experiment.
              if (error instanceof HttpErrorResponse && error.status === 400) {
                return of([] as SessionGroup[]);
              }
              return throwError(() => error);
            }),
            map((sessionGroups) => ({hparamsAndMetricsSpecs, sessionGroups}))
          );
      })
    );
  }
}
