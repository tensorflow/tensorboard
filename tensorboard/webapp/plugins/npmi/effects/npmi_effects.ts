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
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {Store} from '@ngrx/store';
import {EMPTY, merge, Observable} from 'rxjs';
import {
  catchError,
  filter,
  map,
  mergeMap,
  tap,
  withLatestFrom,
} from 'rxjs/operators';
import {State} from '../../../app_state';
import * as selectors from '../../../selectors';
import {NpmiHttpServerDataSource} from '../data_source/npmi_data_source';
import {
  npmiLoaded,
  npmiPluginDataLoaded,
  npmiPluginDataRequested,
  npmiPluginDataRequestFailed,
} from './../actions';
import {getPluginDataLoaded} from './../store/npmi_selectors';
import {DataLoadState} from './../store/npmi_types';

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

  private loadPluginData() {
    return this.actions$.pipe(
      ofType(npmiLoaded),
      withLatestFrom(
        this.store.select(getPluginDataLoaded),
        this.store.select(selectors.getExperimentIdsFromRoute)
      ),
      filter(
        ([, state, experimentIds]) =>
          state !== DataLoadState.LOADING && experimentIds !== null
      ),
      tap(() => this.store.dispatch(npmiPluginDataRequested())),
      mergeMap(([, , experimentIds]) => {
        return this.dataSource.fetchData(experimentIds!).pipe(
          tap((result) => {
            this.store.dispatch(npmiPluginDataLoaded(result));
          }),
          map(() => void null),
          catchError(() => {
            this.store.dispatch(npmiPluginDataRequestFailed());
            return EMPTY;
          })
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
        const loadPluginData$ = this.loadPluginData();

        return merge(loadPluginData$).pipe(map(() => ({})));
      },
      {dispatch: false}
    );
  }
}
