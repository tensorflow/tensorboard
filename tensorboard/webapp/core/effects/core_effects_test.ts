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
import {
  discardPeriodicTasks,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import {provideMockActions} from '@ngrx/effects/testing';
import {Action, Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {of, ReplaySubject, Subject} from 'rxjs';
import {
  getActiveRoute,
  getExperimentIdToExperimentAliasMap,
  getRouteKind,
} from '../../app_routing/store/app_routing_selectors';
import {
  buildCompareRoute,
  buildExperimentRouteFromId,
  buildNavigatedAction,
  buildRoute,
} from '../../app_routing/testing';
import {RouteKind} from '../../app_routing/types';
import {State} from '../../app_state';
import {getEnabledExperimentalPlugins} from '../../feature_flag/store/feature_flag_selectors';
import {PluginsListing} from '../../types/api';
import {DataLoadState} from '../../types/data';
import {
  HttpTestingController,
  TBHttpClientTestingModule,
} from '../../webapp_data_source/tb_http_client_testing';
import {TBServerDataSource} from '../../webapp_data_source/tb_server_data_source';
import * as coreActions from '../actions';
import {coreLoaded, polymerRunsFetchRequested} from '../actions';
import {
  getActivePlugin,
  getPluginsListLoaded,
  getPolymerRunsLoadState,
} from '../store';
import {
  createCoreState,
  createEnvironment,
  createPluginMetadata,
  createState,
} from '../testing';
import {PluginsListFailureCode, Run} from '../types';
import {CoreEffects, TEST_ONLY} from './core_effects';

describe('core_effects', () => {
  let httpMock: HttpTestingController;
  let coreEffects: CoreEffects;
  let action: ReplaySubject<Action>;
  let store: MockStore<Partial<State>>;
  let fetchEnvironment: jasmine.Spy;
  let fetchPolymerRunsSubjects: Array<Subject<Array<Run>>>;
  let recordedActions: Action[] = [];
  let createElementSpy;

  beforeEach(async () => {
    action = new ReplaySubject<Action>(1);

    const initialState = createState(
      createCoreState({
        pluginsListLoaded: {
          state: DataLoadState.NOT_LOADED,
          lastLoadedTimeInMs: null,
          failureCode: null,
        },
      })
    );
    await TestBed.configureTestingModule({
      imports: [TBHttpClientTestingModule],
      providers: [
        provideMockActions(action),
        CoreEffects,
        TBServerDataSource,
        provideMockStore({initialState}),
      ],
    }).compileComponents();

    fetchPolymerRunsSubjects = [];
    createElementSpy = spyOn(document, 'createElement');
    createElementSpy.withArgs('tf-backend').and.returnValue({
      tf_backend: {
        runsStore: {
          refresh() {
            const fetchRunSubject = new Subject<Array<Run>>();
            fetchPolymerRunsSubjects.push(fetchRunSubject);
            return fetchRunSubject;
          },
        },
      },
    } as unknown as HTMLElement);
    createElementSpy.and.callThrough();

    coreEffects = TestBed.inject(CoreEffects);
    httpMock = TestBed.inject(HttpTestingController);
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;

    recordedActions = [];
    spyOn(store, 'dispatch').and.callFake((action: Action) => {
      recordedActions.push(action);
    });

    const dataSource = TestBed.inject(TBServerDataSource);
    fetchEnvironment = spyOn(dataSource, 'fetchEnvironment')
      .withArgs()
      .and.returnValue(of(createEnvironment()));

    store.overrideSelector(getEnabledExperimentalPlugins, []);
    store.overrideSelector(getActiveRoute, buildExperimentRouteFromId('foo'));
    store.overrideSelector(getActivePlugin, null);
    store.overrideSelector(getExperimentIdToExperimentAliasMap, {});
    store.overrideSelector(getRouteKind, RouteKind.EXPERIMENT);
    store.overrideSelector(getPolymerRunsLoadState, {
      state: DataLoadState.NOT_LOADED,
      lastLoadedTimeInMs: null,
    });
  });

  afterEach(() => {
    httpMock.verify();
    store?.resetSelectors();
  });

  [
    {
      specSetName: '#navigated',
      onAction: buildNavigatedAction({
        after: buildRoute({routeKind: RouteKind.EXPERIMENT}),
      }),
    },
    {specSetName: '#coreLoaded (legacy)', onAction: coreActions.coreLoaded()},
    {specSetName: '#reload', onAction: coreActions.reload()},
    {specSetName: '#manualReload', onAction: coreActions.manualReload()},
  ].forEach(({specSetName, onAction}) => {
    describe(specSetName, () => {
      beforeEach(() => {
        coreEffects.fetchWebAppData$.subscribe(() => {});
      });

      it('fetches webapp data and fires success action', () => {
        store.overrideSelector(getEnabledExperimentalPlugins, []);
        store.refreshState();

        const pluginsListing: PluginsListing = {
          core: createPluginMetadata('Core'),
        };

        action.next(onAction);

        fetchPolymerRunsSubjects[0].next([{id: '1', name: 'Run 1'}]);
        fetchPolymerRunsSubjects[0].complete();
        // Flushing the request response invokes above subscription sychronously.
        httpMock.expectOne('data/plugins_listing').flush(pluginsListing);
        expect(fetchEnvironment).toHaveBeenCalled();

        expect(recordedActions).toEqual([
          coreActions.pluginsListingRequested(),
          coreActions.environmentLoaded({
            environment: createEnvironment(),
          }),
          coreActions.polymerRunsFetchRequested(),
          coreActions.polymerRunsFetchSucceeded(),
          coreActions.pluginsListingLoaded({
            plugins: pluginsListing,
          }),
        ]);
      });

      it('handles error when fetching webapp data', () => {
        action.next(onAction);

        httpMock
          .expectOne('data/plugins_listing')
          .error(new ErrorEvent('FakeError'), {status: 404});

        fetchPolymerRunsSubjects[0].error('No runs!');
        fetchPolymerRunsSubjects[0].complete();

        expect(recordedActions).toEqual([
          coreActions.pluginsListingRequested(),
          coreActions.environmentLoaded({
            environment: createEnvironment(),
          }),
          coreActions.polymerRunsFetchRequested(),
          coreActions.pluginsListingFailed({
            failureCode: PluginsListFailureCode.NOT_FOUND,
          }),
          coreActions.polymerRunsFetchFailed(),
        ]);
      });

      it(
        'appends query params to the data/plugins_listing when ' +
          'getEnabledExperimentalPlugins is non-empty',
        () => {
          store.overrideSelector(getEnabledExperimentalPlugins, [
            'alpha',
            'beta',
          ]);
          store.refreshState();

          const pluginsListing: PluginsListing = {
            core: createPluginMetadata('Core'),
          };

          action.next(onAction);
          // Flushing the request response invokes above subscription sychronously.
          httpMock
            .expectOne(
              'data/plugins_listing?experimentalPlugin=alpha&' +
                'experimentalPlugin=beta'
            )
            .flush(pluginsListing);

          expect(fetchEnvironment).toHaveBeenCalled();

          fetchPolymerRunsSubjects[0].next([{id: '1', name: 'Run 1'}]);
          fetchPolymerRunsSubjects[0].complete();
          expect(recordedActions).toEqual([
            coreActions.pluginsListingRequested(),
            coreActions.environmentLoaded({
              environment: createEnvironment(),
            }),
            coreActions.polymerRunsFetchRequested(),
            coreActions.pluginsListingLoaded({
              plugins: pluginsListing,
            }),
            coreActions.polymerRunsFetchSucceeded(),
          ]);
        }
      );

      it('ignores the action when loadState is loading', fakeAsync(() => {
        store.overrideSelector(
          getActiveRoute,
          buildExperimentRouteFromId('foo')
        );
        store.overrideSelector(getPluginsListLoaded, {
          state: DataLoadState.LOADING,
          lastLoadedTimeInMs: null,
          failureCode: null,
        });
        store.overrideSelector(getPolymerRunsLoadState, {
          state: DataLoadState.LOADING,
          lastLoadedTimeInMs: null,
        });
        store.refreshState();
        const pluginsListing: PluginsListing = {
          core: createPluginMetadata('Core'),
        };

        action.next(onAction);
        httpMock.expectNone('data/plugins_listing');

        action.next(onAction);
        httpMock.expectNone('data/plugins_listing');

        expect(recordedActions).toEqual([]);

        store.overrideSelector(getPluginsListLoaded, {
          state: DataLoadState.FAILED,
          lastLoadedTimeInMs: null,
          failureCode: PluginsListFailureCode.NOT_FOUND,
        });
        store.overrideSelector(getPolymerRunsLoadState, {
          state: DataLoadState.FAILED,
          lastLoadedTimeInMs: null,
        });
        store.overrideSelector(
          getActiveRoute,
          buildExperimentRouteFromId('bar')
        );
        store.refreshState();
        tick(TEST_ONLY.DATA_LOAD_CONDITIONAL_THROTTLE_IN_MS);

        action.next(onAction);
        httpMock.expectOne('data/plugins_listing').flush(pluginsListing);
        fetchPolymerRunsSubjects[0].next([{id: '1', name: 'Run 1'}]);
        fetchPolymerRunsSubjects[0].complete();
        expect(recordedActions).toEqual([
          coreActions.pluginsListingRequested(),
          coreActions.environmentLoaded({
            environment: createEnvironment(),
          }),
          coreActions.polymerRunsFetchRequested(),
          coreActions.pluginsListingLoaded({
            plugins: pluginsListing,
          }),
          coreActions.polymerRunsFetchSucceeded(),
        ]);

        store.overrideSelector(getPluginsListLoaded, {
          state: DataLoadState.LOADING,
          lastLoadedTimeInMs: null,
          failureCode: null,
        });
        store.overrideSelector(
          getActiveRoute,
          buildExperimentRouteFromId('baz')
        );
        store.refreshState();
        tick(TEST_ONLY.DATA_LOAD_CONDITIONAL_THROTTLE_IN_MS);

        action.next(onAction);
        httpMock.expectNone('data/plugins_listing');
        tick(TEST_ONLY.DATA_LOAD_CONDITIONAL_THROTTLE_IN_MS);
      }));
    });
  });

  describe('#navigated', () => {
    beforeEach(() => {
      coreEffects.fetchWebAppData$.subscribe(() => {});
    });

    it('ignores navigated when route is not changed', fakeAsync(() => {
      store.overrideSelector(getActiveRoute, buildExperimentRouteFromId('foo'));
      store.overrideSelector(getPluginsListLoaded, {
        state: DataLoadState.NOT_LOADED,
        lastLoadedTimeInMs: null,
        failureCode: null,
      });
      store.refreshState();

      action.next(
        buildNavigatedAction({
          after: buildRoute({routeKind: RouteKind.EXPERIMENT}),
        })
      );

      httpMock.expectOne('data/plugins_listing').flush({
        core: createPluginMetadata('Core'),
      } as PluginsListing);
      tick(TEST_ONLY.DATA_LOAD_CONDITIONAL_THROTTLE_IN_MS);

      action.next(
        buildNavigatedAction({
          after: buildRoute({routeKind: RouteKind.EXPERIMENT}),
        })
      );
      httpMock.expectNone('data/plugins_listing');
      tick(TEST_ONLY.DATA_LOAD_CONDITIONAL_THROTTLE_IN_MS);

      store.overrideSelector(getActiveRoute, buildExperimentRouteFromId('bar'));
      store.refreshState();
      action.next(
        buildNavigatedAction({
          after: buildRoute({routeKind: RouteKind.EXPERIMENT}),
        })
      );
      httpMock.expectOne('data/plugins_listing');
      tick(TEST_ONLY.DATA_LOAD_CONDITIONAL_THROTTLE_IN_MS);
    }));

    it('fetches polymer runs when alias map changes when in comparison', fakeAsync(() => {
      store.overrideSelector(getRouteKind, RouteKind.COMPARE_EXPERIMENT);
      store.overrideSelector(getActiveRoute, buildExperimentRouteFromId('foo'));
      store.overrideSelector(getExperimentIdToExperimentAliasMap, {
        eid1: {aliasText: 'alias 1', aliasNumber: 1},
        eid2: {aliasText: 'alias 2', aliasNumber: 2},
      });
      store.overrideSelector(getPluginsListLoaded, {
        state: DataLoadState.LOADED,
        lastLoadedTimeInMs: 5,
        failureCode: null,
      });
      store.overrideSelector(getPolymerRunsLoadState, {
        state: DataLoadState.NOT_LOADED,
        lastLoadedTimeInMs: null,
      });
      store.refreshState();
      const pluginsListing: PluginsListing = {
        core: createPluginMetadata('Core'),
      };

      action.next(
        buildNavigatedAction({
          after: buildRoute({routeKind: RouteKind.COMPARE_EXPERIMENT}),
        })
      );
      tick();

      httpMock.expectOne('data/plugins_listing').flush(pluginsListing);
      fetchPolymerRunsSubjects[0].next([{id: '1', name: 'Run 1'}]);
      fetchPolymerRunsSubjects[0].complete();

      // Do not really care about actions up to here; it is covered elsewhere.
      recordedActions = [];

      store.overrideSelector(getActiveRoute, buildExperimentRouteFromId('foo'));
      store.refreshState();
      tick(TEST_ONLY.DATA_LOAD_CONDITIONAL_THROTTLE_IN_MS);
      action.next(
        buildNavigatedAction({
          after: buildRoute({routeKind: RouteKind.COMPARE_EXPERIMENT}),
        })
      );
      tick(TEST_ONLY.ALIAS_CHANGE_RUNS_RELOAD_THROTTLE_IN_MS * 2);
      expect(recordedActions).toEqual([]);
      tick(TEST_ONLY.DATA_LOAD_CONDITIONAL_THROTTLE_IN_MS);

      store.overrideSelector(getExperimentIdToExperimentAliasMap, {
        eid1: {aliasText: 'alias 1', aliasNumber: 1},
        eid2: {aliasText: 'alias 2.1', aliasNumber: 2},
      });
      store.refreshState();
      tick(TEST_ONLY.ALIAS_CHANGE_RUNS_RELOAD_THROTTLE_IN_MS * 2);
      expect(recordedActions).toEqual([polymerRunsFetchRequested()]);

      // Alias map content is the same so nothing.
      store.overrideSelector(getExperimentIdToExperimentAliasMap, {
        eid1: {aliasText: 'alias 1', aliasNumber: 1},
        eid2: {aliasText: 'alias 2.1', aliasNumber: 2},
      });
      store.refreshState();
      tick(TEST_ONLY.ALIAS_CHANGE_RUNS_RELOAD_THROTTLE_IN_MS * 2);
      expect(recordedActions).toEqual([polymerRunsFetchRequested()]);

      // Alias map changes rapidly so we get request immediately once then once
      // again after the throttle time is over.
      store.overrideSelector(getExperimentIdToExperimentAliasMap, {
        eid1: {aliasText: 'alias 1', aliasNumber: 1},
        eid2: {aliasText: 'alias 2.2', aliasNumber: 2},
      });
      store.refreshState();

      store.overrideSelector(getExperimentIdToExperimentAliasMap, {
        eid1: {aliasText: 'alias 1', aliasNumber: 1},
        eid2: {aliasText: 'alias 2.1', aliasNumber: 2},
      });
      store.refreshState();
      tick();
      expect(recordedActions).toEqual([
        polymerRunsFetchRequested(),
        polymerRunsFetchRequested(),
      ]);

      tick(TEST_ONLY.ALIAS_CHANGE_RUNS_RELOAD_THROTTLE_IN_MS);
      expect(recordedActions).toEqual([
        polymerRunsFetchRequested(),
        polymerRunsFetchRequested(),
        polymerRunsFetchRequested(),
      ]);

      discardPeriodicTasks();
    }));

    it('fetches polymer runs when alias numbers change when in comparison', fakeAsync(() => {
      store.overrideSelector(getRouteKind, RouteKind.COMPARE_EXPERIMENT);
      store.overrideSelector(getExperimentIdToExperimentAliasMap, {
        eid1: {aliasText: 'alias 1', aliasNumber: 1},
        eid2: {aliasText: 'alias 2', aliasNumber: 2},
      });
      store.refreshState();
      const pluginsListing: PluginsListing = {
        core: createPluginMetadata('Core'),
      };

      action.next(
        buildNavigatedAction({
          after: buildRoute({routeKind: RouteKind.COMPARE_EXPERIMENT}),
        })
      );
      tick();

      httpMock.expectOne('data/plugins_listing').flush(pluginsListing);

      // Do not really care about actions up to here; it is covered elsewhere.
      recordedActions = [];

      store.overrideSelector(getExperimentIdToExperimentAliasMap, {
        eid1: {aliasText: 'alias 1', aliasNumber: 2},
        eid2: {aliasText: 'alias 2', aliasNumber: 1},
      });
      store.refreshState();
      tick(TEST_ONLY.ALIAS_CHANGE_RUNS_RELOAD_THROTTLE_IN_MS * 2);
      expect(recordedActions).toEqual([polymerRunsFetchRequested()]);

      discardPeriodicTasks();
    }));

    it(
      'does not react to alias change when navigated from COMPARE ' +
        'to EXPERIMENT',
      fakeAsync(() => {
        store.overrideSelector(getRouteKind, RouteKind.COMPARE_EXPERIMENT);
        store.overrideSelector(
          getActiveRoute,
          buildCompareRoute(['eid1:alias 1', 'eid2: alias 2'])
        );
        store.overrideSelector(getExperimentIdToExperimentAliasMap, {
          eid1: {aliasText: 'alias 1', aliasNumber: 1},
          eid2: {aliasText: 'alias 2', aliasNumber: 2},
        });
        store.overrideSelector(getPluginsListLoaded, {
          state: DataLoadState.LOADED,
          lastLoadedTimeInMs: 5,
          failureCode: null,
        });
        store.overrideSelector(getPolymerRunsLoadState, {
          state: DataLoadState.NOT_LOADED,
          lastLoadedTimeInMs: null,
        });
        store.refreshState();
        const pluginsListing: PluginsListing = {
          core: createPluginMetadata('Core'),
        };

        action.next(
          buildNavigatedAction({
            after: buildRoute({routeKind: RouteKind.COMPARE_EXPERIMENT}),
          })
        );
        tick();
        httpMock.expectOne('data/plugins_listing').flush(pluginsListing);
        fetchPolymerRunsSubjects[0].next([{id: '1', name: 'Run 1'}]);
        fetchPolymerRunsSubjects[0].complete();

        // Do not really care about actions up to here; it is covered elsewhere.

        recordedActions = [];

        store.overrideSelector(getRouteKind, RouteKind.EXPERIMENT);
        store.overrideSelector(
          getActiveRoute,
          buildExperimentRouteFromId('foo')
        );
        store.refreshState();

        tick(TEST_ONLY.DATA_LOAD_CONDITIONAL_THROTTLE_IN_MS);
        action.next(
          buildNavigatedAction({
            after: buildRoute({routeKind: RouteKind.EXPERIMENT}),
          })
        );

        httpMock.expectOne('data/plugins_listing').flush(pluginsListing);

        expect(recordedActions).toEqual([
          coreActions.pluginsListingRequested(),
          coreActions.environmentLoaded({
            environment: createEnvironment(),
          }),
          coreActions.polymerRunsFetchRequested(),
          coreActions.pluginsListingLoaded({
            plugins: pluginsListing,
          }),
        ]);
        tick(TEST_ONLY.DATA_LOAD_CONDITIONAL_THROTTLE_IN_MS);

        store.overrideSelector(getExperimentIdToExperimentAliasMap, {
          eid1: {aliasText: 'alias 1', aliasNumber: 1},
          eid2: {aliasText: 'alias 2.1', aliasNumber: 2},
        });
        store.refreshState();

        // Alias map changed but for the experiment route, it does not matter
        // and does not cause runs to be fetched.
        expect(recordedActions).toEqual([
          coreActions.pluginsListingRequested(),
          coreActions.environmentLoaded({
            environment: createEnvironment(),
          }),
          coreActions.polymerRunsFetchRequested(),
          coreActions.pluginsListingLoaded({
            plugins: pluginsListing,
          }),
        ]);
      })
    );

    it(
      'does not react to alias change when navigated from COMPARE ' +
        'to EXPERIMENTS',
      fakeAsync(() => {
        store.overrideSelector(getRouteKind, RouteKind.COMPARE_EXPERIMENT);
        store.overrideSelector(
          getActiveRoute,
          buildCompareRoute(['eid1:alias 1', 'eid2:alias 2'])
        );
        store.overrideSelector(getExperimentIdToExperimentAliasMap, {
          eid1: {aliasText: 'alias 1', aliasNumber: 1},
          eid2: {aliasText: 'alias 2', aliasNumber: 2},
        });
        store.overrideSelector(getPluginsListLoaded, {
          state: DataLoadState.LOADED,
          lastLoadedTimeInMs: 5,
          failureCode: null,
        });
        store.overrideSelector(getPolymerRunsLoadState, {
          state: DataLoadState.NOT_LOADED,
          lastLoadedTimeInMs: null,
        });
        store.refreshState();
        const pluginsListing: PluginsListing = {
          core: createPluginMetadata('Core'),
        };

        action.next(
          buildNavigatedAction({
            after: buildRoute({routeKind: RouteKind.COMPARE_EXPERIMENT}),
          })
        );
        tick();
        httpMock.expectOne('data/plugins_listing').flush(pluginsListing);
        fetchPolymerRunsSubjects[0].next([{id: '1', name: 'Run 1'}]);
        fetchPolymerRunsSubjects[0].complete();

        tick(TEST_ONLY.DATA_LOAD_CONDITIONAL_THROTTLE_IN_MS);

        // Do not really care about actions up to here; it is covered elsewhere.
        recordedActions = [];

        store.overrideSelector(getRouteKind, RouteKind.EXPERIMENTS);
        store.overrideSelector(getActiveRoute, buildRoute());
        // Alias map resets to an empty object when changing the routeKind.
        store.overrideSelector(getExperimentIdToExperimentAliasMap, {});
        store.refreshState();

        action.next(
          buildNavigatedAction({
            after: buildRoute({routeKind: RouteKind.EXPERIMENTS}),
          })
        );

        expect(recordedActions).toEqual([]);
        tick(TEST_ONLY.ALIAS_CHANGE_RUNS_RELOAD_THROTTLE_IN_MS * 2);
      })
    );
  });

  describe('#dispatchChangePlugin', () => {
    function createPluginsListing(): PluginsListing {
      return {foo: createPluginMetadata('Foo')};
    }

    beforeEach(() => {
      coreEffects.dispatchChangePlugin$.subscribe(() => {});
    });

    it('dispatches changePlugin when coreLoaded and activePlugin exists', () => {
      store.overrideSelector(getActivePlugin, 'foo');
      store.refreshState();

      action.next(coreActions.coreLoaded());

      expect(recordedActions).toEqual([
        coreActions.changePlugin({
          plugin: 'foo',
        }),
      ]);
    });

    it('does not dispatch when coreLoaded but activePlugin DNE', () => {
      store.overrideSelector(getActivePlugin, null);
      store.refreshState();

      action.next(coreActions.coreLoaded());

      expect(recordedActions).toEqual([]);
    });

    it('dispatches when plugins listing is loaded', () => {
      store.overrideSelector(getActivePlugin, 'foo');
      store.refreshState();

      action.next(
        coreActions.pluginsListingLoaded({plugins: createPluginsListing()})
      );

      expect(recordedActions).toEqual([
        coreActions.changePlugin({
          plugin: 'foo',
        }),
      ]);
    });

    it('does not dispatch when plugins listing loads no active plugin', () => {
      store.overrideSelector(getActivePlugin, null);
      store.refreshState();

      action.next(
        coreActions.pluginsListingLoaded({plugins: createPluginsListing()})
      );

      expect(recordedActions).toEqual([]);
    });

    it('does not dispatch on repeated plugins listing loads', () => {
      store.overrideSelector(getActivePlugin, 'foo');
      store.refreshState();

      action.next(
        coreActions.pluginsListingLoaded({plugins: createPluginsListing()})
      );

      expect(recordedActions).toEqual([
        coreActions.changePlugin({
          plugin: 'foo',
        }),
      ]);

      store.overrideSelector(getActivePlugin, 'bar');
      store.refreshState();

      expect(recordedActions).toEqual([
        coreActions.changePlugin({
          plugin: 'foo',
        }),
      ]);
    });

    it(
      'ignores plugins listing loaded when activePlugin was present at the time of' +
        ' coreLoaded',
      () => {
        store.overrideSelector(getActivePlugin, 'bar');
        store.refreshState();

        action.next(coreActions.coreLoaded());

        expect(recordedActions).toEqual([
          coreActions.changePlugin({
            plugin: 'bar',
          }),
        ]);

        store.overrideSelector(getActivePlugin, 'foo');
        store.refreshState();

        action.next(
          coreActions.pluginsListingLoaded({plugins: createPluginsListing()})
        );

        expect(recordedActions).toEqual([
          coreActions.changePlugin({
            plugin: 'bar',
          }),
        ]);
      }
    );
  });

  describe('legacy mode (no routes, coreLoaded)', () => {
    beforeEach(() => {
      coreEffects.fetchWebAppData$.subscribe(() => {});
    });

    it('fetches runs and plugins listing', fakeAsync(() => {
      store.overrideSelector(getRouteKind, RouteKind.NOT_SET);
      store.overrideSelector(getActiveRoute, buildExperimentRouteFromId('foo'));
      store.overrideSelector(getPluginsListLoaded, {
        state: DataLoadState.NOT_LOADED,
        lastLoadedTimeInMs: null,
        failureCode: null,
      });
      store.overrideSelector(getPolymerRunsLoadState, {
        state: DataLoadState.NOT_LOADED,
        lastLoadedTimeInMs: null,
      });
      store.refreshState();

      action.next(coreLoaded());

      const pluginsListing: PluginsListing = {
        core: createPluginMetadata('Core'),
      };
      httpMock.expectOne('data/plugins_listing').flush(pluginsListing);
      fetchPolymerRunsSubjects[0].next([{id: '1', name: 'Run 1'}]);
      fetchPolymerRunsSubjects[0].complete();

      expect(recordedActions).toEqual([
        coreActions.pluginsListingRequested(),
        coreActions.environmentLoaded({
          environment: createEnvironment(),
        }),
        coreActions.polymerRunsFetchRequested(),
        coreActions.pluginsListingLoaded({
          plugins: pluginsListing,
        }),
        coreActions.polymerRunsFetchSucceeded(),
      ]);

      discardPeriodicTasks();
    }));
  });
});
