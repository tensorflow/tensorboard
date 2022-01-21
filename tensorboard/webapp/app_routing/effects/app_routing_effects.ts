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
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {Action, createAction, Store} from '@ngrx/store';
import {forkJoin, merge, Observable, of} from 'rxjs';
import {
  debounceTime,
  delay,
  filter,
  map,
  mergeMap,
  switchMap,
  take,
  tap,
  withLatestFrom,
} from 'rxjs/operators';
import {State} from '../../app_state';
import {getEnabledTimeNamespacedState} from '../../feature_flag/store/feature_flag_selectors';
import {
  discardDirtyUpdates,
  navigated,
  navigating,
  navigationRequested,
  routeConfigLoaded,
  stateRehydratedFromUrl,
} from '../actions';
import {AppRootProvider} from '../app_root';
import {DirtyUpdatesRegistryModule} from '../dirty_updates_registry_module';
import {
  areRoutesEqual,
  areSameRouteKindAndExperiments,
  getRouteNamespaceId,
  serializeCompareExperimentParams,
} from '../internal_utils';
import {Location} from '../location';
import {ProgrammaticalNavigationModule} from '../programmatical_navigation_module';
import {RouteConfigs, RouteMatch} from '../route_config';
import {RouteRegistryModule} from '../route_registry_module';
import {
  getActiveNamespaceId,
  getActiveRoute,
  getKnownNamespaceIds,
} from '../store/app_routing_selectors';
import {Route, RouteKind, RouteParams} from '../types';

const initAction = createAction('[App Routing] Effects Init');

interface InternalNavigation {
  pathname: string;
  options: NavigationOptions;
}

interface InternalRouteMatch {
  routeMatch: RouteMatch;
  options: NavigationOptions;
}

interface InternalRoute {
  route: Route;
  options: NavigationOptions;
}

/**
 * Describes how to update namespace and namespace id during navigation.
 */
enum NamespaceUpdateOption {
  // Navigation should happen within the same namespace. The namespace id stays
  // the same.
  UNCHANGED,
  // A new namespace should be generated for this navigation.
  NEW,
  // A specific namespace has been specified by history. It is possibly the same
  // as the active namespace but it is also possibly a different one.
  FROM_HISTORY,
}

type NamespaceUpdate =
  | {
      option: NamespaceUpdateOption.NEW | NamespaceUpdateOption.UNCHANGED;
    }
  | {
      option: NamespaceUpdateOption.FROM_HISTORY;
      namespaceId: string;
    };

type NavigationOptions = {
  browserInitiated: boolean;
  replaceState: boolean;
  namespaceUpdate: NamespaceUpdate;
};

/**
 * Effects to translate attempted app navigations into Route navigation actions.
 *
 * There are four events that trigger the effects in this class:
 *
 *   * Application load
 *   * navigationRequest action
 *   * Browser history popstate event
 *   * Programmatical navigations (see: ProgrammaticalNavigationModule)
 *
 * The progression of how internal data is transformed is:
 *   * On event, immediately generate an InternalNavigation.
 *   * Based on app's Route configuration, transform to an InternalRouteMatch.
 *   * If the navigation is valid, transform into an InternalRoute.
 *
 * When an InternalRoute has been successfully created, browser history is
 * updated and a navigation() action is fired.
 */
@Injectable()
export class AppRoutingEffects {
  private readonly routeConfigs: RouteConfigs;

  constructor(
    private readonly actions$: Actions,
    private readonly store: Store<State>,
    private readonly location: Location,
    private readonly dirtyUpdatesRegistry: DirtyUpdatesRegistryModule<State>,
    private readonly registry: RouteRegistryModule,
    private readonly programmaticalNavModule: ProgrammaticalNavigationModule,
    private readonly appRootProvider: AppRootProvider
  ) {
    this.routeConfigs = registry.getRouteConfigs();
  }

  /**
   * Generates InternalNavigation from navigationRequested action.
   */
  private readonly onNavigationRequested$: Observable<InternalNavigation> =
    this.actions$.pipe(
      ofType(navigationRequested),
      map((navigation) => {
        const resolvedPathname = navigation.pathname.startsWith('/')
          ? this.appRootProvider.getAbsPathnameWithAppRoot(navigation.pathname)
          : this.location.getResolvedPath(navigation.pathname);
        return {
          pathname: resolvedPathname,
          options: {
            browserInitiated: false,
            replaceState: navigation.replaceState ?? false,
            namespaceUpdate: {
              option: navigation.resetNamespacedState
                ? NamespaceUpdateOption.NEW
                : NamespaceUpdateOption.UNCHANGED,
            },
          },
        };
      })
    );

  /**
   * @exports
   */
  readonly bootstrapReducers$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(initAction),
      map(() => {
        return routeConfigLoaded({
          routeKinds: new Set(this.registry.getRegisteredRouteKinds()),
        });
      })
    );
  });

  /**
   * Generates InternalNavigation from application load.
   */
  private readonly onInit$: Observable<InternalNavigation> = this.actions$
    .pipe(ofType(initAction))
    .pipe(
      delay(0),
      map(() => {
        const namespaceId: string | undefined =
          this.location.getHistoryState()?.namespaceId;

        const namespaceUpdate: NamespaceUpdate =
          namespaceId === undefined
            ? // There is no namespace id in the browser history entry. This is,
              // therefore, some sort of new navigation to the app. Set options
              // so that a new namespace id is set downstream.
              {
                option: NamespaceUpdateOption.NEW,
              }
            : // There is a namespace id in the browser history entry. This is,
              // therefore, a page reload. Set options so that the namespace id
              // is reused downstream.
              {
                option: NamespaceUpdateOption.FROM_HISTORY,
                namespaceId: namespaceId,
              };

        return {
          pathname: this.location.getPath(),
          options: {
            browserInitiated: true,
            replaceState: true,
            namespaceUpdate,
          },
        };
      })
    );

  /**
   * Generates InternalNavigation from browser history popstate event.
   */
  private readonly onPopState$: Observable<InternalNavigation> = this.location
    .onPopState()
    .pipe(
      map((navigation) => {
        return {
          pathname: navigation.pathname,
          options: {
            browserInitiated: true,
            replaceState: true,
            namespaceUpdate: {
              option: NamespaceUpdateOption.FROM_HISTORY,
              namespaceId: navigation.state?.namespaceId,
            },
          },
        };
      })
    );

  /**
   * Generates an InternalRouteMatch from the following events:
   *
   *   * Application load.
   *   * navigationRequested action.
   *   * Browser history popstate event.
   *
   * The input InternalNavigation values must have absolute pathname with
   * appRoot prefixed (e.g., window.location.pathname) when appRoot is defined.
   */
  private readonly userInitNavRoute$ = merge(
    this.onNavigationRequested$,
    this.onInit$,
    this.onPopState$
  ).pipe(
    map<InternalNavigation, InternalNavigation>((navigation) => {
      // Expect to have absolute navigation here.
      if (!navigation.pathname.startsWith('/')) {
        throw new Error(
          `[App routing] pathname must start with '/'. Got: ${navigation.pathname}`
        );
      }
      return {
        ...navigation,
        pathname: this.appRootProvider.getAppRootlessPathname(
          navigation.pathname
        ),
      };
    }),
    map((navigationWithAbsolutePath) => {
      const routeMatch = this.routeConfigs.match(navigationWithAbsolutePath);
      return {
        routeMatch,
        options: navigationWithAbsolutePath.options,
      };
    })
  );

  /**
   * Generates an InternalNavigation then InternalRouteMatch for programmatical
   * navigations.
   *
   * See: ProgrammaticalNavigationModule.
   */
  private readonly programmaticalNavRoute$ = this.actions$.pipe(
    map((action) => {
      return this.programmaticalNavModule.getNavigation(action);
    }),
    filter((nav) => {
      return nav !== null;
    }),
    map((programmaticalNavigation) => {
      const nav = programmaticalNavigation!;
      const routeKind = nav.routeKind;
      const resetNamespacedState = nav.resetNamespacedState;

      // TODO(stephanwlee): currently, the RouteParams is ill-typed and you can
      // currently add any property without any type error. Better type it.
      let routeParams: RouteParams;
      switch (nav.routeKind) {
        case RouteKind.COMPARE_EXPERIMENT:
          routeParams = {
            experimentIds: serializeCompareExperimentParams(
              nav.routeParams.aliasAndExperimentIds
            ),
          };
          break;
        default:
          routeParams = nav.routeParams;
      }
      return {routeKind, routeParams, resetNamespacedState};
    }),
    map(({routeKind, routeParams, resetNamespacedState}) => {
      const routeMatch = this.routeConfigs
        ? this.routeConfigs.matchByRouteKind(routeKind, routeParams)
        : null;
      return {
        routeMatch,
        options: {
          replaceState: false,
          browserInitiated: false,
          namespaceUpdate: {
            option: resetNamespacedState
              ? NamespaceUpdateOption.NEW
              : NamespaceUpdateOption.UNCHANGED,
          },
        } as NavigationOptions,
      };
    })
  );

  /**
   * Merges all the event paths, ensuring they have generated a valid
   * InternalRouteMatch.
   */
  private readonly validatedRouteMatch$: Observable<InternalRouteMatch> = merge(
    this.userInitNavRoute$,
    this.programmaticalNavRoute$
  ).pipe(
    filter(({routeMatch}) => Boolean(routeMatch)),
    map(({routeMatch, options}) => {
      return {
        routeMatch: routeMatch!,
        options,
      };
    })
  );

  /**
   * @export
   */
  navigate$ = createEffect(() => {
    const dispatchNavigating$ = this.validatedRouteMatch$.pipe(
      withLatestFrom(this.store.select(getActiveRoute)),
      mergeMap(([internalRouteMatch, oldRoute]) => {
        // Check for unsaved updates and only proceed if the user confirms they
        // want to continue without saving.
        const sameRouteAndExperiments =
          oldRoute !== null &&
          areSameRouteKindAndExperiments(
            oldRoute,
            internalRouteMatch.routeMatch
          );
        const dirtySelectors =
          this.dirtyUpdatesRegistry.getDirtyUpdatesSelectors();
        // Do not warn about unsaved updates when route and experiments are the
        // same (e.g. when changing tabs in the same experiment page or query
        // params in experiment list).
        if (sameRouteAndExperiments || !dirtySelectors.length)
          return of(internalRouteMatch);
        return forkJoin(
          this.dirtyUpdatesRegistry
            .getDirtyUpdatesSelectors()
            .map((selector) => this.store.select(selector).pipe(take(1)))
        ).pipe(
          map(
            (updates) =>
              updates[0].experimentIds !== undefined &&
              updates[0].experimentIds.length > 0
          ),
          filter((hasDirtyUpdates) => {
            if (hasDirtyUpdates) {
              const discardChanges = window.confirm(
                `You have unsaved edits, are you sure you want to discard them?`
              );
              if (discardChanges) {
                this.store.dispatch(discardDirtyUpdates());
              }
              return discardChanges;
            }
            return true;
          }),
          map(() => {
            return internalRouteMatch;
          })
        );
      }),
      withLatestFrom(this.store.select(getKnownNamespaceIds)),
      tap(([{routeMatch, options}, knownNamespaceIds]) => {
        // Possibly rehydrate state from the URL.
        //
        // We do this on "browser initiated" events (like a page load or
        // navigation in browser history) but we only do this when we don't yet
        // have in-memory state for the namespace being navigated to.

        const isKnownNamespace =
          options.namespaceUpdate.option ===
            NamespaceUpdateOption.FROM_HISTORY &&
          knownNamespaceIds.has(options.namespaceUpdate.namespaceId);

        if (
          !options.browserInitiated ||
          isKnownNamespace ||
          !routeMatch.deepLinkProvider
        ) {
          return;
        }

        // Query parameter formed by the redirector is passed to the
        // deserializer instead of one from Location.getSearch(). This
        // behavior emulates redirected URL to be on the URL bar such as
        // "/compare?foo=bar" based on information provided by redirector (do
        // note that location.getSearch() will return current query parameter
        // which is pre-redirection URL).
        const queryParams =
          routeMatch.originateFromRedirection &&
          routeMatch.redirectionOnlyQueryParams
            ? routeMatch.redirectionOnlyQueryParams
            : this.location.getSearch();
        const rehydratingState =
          routeMatch.deepLinkProvider.deserializeQueryParams(queryParams);
        this.store.dispatch(
          stateRehydratedFromUrl({
            routeKind: routeMatch.routeKind,
            partialState: rehydratingState,
          })
        );
      }),
      switchMap(([{routeMatch, options}]): Observable<InternalRoute> => {
        if (routeMatch.deepLinkProvider === null) {
          // Without a DeepLinkProvider emit a single result without query
          // params.
          return of({
            route: {
              routeKind: routeMatch.routeKind,
              params: routeMatch.params,
              pathname: routeMatch.pathname,
              queryParams: [],
            },
            options,
          });
        }

        // With a DeepLinkProvider emit a new result each time the query
        // params change.
        return routeMatch
          .deepLinkProvider!.serializeStateToQueryParams(this.store)
          .pipe(
            map((queryParams, index) => {
              return {
                route: {
                  routeKind: routeMatch.routeKind,
                  params: routeMatch.params,
                  pathname: routeMatch.pathname,
                  queryParams,
                },
                // Only honor replaceState value on first emit. On subsequent
                // emits we always want to replaceState rather than pushState.
                options:
                  index === 0
                    ? options
                    : {
                        ...options,
                        namespaceUpdate: {
                          option: NamespaceUpdateOption.UNCHANGED,
                        },
                        replaceState: true,
                      },
              };
            })
          );
      }),
      tap(({route}) => {
        // b/160185039: Allows the route store + router outlet to change
        // before the route change. Because we debounceTime, technically, it does
        // not fire two actions sequentially.
        this.store.dispatch(navigating({after: route}));
      }),
      // Inject some async-ness so:
      // 1. the router-outlet flush the change in a microtask.
      // 2. we do not have composite action (synchronous dispatchment of
      //    actions).
      debounceTime(0)
    );

    const changeUrl$ = dispatchNavigating$.pipe(
      withLatestFrom(this.store.select(getActiveRoute)),
      map(([{route, options}, oldRoute]) => {
        // The URL hash can be set via HashStorageComponent (which uses
        // Polymer's tf-storage). DeepLinkProviders also modify the URL when
        // a provider's serializeStateToQueryParams() emits. These result in
        // the URL updated without the previous hash. HashStorageComponent
        // makes no attempt to restore the hash, so it is dropped.

        // This results in bad behavior when refreshing (e.g. lost active
        // plugin) and when changing dashboards (e.g. lost tagFilter).

        // TODO(b/169799696): either AppRouting should manage the URL entirely
        // (including hash), or we make the app wait for AppRouting to
        // initialize before setting the active plugin hash.
        // See https://github.com/tensorflow/tensorboard/issues/4207.
        const preserveHash =
          oldRoute === null ||
          route === null ||
          areSameRouteKindAndExperiments(oldRoute, route);
        return {
          preserveHash,
          route,
          options,
        };
      }),
      tap(({preserveHash, route, options}) => {
        const shouldUpdateHistory = !areRoutesEqual(route, {
          pathname: this.appRootProvider.getAppRootlessPathname(
            this.location.getPath()
          ),
          queryParams: this.location.getSearch(),
        });
        if (!shouldUpdateHistory) return;

        if (options.replaceState) {
          this.location.replaceStateUrl(
            this.appRootProvider.getAbsPathnameWithAppRoot(
              this.location.getFullPathFromRoute(route, preserveHash)
            )
          );
        } else {
          this.location.pushStateUrl(
            this.appRootProvider.getAbsPathnameWithAppRoot(
              this.location.getFullPathFromRoute(route, preserveHash)
            )
          );
        }
      })
    );

    return changeUrl$.pipe(
      withLatestFrom(
        this.store.select(getActiveRoute),
        this.store.select(getActiveNamespaceId),
        this.store.select(getEnabledTimeNamespacedState)
      ),
      map(
        ([
          {route, options},
          oldRoute,
          beforeNamespaceId,
          enabledTimeNamespacedState,
        ]) => {
          const afterNamespaceId = getAfterNamespaceId(
            enabledTimeNamespacedState,
            route,
            options,
            beforeNamespaceId
          );

          this.location.replaceStateData({
            ...this.location.getHistoryState(),
            namespaceId: afterNamespaceId,
          });

          return navigated({
            before: oldRoute,
            after: route,
            beforeNamespaceId,
            afterNamespaceId,
          });
        }
      )
    );
  });

  /** @export */
  ngrxOnInitEffects(): Action {
    return initAction();
  }
}

function getAfterNamespaceId(
  enabledTimeNamespacedState: boolean,
  route: Route,
  options: NavigationOptions,
  beforeNamespaceId: string | null
): string {
  if (!enabledTimeNamespacedState) {
    return getRouteNamespaceId(route.routeKind, route.params);
  } else {
    // Time-namespaced state is enabled.
    if (options.namespaceUpdate.option === NamespaceUpdateOption.FROM_HISTORY) {
      return options.namespaceUpdate.namespaceId;
    } else if (
      beforeNamespaceId == null ||
      options.namespaceUpdate.option === NamespaceUpdateOption.NEW
    ) {
      return Date.now().toString();
    } else {
      return beforeNamespaceId;
    }
  }
}

export const TEST_ONLY = {initAction};
