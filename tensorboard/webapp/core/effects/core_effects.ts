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
import '../../tb_polymer_interop_types';

import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {Store} from '@ngrx/store';
import {EMPTY, from, merge, zip} from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  filter,
  map,
  mergeMap,
  share,
  take,
  tap,
  throttleTime,
  withLatestFrom,
} from 'rxjs/operators';

import {navigated} from '../../app_routing/actions';
import {getRouteId} from '../../app_routing/store/app_routing_selectors';
import {State as AppRoutingState} from '../../app_routing/store/app_routing_types';
import {RouteKind} from '../../app_routing/types';
import {State} from '../../app_state';
import {getEnabledExperimentalPlugins} from '../../feature_flag/store/feature_flag_selectors';
import {DataLoadState} from '../../types/data';
import {
  TBServerDataSource,
  TBServerError,
} from '../../webapp_data_source/tb_server_data_source';
import {
  changePlugin,
  coreLoaded,
  environmentLoaded,
  manualReload,
  pluginsListingFailed,
  pluginsListingLoaded,
  pluginsListingRequested,
  polymerRunsFetchFailed,
  polymerRunsFetchRequested,
  polymerRunsFetchSucceeded,
  reload,
} from '../actions';
import {getActivePlugin, getPluginsListLoaded} from '../store';
import {PluginsListFailureCode} from '../types';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';
/** @typehack */ import * as _typeHackNgrxEffects from '@ngrx/effects';

// 10ms of throttle is somewhat random but it does following:
// - when an app uses both router and manually fires coreLoaded, we prevent
//   double requests.
// - when using debounceTime(0), we see a brief moment of flicker when app
//   bootstraps. To mitigate this, we use `leading: true`.
const DATA_LOAD_COND_THROTTLE_IN_MS = 10;

@Injectable()
export class CoreEffects {
  // Ngrx assumes all Effect classes have properties that inherit from the base
  // JS Object. `tf_backend` does not, so we wrap it.
  private readonly tfBackend = {
    ref: document.createElement('tf-backend').tf_backend,
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

  private readonly onDashboardLoad$ = merge(
    this.actions$.pipe(ofType(coreLoaded)),
    this.actions$.pipe(
      ofType(navigated),
      filter(({after}) => {
        return (
          after.routeKind === RouteKind.COMPARE_EXPERIMENT ||
          after.routeKind === RouteKind.EXPERIMENT
        );
      }),
      withLatestFrom(this.store.select(getRouteId)),
      distinctUntilChanged(([, beforeRouteId], [, afterRouteId]) => {
        return beforeRouteId === afterRouteId;
      })
    )
  ).pipe(
    throttleTime(DATA_LOAD_COND_THROTTLE_IN_MS, undefined, {leading: true})
  );

  // Emits when data should be refreshed.
  // HACK: currently, plugins list loaded state is used as a proxy to know
  // whether the data is being reloaded or not. This should change to
  private readonly onDataReload$ = merge(
    this.onDashboardLoad$,
    this.actions$.pipe(ofType(reload, manualReload))
  ).pipe(
    withLatestFrom(
      this.store.select(getPluginsListLoaded),
      this.store.select(getEnabledExperimentalPlugins)
    ),
    filter(([, {state}]) => state !== DataLoadState.LOADING),
    share()
  );

  /**
   * Requires to be exported for JSCompiler. JSCompiler, otherwise,
   * think it is unused property and deadcode eliminate away.
   */
  /** @export */
  readonly fetchWebAppData$ = createEffect(
    () => {
      const pluginsListingReload$ = this.onDataReload$.pipe(
        tap(() => this.store.dispatch(pluginsListingRequested())),
        mergeMap(([, , enabledExperimentalPlugins]) => {
          return zip(
            this.webappDataSource.fetchPluginsListing(
              enabledExperimentalPlugins
            ),
            this.fetchEnvironment()
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
      );

      const runsReload$ = this.onDataReload$.pipe(
        tap(() => {
          this.store.dispatch(polymerRunsFetchRequested());
        }),
        mergeMap(() => {
          return this.refreshPolymerRuns();
        }),
        tap(() => {
          this.store.dispatch(polymerRunsFetchSucceeded());
        }),
        catchError(() => {
          this.store.dispatch(polymerRunsFetchFailed());
          return EMPTY;
        })
      );

      return merge(pluginsListingReload$, runsReload$);
    },
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
      return merge(
        this.onDashboardLoad$,
        this.actions$.pipe(ofType(pluginsListingLoaded))
      ).pipe(
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
    private store: Store<State & AppRoutingState>,
    private webappDataSource: TBServerDataSource
  ) {}
}

export const TEST_ONLY = {
  DATA_LOAD_COND_THROTTLE_IN_MS,
};
