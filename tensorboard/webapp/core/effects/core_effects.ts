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
import {EMPTY, Observable, of, zip} from 'rxjs';
import {
  map,
  mergeMap,
  catchError,
  withLatestFrom,
  filter,
  tap,
} from 'rxjs/operators';
import {
  coreLoaded,
  environmentLoaded,
  manualReload,
  reload,
  pluginsListingRequested,
  pluginsListingLoaded,
  pluginsListingFailed,
  fetchRunSucceeded,
} from '../actions';
import {getPluginsListLoaded} from '../store';
import {DataLoadState} from '../../types/data';
import {TBServerDataSource} from '../../webapp_data_source/tb_server_data_source';
import {getEnabledExperimentalPlugins} from '../../feature_flag/store/feature_flag_selectors';
import {State} from '../../app_state';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';
/** @typehack */ import * as _typeHackNgrx from '@ngrx/store/src/models';
/** @typehack */ import * as _typeHackNgrxEffects from '@ngrx/effects';

@Injectable()
export class CoreEffects {
  /**
   * Requires to be exported for JSCompiler. JSCompiler, otherwise,
   * think it is unused property and deadcode eliminate away.
   */
  /** @export */
  readonly fetchWebAppData$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(coreLoaded, reload, manualReload),
        withLatestFrom(
          this.store.select(getPluginsListLoaded),
          this.store.select(getEnabledExperimentalPlugins)
        ),
        filter(([, {state}]) => state !== DataLoadState.LOADING),
        tap(() => this.store.dispatch(pluginsListingRequested())),
        mergeMap(([, , enabledExperimentalPlugins]) => {
          return zip(
            this.webappDataSource.fetchPluginsListing(
              enabledExperimentalPlugins
            ),
            this.fetchEnvironment(),
            this.fetchRuns()
          ).pipe(
            map(
              ([plugins]) => {
                this.store.dispatch(pluginsListingLoaded({plugins}));
              },
              catchError(() => {
                this.store.dispatch(pluginsListingFailed());
                return EMPTY;
              })
            )
          );
        })
      ),
    {dispatch: false}
  );

  private fetchEnvironment() {
    return this.webappDataSource.fetchEnvironment().pipe(
      tap((environment) => {
        this.store.dispatch(environmentLoaded({environment}));
      })
    );
  }

  constructor(
    private actions$: Actions,
    private store: Store<State>,
    private webappDataSource: TBServerDataSource
  ) {}

  private fetchRuns() {
    return this.webappDataSource.fetchRuns().pipe(
      tap((runs) => {
        this.store.dispatch(fetchRunSucceeded({runs}));
      })
    );
  }
}
