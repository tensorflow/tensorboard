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
import {Observable, of, zip} from 'rxjs';
import {
  map,
  mergeMap,
  catchError,
  withLatestFrom,
  filter,
  tap,
} from 'rxjs/operators';
import {CoreService} from './core.service';
import {
  coreLoaded,
  reload,
  pluginsListingRequested,
  pluginsListingLoaded,
  pluginsListingFailed,
} from './core.actions';
import {State, getPluginsListLoaded} from './core.reducers';
import {LoadState} from '../types/api';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';
/** @typehack */ import * as _typeHackNgrx from '@ngrx/store/src/models';

@Injectable()
export class CoreEffects {
  /**
   * Requires to be exported for JSCompiler. JSCompiler, otherwise,
   * think it is unused property and deadcode eliminate away.
   */
  /** @export */
  readonly loadPluginsListing$ = createEffect(() =>
    this.actions$.pipe(
      ofType(coreLoaded, reload),
      withLatestFrom(this.store.select(getPluginsListLoaded)),
      filter(([, {state}]) => state !== LoadState.LOADING),
      tap(() => this.store.dispatch(pluginsListingRequested())),
      mergeMap(() => {
        return zip(
          this.coreService.fetchPluginsListing(),
          this.coreService.fetchRuns(),
          this.coreService.fetchEnvironments()
        ).pipe(
          map(([plugins]) => {
            return pluginsListingLoaded({plugins});
          }, catchError(() => of(pluginsListingFailed())))
        ) as Observable<Action>;
      })
    )
  );

  constructor(
    private actions$: Actions,
    private store: Store<State>,
    private coreService: CoreService
  ) {}
}
