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
import {Store} from '@ngrx/store';
import {Actions, ofType, createEffect} from '@ngrx/effects';
import {EMPTY, from, zip} from 'rxjs';
import {
  map,
  mergeMap,
  catchError,
  withLatestFrom,
  filter,
  tap,
  distinctUntilChanged,
  take,
} from 'rxjs/operators';
import {
  coreLoaded,
  environmentLoaded,
  manualReload,
  reload,
  pluginsListingRequested,
  pluginsListingLoaded,
  pluginsListingFailed,
  changePlugin,
} from '../actions';
import {getPluginsListLoaded, getActivePlugin} from '../store';
import {PluginsListFailureCode} from '../types';
import {DataLoadState} from '../../types/data';
import {
  TBServerDataSource,
  TBServerError,
} from '../../webapp_data_source/tb_server_data_source';
import {getEnabledExperimentalPlugins} from '../../feature_flag/store/feature_flag_selectors';
import {State} from '../../app_state';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';
/** @typehack */ import * as _typeHackNgrxEffects from '@ngrx/effects';

@Injectable()
export class CoreEffects {
  // Ngrx assumes all Effect classes have properties that inherit from the base
  // JS Object. `tf_backend` does not, so we wrap it.
  private readonly tfBackend = {
    ref: (document.createElement('tf-backend') as any).tf_backend,
  };

  /**
   * Force a data load for the Polymer-specific portion of the app. This leads
   * to duplicate requests but hopefully the state is temporary until we migrate
   * everything from Polymer to Angular.
   *
   * This is intentionally called in core/ rather than runs/ so that TB
   * embedders may use runs outside of the core dashboard page, without relying
   * on the Polymer runsStore.
   */
  private refreshPolymerRuns() {
    return from(this.tfBackend.ref.runsStore.refresh());
  }

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
            this.refreshPolymerRuns()
          ).pipe(
            map(([plugins]) => {
              this.store.dispatch(pluginsListingLoaded({plugins}));
            }),
            catchError((e) => {
              if (e instanceof TBServerError) {
                this.store.dispatch(
                  pluginsListingFailed({failureCode: e.failureCode})
                );
              } else {
                this.store.dispatch(
                  pluginsListingFailed({
                    failureCode: PluginsListFailureCode.UNKNOWN,
                  })
                );
              }
              return EMPTY;
            })
          );
        })
      ),
    {dispatch: false}
  );

  /**
   * HACK: COMPOSITE ACTION -- Fire `changePlugin` on first truthy value of
   * activePlugin on coreLoaded or pluginsListingLoaded.
   *
   * Rationale: most plugins want to be able to tell when it becomes active in
   * order to, for example, fetch necessary data. By firing changePlugin on
   * activePlugin first value set, we can prevent (1) other feature developer
   * from responding to values changes from the store (creates composite
   * actions) and (2) re-implement complex and brittle observable pattern.
   *
   * @export
   */
  readonly dispatchChangePlugin$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(coreLoaded, pluginsListingLoaded),
        withLatestFrom(this.store.select(getActivePlugin)),
        map(([, activePlugin]) => activePlugin),
        distinctUntilChanged(),
        filter((activePlugin) => activePlugin !== null),
        take(1),
        tap((plugin) => {
          this.store.dispatch(changePlugin({plugin: plugin!}));
        })
      );
    },
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
}
