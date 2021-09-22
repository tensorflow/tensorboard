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

import {Component} from '@angular/core';
import {fakeAsync, flush, TestBed, tick} from '@angular/core/testing';
import {provideMockActions} from '@ngrx/effects/testing';
import {Action, createAction, createSelector, props, Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {of, ReplaySubject} from 'rxjs';

import {State} from '../../app_state';
import * as actions from '../actions';
import {AppRootProvider, TestableAppRootProvider} from '../app_root';
import {Location} from '../location';
import {DirtyUpdatesRegistryModule} from '../dirty_updates_registry_module';
import {
  NavigateToCompare,
  NavigateToExperiments,
  ProgrammaticalNavigationModule,
} from '../programmatical_navigation_module';
import {RouteRegistryModule} from '../route_registry_module';
import {getActiveRoute} from '../store/app_routing_selectors';
import {buildRoute, provideLocationTesting, TestableLocation} from '../testing';
import {
  DirtyUpdates,
  Navigation,
  Route,
  RouteKind,
  SerializableQueryParams,
} from '../types';

import {AppRoutingEffects, TEST_ONLY} from './app_routing_effects';

@Component({selector: 'test', template: ''})
class TestableComponent {}

const testAction = createAction('[TEST] test actions');
const testNavToCompareAction = createAction(
  '[TEST] test nav to compare',
  props<NavigateToCompare['routeParams']>()
);
const testDirtyExperimentsSelector = createSelector(
  (s) => s,
  (state: any) => {
    return {
      experimentIds: [],
    } as DirtyUpdates;
  }
);

describe('app_routing_effects', () => {
  let effects: AppRoutingEffects;
  let store: MockStore<State>;
  let action: ReplaySubject<Action>;
  let location: Location;
  let actualActions: Action[];
  let onPopStateSubject: ReplaySubject<Navigation>;
  let pushStateSpy: jasmine.Spy;
  let getHashSpy: jasmine.Spy;
  let getPathSpy: jasmine.Spy;
  let getSearchSpy: jasmine.Spy;
  let serializeStateToQueryParamsSpy: jasmine.Spy;
  let deserializeQueryParamsSpy: jasmine.Spy;

  beforeEach(async () => {
    action = new ReplaySubject<Action>(1);

    serializeStateToQueryParamsSpy = jasmine
      .createSpy()
      .and.returnValue(of([]));
    deserializeQueryParamsSpy = jasmine.createSpy().and.returnValue({a: 1});
    function routeFactory() {
      return [
        {
          routeKind: RouteKind.EXPERIMENT,
          path: '/experiment/:experimentId',
          ngComponent: TestableComponent,
        },
        {
          routeKind: RouteKind.EXPERIMENTS,
          path: '/experiments',
          ngComponent: TestableComponent,
          defaultRoute: true,
        },
        {
          routeKind: RouteKind.COMPARE_EXPERIMENT,
          path: '/compare',
          ngComponent: TestableComponent,
          deepLinkProvider: {
            serializeStateToQueryParams: serializeStateToQueryParamsSpy,
            deserializeQueryParams: deserializeQueryParamsSpy,
          },
        },
        {
          routeKind: RouteKind.UNKNOWN,
          path: '/no_deeplink_unknown_route',
          ngComponent: TestableComponent,
        },
        {
          path: '/redirect_no_query/:wildcard',
          redirector: (pathParts: string[]) => {
            return {
              pathParts: pathParts.slice(1),
            };
          },
        },
        {
          path: '/redirect_query/:wildcard',
          redirector: (pathParts: string[]) => {
            return {
              pathParts: pathParts.slice(1),
              queryParams: [{key: 'hard', value: 'coded'}],
            };
          },
        },
      ];
    }

    function programmaticalNavToListviewFactory() {
      return {
        actionCreator: testAction,
        lambda: (action: ReturnType<typeof testAction>) => {
          return {
            routeKind: RouteKind.EXPERIMENTS,
            routeParams: {},
          } as NavigateToExperiments;
        },
      };
    }

    function programmaticalCompareNavigationFactory() {
      return {
        actionCreator: testNavToCompareAction,
        lambda: (action: ReturnType<typeof testNavToCompareAction>) => {
          return {
            routeKind: RouteKind.COMPARE_EXPERIMENT,
            routeParams: action,
          } as NavigateToCompare;
        },
      };
    }

    function dirtyUpdatesFactory() {
      return testDirtyExperimentsSelector;
    }

    await TestBed.configureTestingModule({
      imports: [
        RouteRegistryModule.registerRoutes(routeFactory),
        ProgrammaticalNavigationModule.registerProgrammaticalNavigation(
          programmaticalNavToListviewFactory
        ),
        ProgrammaticalNavigationModule.registerProgrammaticalNavigation(
          programmaticalCompareNavigationFactory
        ),
        DirtyUpdatesRegistryModule.registerDirtyUpdates<State>(
          dirtyUpdatesFactory
        ),
      ],
      providers: [
        provideMockActions(action),
        AppRoutingEffects,
        provideMockStore(),
        provideLocationTesting(),
        {
          provide: AppRootProvider,
          useClass: TestableAppRootProvider,
        },
        DirtyUpdatesRegistryModule,
      ],
    }).compileComponents();

    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;

    actualActions = [];

    location = TestBed.inject(TestableLocation) as Location;
    onPopStateSubject = new ReplaySubject<Navigation>(1);
    spyOn(location, 'onPopState').and.returnValue(onPopStateSubject);
    pushStateSpy = spyOn(location, 'pushState');
    getHashSpy = spyOn(location, 'getHash').and.returnValue('');
    getPathSpy = spyOn(location, 'getPath').and.returnValue('');
    getSearchSpy = spyOn(location, 'getSearch').and.returnValue([]);

    store.overrideSelector(getActiveRoute, null);
    actualActions = [];

    spyOn(store, 'dispatch').and.callFake((action: Action) => {
      actualActions.push(action);
    });
  });

  describe('bootstrapReducers$', () => {
    beforeEach(() => {
      effects = TestBed.inject(AppRoutingEffects);
      effects.bootstrapReducers$.subscribe((action) => {
        actualActions.push(action);
      });
    });

    it(
      'grabs registered route kinds from the registry and dispatches ' +
        'routeConfigLoaded',
      () => {
        const registry = TestBed.inject(RouteRegistryModule);
        spyOn(registry, 'getRegisteredRouteKinds').and.returnValue(
          new Set([RouteKind.EXPERIMENT, RouteKind.EXPERIMENTS])
        );
        action.next(effects.ngrxOnInitEffects());

        expect(actualActions).toEqual([
          actions.routeConfigLoaded({
            routeKinds: new Set([RouteKind.EXPERIMENT, RouteKind.EXPERIMENTS]),
          }),
        ]);
      }
    );
  });

  describe('navigate$', () => {
    beforeEach(() => {
      effects = TestBed.inject(AppRoutingEffects);
      effects.navigate$.subscribe((action) => {
        actualActions.push(action);
      });
    });

    afterEach(fakeAsync(() => {
      // Flush away all the asychronusity scheduled.
      flush();
    }));

    it(
      'fires navigating and navigated when current activeRoute differs from ' +
        'new route',
      fakeAsync(() => {
        store.overrideSelector(getActiveRoute, null);
        store.refreshState();

        action.next(
          actions.navigationRequested({
            pathname: '/experiments',
          })
        );

        expect(actualActions).toEqual([
          actions.navigating({
            after: buildRoute({
              routeKind: RouteKind.EXPERIMENTS,
              params: {},
              pathname: '/experiments',
              queryParams: [],
            }),
          }),
        ]);

        tick();
        expect(actualActions).toEqual([
          jasmine.any(Object),
          actions.navigated({
            before: null,
            after: buildRoute({
              routeKind: RouteKind.EXPERIMENTS,
              params: {},
              pathname: '/experiments',
              queryParams: [],
            }),
          }),
        ]);
      })
    );

    it('reacts to browser popstate', () => {
      onPopStateSubject.next({
        pathname: '/experiments',
      });

      expect(actualActions).toEqual([
        actions.navigating({
          after: buildRoute({
            routeKind: RouteKind.EXPERIMENTS,
            params: {},
            pathname: '/experiments',
            queryParams: [],
            navigationOptions: {
              replaceState: false,
            },
          }),
        }),
      ]);
    });

    describe('dispatchNavigating$ with dirty updates', () => {
      beforeEach(() => {
        const activeRoute = buildRoute({
          routeKind: RouteKind.EXPERIMENTS,
          pathname: '/experiments',
          queryParams: [],
          navigationOptions: {
            replaceState: false,
          },
        });
        const dirtyExperimentsFactory = () => {
          return {experimentIds: ['otter']};
        };

        store.overrideSelector(getActiveRoute, activeRoute);
        store.overrideSelector(
          testDirtyExperimentsSelector,
          dirtyExperimentsFactory()
        );
        store.refreshState();
      });

      it('does not break when there are no dirty experiments selectors', () => {
        const registryModule = TestBed.inject(DirtyUpdatesRegistryModule);
        spyOn(registryModule, 'getDirtyUpdatesSelectors').and.returnValue([]);

        action.next(
          actions.navigationRequested({
            pathname: '/experiment/meow',
          })
        );

        expect(actualActions).toEqual([
          actions.navigating({
            after: buildRoute({
              routeKind: RouteKind.EXPERIMENT,
              params: {experimentId: 'meow'},
              pathname: '/experiment/meow',
              queryParams: [],
            }),
          }),
        ]);
      });

      it('warns user when navigating away', () => {
        spyOn(window, 'confirm');
        action.next(
          actions.navigationRequested({
            pathname: '/experiment/meow',
          })
        );

        expect(window.confirm).toHaveBeenCalledWith(
          'You have unsaved edits, are you sure you want to discard them?'
        );
      });

      it('does not warn user when changing tab (same routeId)', fakeAsync(() => {
        spyOn(window, 'confirm');
        const activeRoute = buildRoute({
          routeKind: RouteKind.EXPERIMENT,
          params: {experimentId: 'meow'},
          pathname: '/experiment/meow',
          queryParams: [],
        });
        store.overrideSelector(getActiveRoute, activeRoute);
        store.refreshState();
        getPathSpy.and.returnValue('/experiment/meow');
        // Changing tab.
        getHashSpy.and.returnValue('#foo');
        action.next(actions.navigationRequested(activeRoute));
        tick();

        expect(window.confirm).not.toHaveBeenCalled();
        expect(actualActions).toEqual([
          actions.navigating({
            after: activeRoute,
          }),
          actions.navigated({
            before: activeRoute,
            after: activeRoute,
          }),
        ]);
      }));

      it('noops if user cancels navigation', () => {
        spyOn(window, 'confirm').and.returnValue(false);
        action.next(
          actions.navigationRequested({
            pathname: '/experiment/meow',
          })
        );

        expect(window.confirm).toHaveBeenCalledTimes(1);
        expect(actualActions).toEqual([]);
      });

      it(
        'fires discardDirtyUpdates, navigating and navigated if user ' +
          'discards dirty updates',
        fakeAsync(() => {
          spyOn(window, 'confirm').and.returnValue(true);
          action.next(
            actions.navigationRequested({
              pathname: '/experiment/meow',
            })
          );

          expect(window.confirm).toHaveBeenCalledTimes(1);

          expect(actualActions).toEqual([
            actions.discardDirtyUpdates(),
            actions.navigating({
              after: buildRoute({
                routeKind: RouteKind.EXPERIMENT,
                params: {experimentId: 'meow'},
                pathname: '/experiment/meow',
                queryParams: [],
              }),
            }),
          ]);

          tick();
          expect(actualActions).toEqual([
            actions.discardDirtyUpdates(),
            actions.navigating({
              after: buildRoute({
                routeKind: RouteKind.EXPERIMENT,
                params: {experimentId: 'meow'},
                pathname: '/experiment/meow',
                queryParams: [],
              }),
            }),
            actions.navigated({
              before: buildRoute({
                routeKind: RouteKind.EXPERIMENTS,
                params: {},
                pathname: '/experiments',
                queryParams: [],
              }),
              after: buildRoute({
                routeKind: RouteKind.EXPERIMENT,
                params: {experimentId: 'meow'},
                pathname: '/experiment/meow',
                queryParams: [],
              }),
            }),
          ]);
        })
      );
    });

    describe('order of events', () => {
      it(
        'dispatches navigating, waits (for UI to clear prev route page), ' +
          'changes url, then dispatches navigated',
        fakeAsync(() => {
          store.overrideSelector(getActiveRoute, null);
          store.refreshState();

          action.next(
            actions.navigationRequested({
              pathname: '/experiments',
            })
          );

          expect(actualActions).toEqual([
            actions.navigating({
              after: buildRoute({
                routeKind: RouteKind.EXPERIMENTS,
                params: {},
                pathname: '/experiments',
                queryParams: [],
              }),
            }),
          ]);
          expect(pushStateSpy).not.toHaveBeenCalled();

          tick();

          expect(pushStateSpy).toHaveBeenCalledOnceWith('/experiments');

          expect(actualActions).toEqual([
            jasmine.any(Object),
            actions.navigated({
              before: null,
              after: buildRoute({
                routeKind: RouteKind.EXPERIMENTS,
                params: {},
                pathname: '/experiments',
                queryParams: [],
              }),
            }),
          ]);
        })
      );
    });

    describe('deeplink reads', () => {
      beforeEach(() => {
        store.overrideSelector(getActiveRoute, null);
        store.refreshState();
      });

      [
        {
          name: 'init',
          actionCreator: () => {
            action.next(TEST_ONLY.initAction());
          },
        },
        {
          name: 'popstate',
          actionCreator: () => {
            onPopStateSubject.next({pathname: '/compare'});
          },
        },
      ].forEach(({actionCreator, name}) => {
        it(`dispatches stateRehydratedFromUrl on browser initiated ${name}`, fakeAsync(() => {
          deserializeQueryParamsSpy.and.returnValue({a: 'A', b: 'B'});
          getPathSpy.and.returnValue('/compare');

          actionCreator();
          tick();

          expect(actualActions).toEqual([
            actions.stateRehydratedFromUrl({
              routeKind: RouteKind.COMPARE_EXPERIMENT,
              partialState: {a: 'A', b: 'B'},
            }),
            actions.navigating({
              after: buildRoute({
                routeKind: RouteKind.COMPARE_EXPERIMENT,
                params: {},
                pathname: '/compare',
                queryParams: [],
                // Do not care about the replaceState for this spec.
                navigationOptions: jasmine.any(Object),
              } as unknown as Route),
            }),
            actions.navigated({
              before: null,
              after: buildRoute({
                routeKind: RouteKind.COMPARE_EXPERIMENT,
                params: {},
                pathname: '/compare',
                queryParams: [],
                navigationOptions: jasmine.any(Object),
              } as unknown as Route),
            }),
          ]);
        }));
      });
    });

    describe('deeplinks writes', () => {
      let serializeStateToQueryParamsSubject: ReplaySubject<SerializableQueryParams>;

      beforeEach(() => {
        serializeStateToQueryParamsSubject = new ReplaySubject(1);
        serializeStateToQueryParamsSpy.and.returnValue(
          serializeStateToQueryParamsSubject
        );
        store.overrideSelector(getActiveRoute, null);
        store.refreshState();
      });

      it(
        'waits for deeplink state to provide values before dispatching' +
          ' navigating',
        fakeAsync(() => {
          action.next(actions.navigationRequested({pathname: '/compare'}));

          expect(actualActions).toEqual([]);

          serializeStateToQueryParamsSubject.next([]);
          tick();

          expect(actualActions).toEqual([
            actions.navigating({
              after: buildRoute({
                routeKind: RouteKind.COMPARE_EXPERIMENT,
                params: {},
                pathname: '/compare',
                queryParams: [],
                navigationOptions: {replaceState: false},
              }),
            }),
            actions.navigated({
              before: null,
              after: buildRoute({
                routeKind: RouteKind.COMPARE_EXPERIMENT,
                params: {},
                pathname: '/compare',
                queryParams: [],
                navigationOptions: {replaceState: false},
              }),
            }),
          ]);
        })
      );

      it('fires actions when store emits changes', fakeAsync(() => {
        action.next(actions.navigationRequested({pathname: '/compare'}));

        serializeStateToQueryParamsSubject.next([]);
        tick();

        serializeStateToQueryParamsSubject.next([{key: 'a', value: 'a_value'}]);
        tick();

        expect(actualActions).toEqual([
          // already tested by test spec above.
          jasmine.any(Object),
          jasmine.any(Object),
          actions.navigating({
            after: buildRoute({
              routeKind: RouteKind.COMPARE_EXPERIMENT,
              params: {},
              pathname: '/compare',
              queryParams: [{key: 'a', value: 'a_value'}],
              navigationOptions: {replaceState: true},
            }),
          }),
          actions.navigated({
            before: null,
            after: buildRoute({
              routeKind: RouteKind.COMPARE_EXPERIMENT,
              params: {},
              pathname: '/compare',
              queryParams: [{key: 'a', value: 'a_value'}],
              navigationOptions: {replaceState: true},
            }),
          }),
        ]);
      }));

      it(
        'fires actions with replaceState = true to prevent pushing new ' +
          'history entry on state changes',
        fakeAsync(() => {
          action.next(actions.navigationRequested({pathname: '/compare'}));

          serializeStateToQueryParamsSubject.next([]);
          tick();

          serializeStateToQueryParamsSubject.next([
            {key: 'a', value: 'a_value'},
          ]);
          tick();

          expect(actualActions).toEqual([
            jasmine.any(Object),
            jasmine.any(Object),
            actions.navigating({
              after: buildRoute({
                routeKind: RouteKind.COMPARE_EXPERIMENT,
                params: {},
                pathname: '/compare',
                queryParams: [{key: 'a', value: 'a_value'}],
                navigationOptions: {replaceState: true},
              }),
            }),
            actions.navigated({
              before: null,
              after: buildRoute({
                routeKind: RouteKind.COMPARE_EXPERIMENT,
                params: {},
                pathname: '/compare',
                queryParams: [{key: 'a', value: 'a_value'}],
                navigationOptions: {replaceState: true},
              }),
            }),
          ]);
        })
      );
    });

    describe('bootstrap', () => {
      it('does not fire navigated when effects inits right away', () => {
        getPathSpy.and.returnValue('/experiments');
        getSearchSpy.and.returnValue([]);

        action.next(effects.ngrxOnInitEffects());

        expect(actualActions).toEqual([]);
      });

      it('fires navigated when effects inits after a tick', fakeAsync(() => {
        getPathSpy.and.returnValue('/experiments');
        getSearchSpy.and.returnValue([]);

        action.next(effects.ngrxOnInitEffects());

        tick();

        expect(actualActions).toEqual([
          jasmine.any(Object),
          jasmine.any(Object),
        ]);
      }));

      it('fires navigated with replaceState = true', fakeAsync(() => {
        getPathSpy.and.returnValue('/experiments');
        getSearchSpy.and.returnValue([]);

        action.next(effects.ngrxOnInitEffects());

        tick();

        expect(actualActions).toEqual([
          actions.navigating({
            after: buildRoute({
              routeKind: RouteKind.EXPERIMENTS,
              params: {},
              pathname: '/experiments',
              queryParams: [],
              navigationOptions: {
                replaceState: true,
              },
            }),
          }),
          actions.navigated({
            before: null,
            after: buildRoute({
              routeKind: RouteKind.EXPERIMENTS,
              params: {},
              pathname: '/experiments',
              queryParams: [],
              navigationOptions: {
                replaceState: true,
              },
            }),
          }),
        ]);
      }));

      describe('programmatical navigation integration', () => {
        it('redirects without query parameter', fakeAsync(() => {
          getPathSpy.and.returnValue('/redirect_no_query/compare');
          getSearchSpy.and.returnValue([]);
          deserializeQueryParamsSpy.and.returnValue({});

          action.next(effects.ngrxOnInitEffects());

          tick();

          expect(actualActions).toEqual([
            actions.stateRehydratedFromUrl({
              routeKind: RouteKind.COMPARE_EXPERIMENT,
              partialState: {},
            }),
            actions.navigating({
              after: buildRoute({
                routeKind: RouteKind.COMPARE_EXPERIMENT,
                params: {},
                pathname: '/compare',
                queryParams: [],
                navigationOptions: {
                  replaceState: true,
                },
              }),
            }),
            jasmine.any(Object),
          ]);
        }));

        it('redirects with query parameter', fakeAsync(() => {
          getPathSpy.and.returnValue('/redirect_query/compare');
          getSearchSpy.and.returnValue([{key: 'not', value: 'used'}]);
          // Query paramter formed by the redirector is passed to the
          // deserializer instead of one from Location.getSearch(). This
          // behavior emulates redirected URL to be on the URL bar. That is,
          // when passing through the redirection flow, the actual URL on the
          // location bar is pre-redirection, "/redirect_query/compare". If
          // redirector wants to "set" href to "/compare?foo=bar", the query
          // parameter has to come from the redirector, not from the URL bar.
          deserializeQueryParamsSpy
            .withArgs([{key: 'hard', value: 'coded'}])
            .and.returnValue({good: 'value'})
            .and.throwError('Invalid');
          serializeStateToQueryParamsSpy.and.returnValue(of([]));

          action.next(effects.ngrxOnInitEffects());

          tick();

          expect(actualActions).toEqual([
            actions.stateRehydratedFromUrl({
              routeKind: RouteKind.COMPARE_EXPERIMENT,
              partialState: {good: 'value'},
            }),
            actions.navigating({
              after: buildRoute({
                routeKind: RouteKind.COMPARE_EXPERIMENT,
                params: {},
                pathname: '/compare',
                // Query parameter comes from DeepLinkProvider
                // (serializeStateToQueryParamsSpy) in this case, not
                // redirector. Query parameter of redirector is fed into
                // deserializer instead.
                queryParams: [],
                navigationOptions: {
                  replaceState: true,
                },
              }),
            }),
            jasmine.any(Object),
          ]);
        }));

        it('redirects with query parameter to no deepLinkProvider', fakeAsync(() => {
          getPathSpy.and.returnValue(
            '/redirect_query/no_deeplink_unknown_route'
          );
          getSearchSpy.and.returnValue([{key: 'not', value: 'used'}]);
          deserializeQueryParamsSpy.and.throwError('Invalid');
          serializeStateToQueryParamsSpy.and.throwError('Invalid');

          action.next(effects.ngrxOnInitEffects());

          tick();

          expect(actualActions).toEqual([
            actions.navigating({
              after: buildRoute({
                routeKind: RouteKind.UNKNOWN,
                params: {},
                pathname: '/no_deeplink_unknown_route',
                queryParams: [],
                navigationOptions: {
                  replaceState: true,
                },
              }),
            }),
            jasmine.any(Object),
          ]);
        }));
      });
    });

    it('resolves pathname from navigationRequest', () => {
      const getResolvePathSpy = spyOn(
        location,
        'getResolvedPath'
      ).and.returnValue('/experiments');
      store.overrideSelector(getActiveRoute, null);
      store.refreshState();

      action.next(
        actions.navigationRequested({
          pathname: '../experiments',
        })
      );

      expect(actualActions).toEqual([
        actions.navigating({
          after: buildRoute({
            routeKind: RouteKind.EXPERIMENTS,
            params: {},
            pathname: '/experiments',
            queryParams: [],
          }),
        }),
      ]);
      expect(getResolvePathSpy).toHaveBeenCalledWith('../experiments');
    });

    it('fires action even when prev route is the same as new route', fakeAsync(() => {
      store.overrideSelector(
        getActiveRoute,
        buildRoute({
          routeKind: RouteKind.EXPERIMENTS,
          pathname: '/experiments',
          queryParams: [],
        })
      );
      store.refreshState();

      action.next(
        actions.navigationRequested({
          pathname: '/experiments',
        })
      );

      tick();
      expect(actualActions).toEqual([
        actions.navigating({
          after: buildRoute({
            routeKind: RouteKind.EXPERIMENTS,
            pathname: '/experiments',
            queryParams: [],
          }),
        }),
        actions.navigated({
          before: buildRoute({
            routeKind: RouteKind.EXPERIMENTS,
            pathname: '/experiments',
            queryParams: [],
          }),
          after: buildRoute({
            routeKind: RouteKind.EXPERIMENTS,
            pathname: '/experiments',
            queryParams: [],
          }),
        }),
      ]);
    }));

    describe('programmatical navigation', () => {
      it('navigates on the action', () => {
        store.overrideSelector(getActiveRoute, null);
        store.refreshState();

        action.next(testAction());

        expect(actualActions).toEqual([
          actions.navigating({
            after: buildRoute({
              routeKind: RouteKind.EXPERIMENTS,
              params: {},
              pathname: '/experiments',
              queryParams: [],
            }),
          }),
        ]);
      });

      it('translates programmatical compare nav correctly', () => {
        store.overrideSelector(getActiveRoute, null);
        store.refreshState();

        action.next(
          testNavToCompareAction({
            aliasAndExperimentIds: [
              {alias: 'bar', id: 'foo'},
              {alias: 'omega', id: 'alpha'},
            ],
          })
        );

        expect(actualActions).toEqual([
          actions.navigating({
            after: buildRoute({
              routeKind: RouteKind.COMPARE_EXPERIMENT,
              params: {
                experimentIds: 'bar:foo,omega:alpha',
              },
              pathname: '/compare',
              queryParams: [],
            }),
          }),
        ]);
      });
    });

    describe('url changes', () => {
      let replaceStateSpy: jasmine.Spy;

      beforeEach(() => {
        replaceStateSpy = spyOn(location, 'replaceState');
      });

      function navigateAndExpect(
        navigation: Navigation | Route,
        expected: {pushStateUrl: null | string; replaceStateUrl: null | string}
      ) {
        fakeAsync(() => {
          action.next(actions.navigationRequested(navigation));

          tick();
          if (expected.pushStateUrl === null) {
            expect(pushStateSpy).not.toHaveBeenCalled();
          } else {
            expect(pushStateSpy).toHaveBeenCalledWith(expected.pushStateUrl);
          }

          if (expected.replaceStateUrl === null) {
            expect(replaceStateSpy).not.toHaveBeenCalled();
          } else {
            expect(replaceStateSpy).toHaveBeenCalledWith(
              expected.replaceStateUrl
            );
          }
        })();
      }

      it('noops if the new route matches current URL', () => {
        const activeRoute = buildRoute({
          routeKind: RouteKind.EXPERIMENTS,
          pathname: '/experiments',
          queryParams: [],
          navigationOptions: {
            replaceState: false,
          },
        });
        store.overrideSelector(getActiveRoute, activeRoute);
        store.refreshState();
        getHashSpy.and.returnValue('');
        getPathSpy.and.returnValue('/experiments');
        getSearchSpy.and.returnValue([]);

        navigateAndExpect(activeRoute, {
          pushStateUrl: null,
          replaceStateUrl: null,
        });
      });

      it('pushes state if path and search do not match new route on navigated', () => {
        const activeRoute = buildRoute({
          routeKind: RouteKind.EXPERIMENTS,
          pathname: '/experiments',
          queryParams: [],
          navigationOptions: {
            replaceState: false,
          },
        });
        store.overrideSelector(getActiveRoute, activeRoute);
        store.refreshState();
        getHashSpy.and.returnValue('');
        getPathSpy.and.returnValue('meow');
        getSearchSpy.and.returnValue([]);

        navigateAndExpect(
          {pathname: '/experiment/123'},
          {
            pushStateUrl: '/experiment/123',
            replaceStateUrl: null,
          }
        );
      });

      it('replaces state if route navigationOption says so', () => {
        const activeRoute = buildRoute({
          routeKind: RouteKind.EXPERIMENTS,
          pathname: '/experiments',
          queryParams: [],
          navigationOptions: {
            replaceState: true,
          },
        });
        store.overrideSelector(getActiveRoute, activeRoute);
        store.refreshState();
        getHashSpy.and.returnValue('');
        getPathSpy.and.returnValue('meow');
        getSearchSpy.and.returnValue([]);

        navigateAndExpect(
          {pathname: '/experiments', replaceState: true},
          {
            pushStateUrl: null,
            replaceStateUrl: '/experiments',
          }
        );
      });

      it('preserves hash upon replace for initial navigation', () => {
        store.overrideSelector(getActiveRoute, null);
        store.refreshState();
        getHashSpy.and.returnValue('#foo');
        getPathSpy.and.returnValue('meow');
        getSearchSpy.and.returnValue([]);

        navigateAndExpect(
          {pathname: '/experiments', replaceState: true},
          {
            pushStateUrl: null,
            replaceStateUrl: '/experiments#foo',
          }
        );
      });

      // This hash preservation spec may become obsolete. If we enable app_routing
      // to properly set the URL hash, and all TB embedders use app_routing, then
      // this spec can be removed.
      it('preserves hash upon navigations to the same route id', () => {
        const activeRoute = buildRoute({
          routeKind: RouteKind.EXPERIMENT,
          pathname: '/experiment',
          params: {experimentId: '123'},
          queryParams: [],
          navigationOptions: {
            replaceState: true,
          },
        });
        const nextActiveRoute = buildRoute({
          routeKind: RouteKind.EXPERIMENT,
          pathname: '/experiment',
          queryParams: [{key: 'q', value: 'new_value'}],
          navigationOptions: {
            replaceState: true,
          },
        });
        store.overrideSelector(getActiveRoute, activeRoute);
        store.refreshState();
        getHashSpy.and.returnValue('#foo');
        getPathSpy.and.returnValue('meow');
        getSearchSpy.and.returnValue([]);

        navigateAndExpect(
          {pathname: '/experiment/123', replaceState: true},
          {
            pushStateUrl: null,
            replaceStateUrl: '/experiment/123#foo',
          }
        );
      });

      it('discards hash upon navigations to a new route id', () => {
        const activeRoute = buildRoute({
          routeKind: RouteKind.EXPERIMENTS,
          pathname: '/experiments',
          queryParams: [],
          navigationOptions: {
            replaceState: true,
          },
        });

        store.overrideSelector(getActiveRoute, activeRoute);
        store.refreshState();
        getHashSpy.and.returnValue('#foo');
        getPathSpy.and.returnValue('meow');
        getSearchSpy.and.returnValue([]);

        navigateAndExpect(
          {pathname: '/experiment/123', replaceState: true},
          {
            pushStateUrl: null,
            replaceStateUrl: '/experiment/123',
          }
        );
      });
    });
  });

  describe('path_prefix support', () => {
    function setAppRootAndSubscribe(appRoot: string) {
      const provider = TestBed.inject(
        AppRootProvider
      ) as TestableAppRootProvider;
      provider.setAppRoot(appRoot);

      effects = TestBed.inject(AppRoutingEffects);
      effects.navigate$.subscribe((action) => {
        actualActions.push(action);
      });
    }

    let getResolvedPathSpy: jasmine.Spy;

    beforeEach(() => {
      getResolvedPathSpy = spyOn(location, 'getResolvedPath')
        .withArgs('/experiment/123')
        .and.returnValue('/experiment/123')
        .withArgs('/experiments')
        .and.returnValue('/experiments');
    });

    it('navigates to default route if popstated to path without prefix', fakeAsync(() => {
      setAppRootAndSubscribe('/foo/bar/');

      onPopStateSubject.next({
        pathname: '/meow',
      });

      expect(actualActions).toEqual([
        actions.navigating({
          after: buildRoute({
            routeKind: RouteKind.EXPERIMENTS,
            params: {},
            pathname: '/experiments',
            queryParams: [],
            navigationOptions: {
              replaceState: false,
            },
          }),
        }),
      ]);

      tick();
    }));

    it('navigates to a matching route if popstated to path with prefix', fakeAsync(() => {
      setAppRootAndSubscribe('/foo/bar/');

      onPopStateSubject.next({
        pathname: '/foo/bar/experiment/123',
      });

      expect(actualActions).toEqual([
        actions.navigating({
          after: buildRoute({
            routeKind: RouteKind.EXPERIMENT,
            params: {experimentId: '123'},
            pathname: '/experiment/123',
            queryParams: [],
            navigationOptions: {
              replaceState: false,
            },
          }),
        }),
      ]);

      tick();
    }));

    it('navigates with appRoot aware path when navRequest with absPath', fakeAsync(() => {
      setAppRootAndSubscribe('/foo/bar/');

      // Do note that this path name does not contain the appRoot.
      action.next(actions.navigationRequested({pathname: '/experiment/123'}));

      expect(actualActions).toEqual([
        actions.navigating({
          after: buildRoute({
            routeKind: RouteKind.EXPERIMENT,
            params: {experimentId: '123'},
            pathname: '/experiment/123',
            queryParams: [],
            navigationOptions: {
              replaceState: false,
            },
          }),
        }),
      ]);

      tick();
    }));

    it('navigates with appRoot aware path when navRequest with relPath', fakeAsync(() => {
      setAppRootAndSubscribe('/foo/bar/');

      getResolvedPathSpy
        .withArgs('../experiment/123')
        .and.returnValue('/foo/bar/experiment/123');

      // Do note that this path name does not contain the appRoot.
      action.next(actions.navigationRequested({pathname: '../experiment/123'}));

      expect(actualActions).toEqual([
        actions.navigating({
          after: buildRoute({
            routeKind: RouteKind.EXPERIMENT,
            params: {experimentId: '123'},
            pathname: '/experiment/123',
            queryParams: [],
            navigationOptions: {
              replaceState: false,
            },
          }),
        }),
      ]);

      tick();
    }));

    describe('change url', () => {
      it('navigates to URL with path prefix prefixed', fakeAsync(() => {
        setAppRootAndSubscribe('/foo/bar/baz/');

        store.overrideSelector(getActiveRoute, null);
        store.refreshState();
        getHashSpy.and.returnValue('');
        getPathSpy.and.returnValue('');
        getSearchSpy.and.returnValue([]);

        action.next(
          actions.navigationRequested({
            pathname: '/experiments',
          })
        );

        tick();

        expect(pushStateSpy).toHaveBeenCalledWith('/foo/bar/baz/experiments');
      }));
    });
  });
});
