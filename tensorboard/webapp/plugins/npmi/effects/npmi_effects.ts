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
import {Injectable} from '@angular/core';
import {Store} from '@ngrx/store';
import {Actions, createEffect, ofType} from '@ngrx/effects';

import {merge, forkJoin, Observable} from 'rxjs';
import {
  filter,
  map,
  switchMap,
  mergeMap,
  tap,
  withLatestFrom,
} from 'rxjs/operators';

import {NpmiHttpServerDataSource} from '../data_source/npmi_data_source';
import {
  State,
  AnnotationListing,
  MetricListing,
  ValueListing,
  DataLoadState,
} from './../store/npmi_types';
import {
  getAnnotationsLoaded,
  getMetricsAndValuesLoaded,
} from './../store/npmi_selectors';
import {
  npmiLoaded,
  npmiAnnotationsRequested,
  npmiAnnotationsLoaded,
  npmiMetricsAndValuesRequested,
  npmiMetricsAndValuesLoaded,
} from './../actions';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';
/** @typehack */ import * as _typeHackNgrxStore from '@ngrx/store/src/models';
/** @typehack */ import * as _typeHackNgrxEffects from '@ngrx/effects/effects';

@Injectable()
export class NpmiEffects {
  /**
   * Observable that loads:
   * - runs list
   * - number of executions
   * - execution digest
   * - execution details
   */
  /** @export */
  readonly loadData$: Observable<{}>;

  private loadAnnotations() {
    return this.actions$.pipe(
      ofType(npmiLoaded),
      withLatestFrom(this.store.select(getAnnotationsLoaded)),
      filter(([, {state}]) => state !== DataLoadState.LOADING),
      tap(() => this.store.dispatch(npmiAnnotationsRequested())),
      mergeMap(() => {
        return this.dataSource.fetchAnnotations().pipe(
          tap((annotations: AnnotationListing) => {
            this.store.dispatch(
              npmiAnnotationsLoaded({annotations: annotations})
            );
          }),
          map(() => void null)
        );
      })
    );
  }

  private loadMetricsAndValues() {
    return this.actions$.pipe(
      ofType(npmiLoaded),
      withLatestFrom(this.store.select(getMetricsAndValuesLoaded)),
      filter(([, {state}]) => state !== DataLoadState.LOADING),
      tap(() => this.store.dispatch(npmiMetricsAndValuesRequested())),
      switchMap(() => {
        return forkJoin([
          this.dataSource.fetchValues(),
          this.dataSource.fetchMetrics(),
        ]).pipe(
          tap(([values, metrics]) => {
            this.store.dispatch(
              npmiMetricsAndValuesLoaded({
                values: values,
                metrics: metrics,
              })
            );
          }),
          map(() => void null)
        );
      })
    );
  }

  constructor(
    private actions$: Actions,
    private store: Store<State>,
    private dataSource: NpmiHttpServerDataSource
  ) {
    this.loadData$ = createEffect(
      () => {
        const loadAnnogationsData$ = this.loadAnnotations();
        const loadMetricsAndValuesData$ = this.loadMetricsAndValues();

        return merge(loadAnnogationsData$, loadMetricsAndValuesData$).pipe(
          map(() => ({}))
        );
      },
      {dispatch: false}
    );
  }
}
