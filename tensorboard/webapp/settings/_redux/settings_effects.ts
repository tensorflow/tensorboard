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
import {EMPTY} from 'rxjs';
import {catchError, switchMap, tap, withLatestFrom} from 'rxjs/operators';

import {State} from '../../app_state';
import {SettingsDataSource} from '../_data_source/settings_data_source';
import {
  changePageSize,
  changeReloadPeriod,
  fetchSavedSettingsFailed,
  fetchSavedSettingsRequested,
  fetchSavedSettingsSucceeded,
  toggleReloadEnabled,
} from './settings_actions';
import {
  getPageSize,
  getReloadEnabled,
  getReloadPeriodInMs,
} from './settings_selectors';

/** @typehack */ import * as _typeHackNgrxEffects from '@ngrx/effects';
/** @typehack */ import * as _typeHackModels from '@ngrx/store/src/models';
/** @typehack */ import * as _typeHackRxjs from 'rxjs';

export const initAction = createAction('[Settings Effects] Init');

@Injectable()
export class SettingsEffects implements OnInitEffects {
  constructor(
    private readonly actions$: Actions,
    private readonly store: Store<State>,
    private readonly dataSource: SettingsDataSource
  ) {}

  /** @export */
  ngrxOnInitEffects(): Action {
    return initAction();
  }

  /** @export */
  initialSavedSettingsFetch$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(initAction),
        switchMap(() => {
          this.store.dispatch(fetchSavedSettingsRequested());
          return this.dataSource.fetchSavedSettings();
        }),
        tap((savedSettings) => {
          this.store.dispatch(fetchSavedSettingsSucceeded({savedSettings}));
        }),
        catchError(() => {
          this.store.dispatch(fetchSavedSettingsFailed());
          return EMPTY;
        })
      );
    },
    {dispatch: false}
  );

  /** @export */
  saveReloadEnabled$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(toggleReloadEnabled),
        withLatestFrom(this.store.select(getReloadEnabled)),
        tap(([, reloadEnabled]) => {
          this.dataSource.saveReloadEnabled(reloadEnabled);
        })
      );
    },
    {dispatch: false}
  );

  /** @export */
  saveReloadPeriodInMs$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(changeReloadPeriod),
        withLatestFrom(this.store.select(getReloadPeriodInMs)),
        tap(([, reloadPeriodInMs]) => {
          this.dataSource.saveReloadPeriodInMs(reloadPeriodInMs);
        })
      );
    },
    {dispatch: false}
  );

  /** @export */
  savePageSize$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(changePageSize),
        withLatestFrom(this.store.select(getPageSize)),
        tap(([, pageSize]) => {
          this.dataSource.savePageSize(pageSize);
        })
      );
    },
    {dispatch: false}
  );
}

export const TEST_ONLY = {
  initAction,
};
