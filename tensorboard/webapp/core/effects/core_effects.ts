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
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {Store} from '@ngrx/store';
import {EMPTY, from, merge, of, zip} from 'rxjs';
import {
  catchError,
  delay,
  distinctUntilChanged,
  filter,
  map,
  mergeMap,
  switchMap,
  take,
  tap,
  throttleTime,
  withLatestFrom,
} from 'rxjs/operators';
import {areSameRouteKindAndExperiments} from '../../app_routing';
import {navigated} from '../../app_routing/actions';
import {
  getActiveRoute,
  getExperimentIdToExperimentAliasMap,
  getRouteKind,
} from '../../app_routing/store/app_routing_selectors';
import {RouteKind} from '../../app_routing/types';
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
import {State} from '../state';
import {
  getActivePlugin,
  getPluginsListLoaded,
  getPolymerRunsLoadState,
} from '../store';
import {PluginsListFailureCode} from '../types';

// throttle + 1ms are somewhat random but it does following:
// - when an app uses both router and manually fires coreLoaded, we prevent
//   double requests.
// - when using debounceTime(0), we see a brief moment of flicker when app
//   bootstraps. To mitigate this, we use `leading: true` with `throttleTime`.
const DATA_LOAD_CONDITIONAL_THROTTLE_IN_MS = 1;

const ALIAS_CHANGE_RUNS_RELOAD_THROTTLE_IN_MS = 500;

const DASHBOARD_ROUTE_KIND = new Set([
  RouteKind.COMPARE_EXPERIMENT,
  RouteKind.EXPERIMENT,
  // Temporary. Not all TensorBoard uses router and, without using router, we
  // still need to fetch plugins listing and runs when we first load. `null`
  // signifies 'route not set'.
  RouteKind.NOT_SET,
]);

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

  private readonly onDashboardLoad$;

  /**
   * Requires to be exported for JSCompiler. JSCompiler, otherwise,
   * think it is unused property and deadcode eliminate away.
   */
  /** @export */
  readonly fetchWebAppData$;

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
  readonly dispatchChangePlugin$;

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
  ) {
    this.onDashboardLoad$ = merge(
      this.actions$.pipe(
        ofType(coreLoaded, navigated),
        withLatestFrom(this.store.select(getActiveRoute)),
        distinctUntilChanged(([, beforeRoute], [, afterRoute]) => {
          return areSameRouteKindAndExperiments(beforeRoute, afterRoute);
        })
      ),
      this.actions$.pipe(ofType(reload, manualReload))
    ).pipe(
      withLatestFrom(this.store.select(getRouteKind)),
      filter(([, routeKind]) => DASHBOARD_ROUTE_KIND.has(routeKind)),
      throttleTime(DATA_LOAD_CONDITIONAL_THROTTLE_IN_MS, undefined, {
        leading: true,
      })
    );
    this.fetchWebAppData$ = createEffect(
      () => {
        const pluginsListingReload$ = this.onDashboardLoad$.pipe(
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
              // TODO(tensorboard-team): consider brekaing the environments out of
              // the pluginsListingLoaded; currently, plugins listing load state
              // is connected to the environments which is not ideal. Have its own
              // load state.
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

        const runsReload$ = this.onDashboardLoad$.pipe(
          map(([, routeKind]) => routeKind),
          switchMap((routeKind) => {
            if (routeKind !== RouteKind.COMPARE_EXPERIMENT) {
              return of([]);
            }

            // If alias map changes, we need to refetch the list of runs as
            // Polymer's run selector and tags rely on run names including the
            // alias.
            return this.store.select(getExperimentIdToExperimentAliasMap).pipe(
              distinctUntilChanged((beforeAliasDict, afterAliasDict) => {
                const entries = Object.entries(beforeAliasDict);
                const afterAliasMap = new Map(Object.entries(afterAliasDict));
                if (entries.length !== afterAliasMap.size) {
                  return false;
                }
                for (const [experimentId, alias] of entries) {
                  if (!afterAliasMap.get(experimentId)) {
                    return false;
                  }
                  if (
                    afterAliasMap.get(experimentId)!.aliasText !==
                      alias.aliasText ||
                    afterAliasMap.get(experimentId)!.aliasNumber !==
                      alias.aliasNumber
                  ) {
                    return false;
                  }
                }
                return true;
              }),
              // HACK: arbitrary microtask delay.
              // An alias change -> route change -> browser url change ->
              // `navigated` action. Because we, especially Polymer code, makes
              // requests under a relative path, we must make requests only after
              // the URL has been modified to reflect new alias or experiment id.
              //
              // While we can subscribe to `navigated` without
              // `distinctUntilChanged` and `areSameRouteExperiments`, it is hard
              // to throttle quick alias Map changes while immediately making a
              // request for a real navigation. For example, for route A and
              // route B:
              //
              //   0   100   600   700
              //   A -> A' -> A" -> B
              //   ↑          ↑     ↑
              //  req  noop  req   req
              //
              // Above, we would like to make the request immediately when the set
              // of experiments change while debouncing alias changes when the set
              // of experiments have not changed.
              //
              // Instead of more elaborate rxjs techniques, we are
              // using `delay(0)` to give the router a chance to modify the URL
              // before making the request.
              delay(0),
              // Prevent changes in the alias map not to over-trigger requests;
              // However, we want to use throttle instead of debounce since we
              // need to emit on `leading` so it does not cause 500ms delay on
              // page load.
              throttleTime(ALIAS_CHANGE_RUNS_RELOAD_THROTTLE_IN_MS, undefined, {
                leading: true,
                trailing: true,
              })
            );
          }),
          withLatestFrom(
            this.store.select(getRouteKind),
            this.store.select(getPolymerRunsLoadState)
          ),
          filter(([, routeKind, loadState]) => {
            // While the same check was applied earlier, `delay` + `throttleTime`
            // makes it unpredictable and we can sometimes make requests for the
            // wrong route. This check prevents making the request in wrong
            // hostname in a fool proof way.
            return (
              DASHBOARD_ROUTE_KIND.has(routeKind) &&
              loadState.state !== DataLoadState.LOADING
            );
          }),
          tap(() => {
            this.store.dispatch(polymerRunsFetchRequested());
          }),
          switchMap(() => {
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
    this.dispatchChangePlugin$ = createEffect(
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
  }
}

export const TEST_ONLY = {
  DATA_LOAD_CONDITIONAL_THROTTLE_IN_MS,
  ALIAS_CHANGE_RUNS_RELOAD_THROTTLE_IN_MS,
};
