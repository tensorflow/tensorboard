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
import {Inject, Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {Action, createAction, Store} from '@ngrx/store';
import {merge, Observable, of} from 'rxjs';
import {
  debounceTime,
  delay,
  filter,
  map,
  switchMap,
  tap,
  withLatestFrom,
} from 'rxjs/operators';

import {State} from '../../app_state';
import {
  navigated,
  navigating,
  navigationRequested,
  stateRehydratedFromUrl,
} from '../actions';
import {AppRootProvider} from '../app_root';
import {areRoutesEqual, getRouteId} from '../internal_utils';
import {Location} from '../location';
import {ProgrammaticalNavigationModule} from '../programmatical_navigation_module';
import {RouteConfigs} from '../route_config';
import {RouteRegistryModule} from '../route_registry_module';
import {getActiveRoute} from '../store/app_routing_selectors';
import {Navigation, Route} from '../types';

/** @typehack */ import * as _typeHackNgrxEffects from '@ngrx/effects';
/** @typehack */ import * as _typeHackModels from '@ngrx/store/src/models';
/** @typehack */ import * as _typeHackStore from '@ngrx/store';

const initAction = createAction('[App Routing] Effects Init');

interface InternalNavigation extends Navigation {
  browserInitiated?: boolean;
}

@Injectable()
export class AppRoutingEffects {
  private readonly routeConfigs: RouteConfigs | null;

  constructor(
    private readonly actions$: Actions,
    private readonly store: Store<State>,
    private readonly location: Location,
    registry: RouteRegistryModule,
    private readonly programmaticalNavModule: ProgrammaticalNavigationModule,
    private readonly appRootProvider: AppRootProvider
  ) {
    this.routeConfigs = registry.getRouteConfigs();
  }

  private readonly onNavigationRequested$ = this.actions$.pipe(
    ofType(navigationRequested),
    map((navigation) => {
      const resolvedPathname = navigation.pathname.startsWith('/')
        ? this.appRootProvider.getAbsPathnameWithAppRoot(navigation.pathname)
        : this.location.getResolvedPath(navigation.pathname);
      return {...navigation, pathname: resolvedPathname};
    })
  );

  private readonly onInit$: Observable<Navigation> = this.actions$
    .pipe(ofType(initAction))
    .pipe(
      delay(0),
      map(() => {
        return {
          pathname: this.location.getPath(),
          queryParams: this.location.getSearch(),
          replaceState: true,
          browserInitiated: true,
        };
      })
    );

  /**
   * Input observable must have absolute pathname with, when appRoot is present,
   * appRoot prefixed (e.g., window.location.pathname).
   */
  private readonly userInitNavRoute$ = merge(
    this.onNavigationRequested$,
    this.onInit$,
    this.location.onPopState().pipe(
      map((navigation) => {
        return {
          pathname: navigation.pathname,
          replaceState: navigation.replaceState,
          browserInitiated: true,
        };
      })
    )
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
      const routeMatch = this.routeConfigs
        ? this.routeConfigs.match(navigationWithAbsolutePath)
        : null;
      return {
        routeMatch,
        options: {
          replaceState: navigationWithAbsolutePath.replaceState,
          browserInitiated: navigationWithAbsolutePath.browserInitiated,
        },
      };
    })
  );

  private readonly programmticalNavRoute$ = this.actions$.pipe(
    map((action) => {
      return this.programmaticalNavModule.getNavigation(action);
    }),
    filter((nav) => {
      return nav !== null;
    }),
    map((programmaticalNavigation) => {
      const {routeKind, routeParams} = programmaticalNavigation!;
      const routeMatch = this.routeConfigs
        ? this.routeConfigs.matchByRouteKind(routeKind, routeParams)
        : null;
      return {
        routeMatch,
        options: {
          replaceState: false,
          browserInitiated: false,
        },
      };
    })
  );

  private readonly validatedRoute$ = merge(
    this.userInitNavRoute$,
    this.programmticalNavRoute$
  ).pipe(
    filter(({routeMatch}) => Boolean(routeMatch)),
    map((routeMatchAndOptions) => {
      return {
        routeMatch: routeMatchAndOptions.routeMatch!,
        options: routeMatchAndOptions.options,
      };
    })
  );

  /**
   * @export
   */
  fireNavigatedIfValidRoute$ = createEffect(() => {
    return this.validatedRoute$.pipe(
      tap(({routeMatch, options}) => {
        if (options.browserInitiated && routeMatch.deepLinkProvider) {
          const rehydratingState = routeMatch.deepLinkProvider.deserializeQueryParams(
            this.location.getSearch()
          );
          this.store.dispatch(
            stateRehydratedFromUrl({
              routeKind: routeMatch.routeKind,
              partialState: rehydratingState,
            })
          );
        }
      }),
      switchMap(({routeMatch, options}) => {
        const navigationOptions = {
          replaceState: options.replaceState ?? false,
        };

        const routeObservableWithoutQuery: Observable<Route> = of({
          routeKind: routeMatch.routeKind,
          params: routeMatch.params,
          pathname: routeMatch.pathname,
          queryParams: [],
          navigationOptions,
        });

        if (routeMatch.deepLinkProvider === null) {
          return routeObservableWithoutQuery;
        }

        return routeMatch
          .deepLinkProvider!.serializeStateToQueryParams(this.store)
          .pipe(
            map((queryParams, index) => {
              return {
                routeKind: routeMatch.routeKind,
                params: routeMatch.params,
                pathname: routeMatch.pathname,
                queryParams,
                navigationOptions:
                  index === 0
                    ? navigationOptions
                    : {
                        ...navigationOptions,
                        replaceState: true,
                      },
              };
            })
          );
      }),
      tap((route) => {
        // b/160185039: Allows the route store + router outlet to change
        // before the route change so all components do not have to
        // safeguard against the case when `routeId` (routeKind and
        // routeParams) do not have unexpected values. Because we
        // debounceTime, technically, it does not fire two actions
        // sequentially.
        this.store.dispatch(navigating({after: route}));
      }),
      // Let the router-outlet flush the change in a microtask.
      debounceTime(0),
      withLatestFrom(this.store.select(getActiveRoute)),
      map(([route, oldRoute]) => {
        return navigated({before: oldRoute, after: route});
      })
    );
  });

  // TODO(stephanwlee): move this to a "view".
  /** @export */
  changeBrowserUrl$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(navigated),
        withLatestFrom(this.store.select(getActiveRoute)),
        filter(([, route]) => Boolean(route)),
        map(([navigatedAction, route]) => {
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
          const oldRoute = navigatedAction.before;
          const preserveHash =
            oldRoute === null ||
            getRouteId(oldRoute.routeKind, oldRoute.params) ===
              getRouteId(route!.routeKind, route!.params);
          return {
            preserveHash,
            route: route!,
          };
        }),
        filter(({route}) => {
          return !areRoutesEqual(route, {
            pathname: this.appRootProvider.getAppRootlessPathname(
              this.location.getPath()
            ),
            queryParams: this.location.getSearch(),
          });
        }),
        tap(({preserveHash, route}) => {
          if (route.navigationOptions.replaceState) {
            this.location.replaceState(
              this.appRootProvider.getAbsPathnameWithAppRoot(
                this.location.getFullPathFromRouteOrNav(route, preserveHash)
              )
            );
          } else {
            this.location.pushState(
              this.appRootProvider.getAbsPathnameWithAppRoot(
                this.location.getFullPathFromRouteOrNav(route, preserveHash)
              )
            );
          }
        })
      );
    },
    {dispatch: false}
  );

  /** @export */
  ngrxOnInitEffects(): Action {
    return initAction();
  }
}

export const TEST_ONLY = {initAction};
