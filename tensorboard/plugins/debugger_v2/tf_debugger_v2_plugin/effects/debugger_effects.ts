/* Copyright 2019 The TensorFlow Authors. All Rights Reserved.

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
import {Action, Store} from '@ngrx/store';
import {Actions, ofType, createEffect} from '@ngrx/effects';
import {Observable} from 'rxjs';
import {map, mergeMap, withLatestFrom, filter, tap} from 'rxjs/operators';
import {
  debuggerLoaded,
  debuggerRunsRequested,
  debuggerRunsLoaded,
} from '../actions';
import {getDebuggerRunsLoaded} from '../store/debugger_selectors';
import {
  DataLoadState,
  State,
  DebuggerRunListing,
} from '../store/debugger_types';
import {Tfdbg2HttpServerDataSource} from '../data_source/tfdbg2_data_source';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';
/** @typehack */ import * as _typeHackNgrx from '@ngrx/store/src/models';

@Injectable()
export class DebuggerEffects {
  /**
   * Requires to be exported for JSCompiler. JSCompiler, otherwise,
   * think it is unused property and deadcode eliminate away.
   */
  /** @export */
  readonly loadRunListing$ = createEffect(() =>
    this.actions$.pipe(
      ofType(debuggerLoaded),
      withLatestFrom(this.store.select(getDebuggerRunsLoaded)),
      filter(([, {state}]) => state !== DataLoadState.LOADING),
      tap(() => this.store.dispatch(debuggerRunsRequested())),
      mergeMap(() => {
        return this.dataSource.fetchRuns().pipe(
          map(
            (runs) => {
              return debuggerRunsLoaded({runs: runs as DebuggerRunListing});
            }
            // TODO(cais): Add catchError() to pipe.
          )
        ) as Observable<Action>;
      })
    )
  );

  constructor(
    private actions$: Actions,
    private store: Store<State>,
    private dataSource: Tfdbg2HttpServerDataSource
  ) {}
}
