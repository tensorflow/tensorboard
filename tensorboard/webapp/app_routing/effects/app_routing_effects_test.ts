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
import {Action, createAction, Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {of, ReplaySubject} from 'rxjs';

import {State} from '../../app_state';
import * as actions from '../actions';
import {navigationRequested} from '../actions';
import {AppRootProvider, TestableAppRootProvider} from '../app_root';
import {Location} from '../location';
import {
  NavigateToExperiments,
  ProgrammaticalNavigationModule,
} from '../programmatical_navigation_module';
import {RouteRegistryModule} from '../route_registry_module';
import {getActiveRoute} from '../store/app_routing_selectors';
import {buildRoute, provideLocationTesting, TestableLocation} from '../testing';
import {Navigation, Route, RouteKind, SerializableQueryParams} from '../types';

import {AppRoutingEffects, TEST_ONLY} from './app_routing_effects';

@Component({selector: 'test', template: ''})
class TestableComponent {}

const testAction = createAction('[TEST] test actions');

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
      ];
    }

    function programmaticalNavigationFactory() {
      return {
        actionCreator: testAction,
        lambda: (action: typeof testAction) => {
          return {
            routeKind: RouteKind.EXPERIMENTS,
            routeParams: {},
          } as NavigateToExperiments;
        },
      };
    }

    await TestBed.configureTestingModule({
      imports: [
        RouteRegistryModule.registerRoutes(routeFactory),
        ProgrammaticalNavigationModule.registerProgrammaticalNavigation(
          programmaticalNavigationFactory
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
  });

  describe('fireNavigatedIfValidRoute$', () => {
    let actualActions: Action[];

    beforeEach(() => {
      effects = TestBed.inject(AppRoutingEffects);
      actualActions = [];

      spyOn(store, 'dispatch').and.callFake((action: Action) => {
        actualActions.push(action);
      });
      effects.fireNavigatedIfValidRoute$.subscribe((action) => {
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
              after: buildRoute(({
                routeKind: RouteKind.COMPARE_EXPERIMENT,
                params: {},
                pathname: '/compare',
                queryParams: [],
                // Do not care about the replaceState for this spec.
                navigationOptions: jasmine.any(Object),
              } as unknown) as Route),
            }),
            actions.navigated({
              before: null,
              after: buildRoute(({
                routeKind: RouteKind.COMPARE_EXPERIMENT,
                params: {},
                pathname: '/compare',
                queryParams: [],
                navigationOptions: jasmine.any(Object),
              } as unknown) as Route),
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
    });
  });

  describe('changeBrowserUrl$', () => {
    let replaceStateSpy: jasmine.Spy;

    beforeEach(() => {
      effects = TestBed.inject(AppRoutingEffects);
      effects.changeBrowserUrl$.subscribe(() => {});
      replaceStateSpy = spyOn(location, 'replaceState');
    });

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

      action.next(
        actions.navigated({
          before: null,
          after: activeRoute,
        })
      );

      expect(pushStateSpy).not.toHaveBeenCalled();
      expect(replaceStateSpy).not.toHaveBeenCalled();
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

      action.next(
        actions.navigated({
          before: null,
          after: activeRoute,
        })
      );

      expect(pushStateSpy).toHaveBeenCalledWith('/experiments');
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

      action.next(
        actions.navigated({
          before: null,
          after: activeRoute,
        })
      );

      expect(pushStateSpy).not.toHaveBeenCalled();
      expect(replaceStateSpy).toHaveBeenCalledWith('/experiments');
    });

    it('preserves hash upon replace for initial navigation', () => {
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

      action.next(
        actions.navigated({
          before: null,
          after: activeRoute,
        })
      );

      expect(replaceStateSpy).toHaveBeenCalledWith('/experiments#foo');
    });

    // This hash preservation spec may become obsolete. If we enable app_routing
    // to properly set the URL hash, and all TB embedders use app_routing, then
    // this spec can be removed.
    it('preserves hash upon navigations to the same route id', () => {
      const activeRoute = buildRoute({
        routeKind: RouteKind.EXPERIMENT,
        pathname: '/experiment',
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
      store.overrideSelector(getActiveRoute, nextActiveRoute);
      store.refreshState();
      getHashSpy.and.returnValue('#foo');
      getPathSpy.and.returnValue('meow');
      getSearchSpy.and.returnValue([]);

      action.next(
        actions.navigated({
          before: activeRoute,
          after: nextActiveRoute,
        })
      );

      expect(replaceStateSpy).toHaveBeenCalledWith(
        '/experiment?q=new_value#foo'
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
      const nextActiveRoute = buildRoute({
        routeKind: RouteKind.EXPERIMENT,
        pathname: '/experiment',
        // Changing route params produces a new route id.
        params: {experimentId: '123'},
        queryParams: [],
        navigationOptions: {
          replaceState: true,
        },
      });
      store.overrideSelector(getActiveRoute, nextActiveRoute);
      store.refreshState();
      getHashSpy.and.returnValue('#foo');
      getPathSpy.and.returnValue('meow');
      getSearchSpy.and.returnValue([]);

      action.next(
        actions.navigated({
          before: activeRoute,
          after: nextActiveRoute,
        })
      );

      expect(replaceStateSpy).toHaveBeenCalledWith('/experiment');
    });
  });

  describe('path_prefix support', () => {
    function setAppRootAndSubscribe(appRoot: string) {
      const provider = TestBed.inject(
        AppRootProvider
      ) as TestableAppRootProvider;
      provider.setAppRoot(appRoot);

      effects = TestBed.inject(AppRoutingEffects);
      const dispatchSpy = spyOn(store, 'dispatch');
      effects.fireNavigatedIfValidRoute$.subscribe((action) => {
        actualActions.push(action);
      });

      actualActions = [];
      dispatchSpy.and.callFake((action: Action) => {
        actualActions.push(action);
      });

      effects.changeBrowserUrl$.subscribe(() => {});
    }

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
      action.next(navigationRequested({pathname: '/experiment/123'}));

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

      spyOn(location, 'getResolvedPath')
        .withArgs('../experiment/123')
        .and.returnValue('/foo/bar/experiment/123');

      // Do note that this path name does not contain the appRoot.
      action.next(navigationRequested({pathname: '../experiment/123'}));

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
        getPathSpy.and.returnValue('');
        getSearchSpy.and.returnValue([]);

        action.next(
          actions.navigated({
            before: null,
            after: activeRoute,
          })
        );

        expect(pushStateSpy).toHaveBeenCalledWith('/foo/bar/baz/experiments');
      }));
    });
  });
});
