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
import {Actions, createEffect, ofType, OnInitEffects} from '@ngrx/effects';
import {Action, createAction, Store} from '@ngrx/store';
import {Observable, of} from 'rxjs';
import {catchError, map, mergeMap} from 'rxjs/operators';
import {State} from '../../app_state';
import {NotificationCenterDataSource} from '../_data_source/index';
import {Notification} from './notification_center_types';
import * as actions from './notification_center_actions';

/** @typehack */ import * as _typeHackNgrxEffects from '@ngrx/effects';
/** @typehack */ import * as _typeHackModels from '@ngrx/store/src/models';
/** @typehack */ import * as _typeHackStore from '@ngrx/store';

export const initAction = createAction('[NotificationCenter Effects] Init');

@Injectable()
export class NotificationCenterEffects implements OnInitEffects {
  constructor(
    private readonly actions$: Actions,
    private readonly store: Store<State>,
    private readonly dataSource: NotificationCenterDataSource
  ) {}

  /** @export */
  ngrxOnInitEffects(): Action {
    return initAction();
  }

  /**
   * Initiates notifications fetching.
   *
   * @export
   */
  initialNotificaitonFetch$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(initAction),
        mergeMap(() => this.fetchNotification())
      );
    },
    {dispatch: false}
  );

  private fetchNotification() {
    return this.dataSource.fetchNotification().pipe(
      map((response) => {
        if (response.response.notifications) {
          this.store.dispatch(actions.fetchNotificationsLoaded(response));
        }
        this.store.dispatch(actions.fetchNotificationsFailed());
      }),
      catchError(() => {
        this.store.dispatch(actions.fetchNotificationsFailed());
        return of([]);
      })
    );
  }
}

export const TEST_ONLY = {
  initAction,
};