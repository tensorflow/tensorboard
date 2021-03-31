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
import {Injectable} from '@angular/core';
import {Actions, OnInitEffects} from '@ngrx/effects';
import {Action, createAction, Store} from '@ngrx/store';
import {of} from 'rxjs';
import {catchError, tap} from 'rxjs/operators';
import {State} from '../../app_state';
import {
  NotificationCenterDataSource,
  NotificationCenterRequest,
  NotificationCenterResponse,
} from '../data_source/index';

const initAction = createAction('[NotificationCenter Effects] Init');

@Injectable()
export class NotificationCenterEffects implements OnInitEffects {
  constructor(
    private readonly actions$: Actions,
    private readonly store: Store<State>,
    private readonly dataSource: NotificationCenterDataSource
  ) {}

  /** @export */
  ngrxOnInitEffects(): Action {
    console.log('ngrxOnInitEffects');
    return initAction();
  }

  private fetchTimeSeries(request: NotificationCenterRequest) {
    return this.dataSource.fetchNotification([request]).pipe(
      tap((responses: NotificationCenterResponse) => {
        console.log('NotificationCenterResponse:', responses);
        // const errors = responses.filter(isFailedTimeSeriesResponse);
        // if (errors.length) {
        //   console.error('Time series response contained errors:', errors);
        // }
        // this.store.dispatch(actions.fetchTimeSeriesLoaded({response: responses[0]});
      }),
      catchError(() => {
        // this.store.dispatch(actions.fetchTimeSeriesFailed({request}));
        return of(null);
      })
    );
  }
}
