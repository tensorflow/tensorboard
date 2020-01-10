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
import {Store, createAction} from '@ngrx/store';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {
  tap,
  withLatestFrom,
  filter,
  map,
  distinctUntilChanged,
} from 'rxjs/operators';

import {State} from '../../app_state';
import {changePlugin} from '../../core/actions';
import {getActivePlugin} from '../../core/store';
import {AnalyticsLogger} from '../analytics_logger';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';
/** @typehack */ import * as _typeHackNgrxStore from '@ngrx/store/src/models';
/** @typehack */ import * as _typeHackNgrxEffects from '@ngrx/effects/effects';

@Injectable()
export class AnalyticsEffects {
  // Export so that JSCompiler preserves this effect, and disable dispatch,
  // since an output action is not needed.
  /** @export */
  readonly analytics$ = createEffect(
    () => {
      return this.createPageViewObservable();
    },
    {dispatch: false}
  );

  constructor(
    public readonly actions$: Actions,
    private readonly store: Store<State>,
    private readonly logger: AnalyticsLogger
  ) {}

  private createPageViewObservable() {
    return this.actions$.pipe(
      ofType(changePlugin),
      withLatestFrom(this.store.select(getActivePlugin)),
      filter(([action, pluginId]) => Boolean(pluginId)),
      map(([action, pluginId]) => pluginId!),
      distinctUntilChanged(),
      tap((pluginId) => {
        this.logger.sendPageView(pluginId);
      })
    );
  }
}
