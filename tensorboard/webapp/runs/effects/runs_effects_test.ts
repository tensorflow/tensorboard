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
import {TestBed} from '@angular/core/testing';
import {provideMockActions} from '@ngrx/effects/testing';
import {Action, Store} from '@ngrx/store';
import {MockStore} from '@ngrx/store/testing';
import {of, ReplaySubject} from 'rxjs';
import {
  buildCompareRoute,
  buildExperimentRouteFromId,
  buildNavigatedAction,
  buildRoute,
} from '../../app_routing/testing';
import {RouteKind} from '../../app_routing/types';
import {State} from '../../app_state';
import * as coreActions from '../../core/actions';
import * as hparamsActions from '../../hparams/_redux/hparams_actions';
import {
  getActiveRoute,
  getExperimentIdsFromRoute,
  getRuns,
  getRunsLoadState,
} from '../../selectors';
import {provideMockTbStore} from '../../testing/utils';
import {DataLoadState} from '../../types/data';
import * as actions from '../actions';
import {HparamsAndMetadata, Run} from '../data_source/runs_data_source_types';
import {
  buildHparamsAndMetadata,
  provideTestingRunsDataSource,
  TestingRunsDataSource,
} from '../data_source/testing';
import {RunsEffects} from './index';
import {ColumnHeaderType} from '../../widgets/data_table/types';

function createRun(override: Partial<Run> = {}) {
  return {
    id: '123',
    name: 'foo',
    startTime: 0,
    ...override,
  };
}

describe('runs_effects', () => {
  let runsDataSource: TestingRunsDataSource;
  let effects: RunsEffects;
  let store: MockStore<State>;
  let action: ReplaySubject<Action>;
  let fetchRunsSubjects: Array<ReplaySubject<Run[]>>;
  let fetchHparamsMetadataSubjects: Array<ReplaySubject<HparamsAndMetadata>>;
  let dispatchSpy: jasmine.Spy;
  let actualActions: Action[];
  let selectSpy: jasmine.Spy;

  function flushFetchRuns(requestIndex: number, runs: Run[]) {
    expect(fetchRunsSubjects.length).toBeGreaterThan(requestIndex);
    fetchRunsSubjects[requestIndex].next(runs);
    fetchRunsSubjects[requestIndex].complete();
  }

  function flushRunsError(requestIndex: number) {
    expect(fetchRunsSubjects.length).toBeGreaterThan(requestIndex);
    fetchRunsSubjects[requestIndex].error(new ErrorEvent('error'));
    fetchRunsSubjects[requestIndex].complete();
  }

  function flushFetchHparamsMetadata(
    requestIndex: number,
    metadata: HparamsAndMetadata
  ) {
    expect(fetchHparamsMetadataSubjects.length).toBeGreaterThan(requestIndex);
    fetchHparamsMetadataSubjects[requestIndex].next(metadata);
    fetchHparamsMetadataSubjects[requestIndex].complete();
  }

  beforeEach(async () => {
    action = new ReplaySubject<Action>(1);

    await TestBed.configureTestingModule({
      providers: [
        provideMockActions(action),
        RunsEffects,
        provideMockTbStore(),
        provideTestingRunsDataSource(),
      ],
    }).compileComponents();

    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    selectSpy = spyOn(store, 'select').and.callThrough();

    actualActions = [];
    dispatchSpy = spyOn(store, 'dispatch').and.callFake((action: Action) => {
      actualActions.push(action);
    });
    effects = TestBed.inject(RunsEffects);
    runsDataSource = TestBed.inject(TestingRunsDataSource);
    fetchRunsSubjects = [];
    spyOn(runsDataSource, 'fetchRuns').and.callFake(() => {
      const subject = new ReplaySubject<Run[]>(1);
      fetchRunsSubjects.push(subject);
      return subject;
    });

    fetchHparamsMetadataSubjects = [];
    spyOn(runsDataSource, 'fetchHparamsMetadata').and.callFake(() => {
      const subject = new ReplaySubject<HparamsAndMetadata>(1);
      fetchHparamsMetadataSubjects.push(subject);
      return subject;
    });

    store.overrideSelector(getRunsLoadState, {
      state: DataLoadState.NOT_LOADED,
      lastLoadedTimeInMs: 0,
    });
    store.overrideSelector(getExperimentIdsFromRoute, null);
    store.overrideSelector(getActiveRoute, buildRoute());
  });

  afterEach(() => {
    store?.resetSelectors();
  });

  describe('loadRunsOnRunTableShown', () => {
    beforeEach(() => {
      // Subscribes to effects.loadRunsOnRunTableShown$ change. Must subscribe
      // after settings the action payload before.
      effects.loadRunsOnRunTableShown$.subscribe(() => {});
    });

    [
      {
        runLoadState: DataLoadState.NOT_LOADED,
      },
      {
        runLoadState: DataLoadState.FAILED,
      },
    ].forEach(({runLoadState}) => {
      it(
        'fetches runs and hparams when runLoadState is ' +
          DataLoadState[runLoadState],
        () => {
          store.overrideSelector(getRunsLoadState, {
            state: runLoadState,
            lastLoadedTimeInMs: 0,
          });
          // Force store to emit change and make selector to fetch the latest
          // data.
          store.refreshState();

          action.next(actions.runTableShown({experimentIds: ['a']}));
          const createRuns = () => [
            createRun({
              id: 'a/runA',
              name: 'runA',
            }),
            createRun({
              id: 'a/runA/runB',
              name: 'runA/runB',
            }),
          ];
          flushFetchRuns(0, createRuns());
          flushFetchHparamsMetadata(
            0,
            buildHparamsAndMetadata({
              runToHparamsAndMetrics: {
                'a/runA': {hparams: [{name: 'param', value: 1}], metrics: []},
              },
            })
          );

          const expectedExperimentId = 'a';

          expect(actualActions).toEqual([
            actions.fetchRunsRequested({
              experimentIds: [expectedExperimentId],
              requestedExperimentIds: [expectedExperimentId],
            }),
            actions.fetchRunsSucceeded({
              experimentIds: ['a'],
              runsForAllExperiments: createRuns(),
              newRunsAndMetadata: {
                [expectedExperimentId]: {
                  runs: createRuns(),
                  metadata: buildHparamsAndMetadata({
                    runToHparamsAndMetrics: {
                      'a/runA': {
                        hparams: [{name: 'param', value: 1}],
                        metrics: [],
                      },
                    },
                  }),
                },
              },
            }),
          ]);
        }
      );
    });

    [
      {
        runLoadState: DataLoadState.LOADED,
      },
      {
        runLoadState: DataLoadState.LOADING,
      },
    ].forEach(({runLoadState}) => {
      it(`does not fetch runs when runLoadState is ${DataLoadState[runLoadState]}`, () => {
        store.overrideSelector(getRunsLoadState, {
          state: runLoadState,
          lastLoadedTimeInMs: 0,
        });
        store.refreshState();

        action.next(actions.runTableShown({experimentIds: ['a']}));

        expect(fetchRunsSubjects.length).toBe(0);

        expect(actualActions).toEqual([]);
      });
    });

    it('fires FAILED action when failed to fetch runs', () => {
      action.next(actions.runTableShown({experimentIds: ['a']}));
      const expectedExperimentId = 'a';

      expect(fetchRunsSubjects.length).toBe(1);
      flushRunsError(0);

      expect(actualActions).toEqual([
        actions.fetchRunsRequested({
          experimentIds: [expectedExperimentId],
          requestedExperimentIds: [expectedExperimentId],
        }),
        actions.fetchRunsFailed({
          experimentIds: [expectedExperimentId],
          requestedExperimentIds: [expectedExperimentId],
        }),
      ]);
    });

    it('fires FAILED action when failed to fetch hparams', () => {
      action.next(actions.runTableShown({experimentIds: ['a']}));
      const expectedExperimentId = 'a';

      fetchHparamsMetadataSubjects[0].error(new ErrorEvent('error'));
      fetchHparamsMetadataSubjects[0].complete();

      expect(actualActions).toEqual([
        actions.fetchRunsRequested({
          experimentIds: [expectedExperimentId],
          requestedExperimentIds: [expectedExperimentId],
        }),
        actions.fetchRunsFailed({
          experimentIds: [expectedExperimentId],
          requestedExperimentIds: [expectedExperimentId],
        }),
      ]);
    });

    it('allows concurrent requests that arrive out of order', () => {
      const firstExperimentId = 'a';
      const secondExperimentId = 'b';

      action.next(actions.runTableShown({experimentIds: [firstExperimentId]}));
      action.next(actions.runTableShown({experimentIds: [secondExperimentId]}));

      // fetchRuns are still pending.
      expect(actualActions).toEqual([
        actions.fetchRunsRequested({
          experimentIds: [firstExperimentId],
          requestedExperimentIds: [firstExperimentId],
        }),
        actions.fetchRunsRequested({
          experimentIds: [secondExperimentId],
          requestedExperimentIds: [secondExperimentId],
        }),
      ]);

      const RUN_A = createRun({id: '0', name: 'runA'});
      const RUN_B = createRun({id: '1', name: 'runB'});
      const RUN_B_1 = createRun({id: '2', name: 'runB/1'});
      // fetchRuns arrived out of order.
      expect(fetchRunsSubjects.length).toBe(2);
      flushFetchRuns(1, [RUN_B, RUN_B_1]);
      flushFetchHparamsMetadata(1, buildHparamsAndMetadata({}));
      flushFetchRuns(0, [RUN_A]);
      flushFetchHparamsMetadata(0, buildHparamsAndMetadata({}));

      expect(actualActions).toEqual([
        actions.fetchRunsRequested({
          experimentIds: [firstExperimentId],
          requestedExperimentIds: [firstExperimentId],
        }),
        actions.fetchRunsRequested({
          experimentIds: [secondExperimentId],
          requestedExperimentIds: [secondExperimentId],
        }),
        actions.fetchRunsSucceeded({
          experimentIds: ['b'],
          runsForAllExperiments: [RUN_B, RUN_B_1],
          newRunsAndMetadata: {
            [secondExperimentId]: {
              runs: [RUN_B, RUN_B_1],
              metadata: buildHparamsAndMetadata({}),
            },
          },
        }),
        actions.fetchRunsSucceeded({
          experimentIds: ['a'],
          runsForAllExperiments: [RUN_A],
          newRunsAndMetadata: {
            [firstExperimentId]: {
              runs: [RUN_A],
              metadata: buildHparamsAndMetadata({}),
            },
          },
        }),
      ]);
    });
  });

  describe('loadRunsOnNavigationOrReload', () => {
    beforeEach(() => {
      effects.loadRunsOnNavigationOrReload$.subscribe(() => {});
    });

    [
      {specAction: buildNavigatedAction, specName: 'navigation'},
      {specAction: coreActions.manualReload, specName: 'manual reload'},
      {specAction: coreActions.reload, specName: 'auto reload'},
    ].forEach(({specAction, specName}) => {
      describe(`on ${specName}`, () => {
        it(`fetches runs and hparams based on expIds in the route`, () => {
          store.overrideSelector(
            getActiveRoute,
            buildCompareRoute(['exp1:123', 'exp2:456'])
          );
          store.overrideSelector(getExperimentIdsFromRoute, ['123', '456']);
          const createFooRuns = () => [
            createRun({
              id: 'foo/runA',
              name: 'runA',
            }),
          ];
          const createBarRuns = () => [
            createRun({
              id: 'bar/runB',
              name: 'runB',
            }),
          ];
          store.refreshState();

          action.next(specAction());
          // Flush second request first to spice things up.
          flushFetchRuns(1, createBarRuns());
          flushFetchHparamsMetadata(1, buildHparamsAndMetadata({}));
          flushFetchRuns(0, createFooRuns());
          flushFetchHparamsMetadata(0, buildHparamsAndMetadata({}));

          expect(actualActions).toEqual([
            actions.fetchRunsRequested({
              experimentIds: ['123', '456'],
              requestedExperimentIds: ['123', '456'],
            }),
            actions.fetchRunsSucceeded({
              experimentIds: ['123', '456'],
              runsForAllExperiments: [...createFooRuns(), ...createBarRuns()],
              newRunsAndMetadata: {
                456: {
                  runs: createBarRuns(),
                  metadata: buildHparamsAndMetadata({}),
                },
                123: {
                  runs: createFooRuns(),
                  metadata: buildHparamsAndMetadata({}),
                },
              },
            }),
          ]);
        });

        it('fetches only runs that are not loading', () => {
          const createFooRuns = () => [
            createRun({
              id: 'foo/runA',
              name: 'runA',
            }),
          ];
          const createBarRuns = () => [
            createRun({
              id: 'bar/runB',
              name: 'runB',
            }),
          ];

          const get123LoadState = new ReplaySubject(1);
          get123LoadState.next({
            state: DataLoadState.LOADING,
            lastLoadedTimeInMs: 0,
          });
          selectSpy
            .withArgs(getRuns, {experimentId: '123'})
            .and.returnValue(of(createFooRuns()));
          selectSpy
            .withArgs(getRuns, {experimentId: '456'})
            .and.returnValue(of(createBarRuns()));
          selectSpy
            .withArgs(getRunsLoadState, {experimentId: '123'})
            .and.returnValue(get123LoadState);
          selectSpy
            .withArgs(getRunsLoadState, {experimentId: '456'})
            .and.returnValue(
              of({
                state: DataLoadState.NOT_LOADED,
                lastLoadedTimeInMs: null,
              })
            );
          store.overrideSelector(
            getActiveRoute,
            buildCompareRoute(['exp1:123', ' exp2:456'])
          );
          store.overrideSelector(getExperimentIdsFromRoute, ['123', '456']);
          store.refreshState();

          action.next(specAction());
          flushFetchRuns(0, createBarRuns());
          flushFetchHparamsMetadata(0, buildHparamsAndMetadata({}));

          expect(actualActions).toEqual([
            actions.fetchRunsRequested({
              experimentIds: ['123', '456'],
              requestedExperimentIds: ['456'],
            }),
          ]);

          // Since the stream is waiting until the loading runs are
          // resolved, we need to change the load state in order to get the
          // `fetchRunsSucceeded`.
          get123LoadState.next({
            state: DataLoadState.LOADED,
            lastLoadedTimeInMs: 123,
          });

          expect(actualActions).toEqual([
            actions.fetchRunsRequested({
              experimentIds: ['123', '456'],
              requestedExperimentIds: ['456'],
            }),
            actions.fetchRunsSucceeded({
              experimentIds: ['123', '456'],
              runsForAllExperiments: [...createFooRuns(), ...createBarRuns()],
              newRunsAndMetadata: {
                456: {
                  runs: createBarRuns(),
                  metadata: buildHparamsAndMetadata({}),
                },
              },
            }),
          ]);
        });
      });
    });

    [
      {specAction: buildNavigatedAction, specName: 'navigation'},
      {specAction: coreActions.manualReload, specName: 'manual reload'},
      {specAction: coreActions.reload, specName: 'auto reload'},
    ].forEach(({specAction, specName}) => {
      it(`does not fetch runs on card route when action is ${specName}`, () => {
        store.overrideSelector(getActiveRoute, {
          routeKind: RouteKind.CARD,
          params: {},
        });
        store.refreshState();

        action.next(specAction());

        expect(actualActions).toEqual([]);
      });
    });

    describe('on navigation', () => {
      it('fetches for runs if not loaded before', () => {
        const createFooRuns = () => [
          createRun({
            id: 'foo/runA',
            name: 'runA',
          }),
        ];
        const createBarRuns = () => [
          createRun({
            id: 'bar/runB',
            name: 'runB',
          }),
        ];

        selectSpy
          .withArgs(getRuns, {experimentId: '123'})
          .and.returnValue(of(createFooRuns()));
        selectSpy
          .withArgs(getRuns, {experimentId: '456'})
          .and.returnValue(of(createBarRuns()));
        selectSpy
          .withArgs(getRunsLoadState, {experimentId: '123'})
          .and.returnValue(
            of({
              state: DataLoadState.LOADED,
              lastLoadedTimeInMs: 0,
            })
          );
        selectSpy
          .withArgs(getRunsLoadState, {experimentId: '456'})
          .and.returnValue(
            of({
              state: DataLoadState.NOT_LOADED,
              lastLoadedTimeInMs: null,
            })
          );
        store.overrideSelector(
          getActiveRoute,
          buildCompareRoute(['exp1:123', ' exp2:456'])
        );
        store.overrideSelector(getExperimentIdsFromRoute, ['123', '456']);
        store.refreshState();

        action.next(buildNavigatedAction());
        flushFetchRuns(0, createBarRuns());
        flushFetchHparamsMetadata(0, buildHparamsAndMetadata({}));

        expect(actualActions).toEqual([
          actions.fetchRunsRequested({
            experimentIds: ['123', '456'],
            requestedExperimentIds: ['456'],
          }),
          actions.fetchRunsSucceeded({
            experimentIds: ['123', '456'],
            runsForAllExperiments: [...createFooRuns(), ...createBarRuns()],
            newRunsAndMetadata: {
              456: {
                runs: createBarRuns(),
                metadata: buildHparamsAndMetadata({}),
              },
            },
          }),
        ]);
      });

      it('ignores a navigation to same route and experiments (hash changes)', () => {
        store.overrideSelector(getActiveRoute, buildRoute());
        store.overrideSelector(getExperimentIdsFromRoute, ['123']);
        const createFooRuns = () => [
          createRun({
            id: 'foo/runA',
            name: 'runA',
          }),
        ];

        selectSpy
          .withArgs(getRuns, {experimentId: '123'})
          .and.returnValue(of(createFooRuns()));
        store.overrideSelector(getRunsLoadState, {
          state: DataLoadState.LOADED,
          lastLoadedTimeInMs: 0,
        });
        store.refreshState();

        // Only the first one goes through.
        action.next(buildNavigatedAction());

        expect(actualActions).toEqual([
          actions.fetchRunsRequested({
            experimentIds: ['123'],
            requestedExperimentIds: [],
          }),
          actions.fetchRunsSucceeded({
            experimentIds: ['123'],
            runsForAllExperiments: [...createFooRuns()],
            newRunsAndMetadata: {},
          }),
        ]);

        action.next(buildNavigatedAction());
        action.next(buildNavigatedAction());
        expect(actualActions.length).toBe(2);
      });

      it('dispatches fetchRunsSucceeded even if data is already loaded', () => {
        const createFooRuns = () => [
          createRun({
            id: 'foo/runA',
            name: 'runA',
          }),
        ];

        selectSpy
          .withArgs(getRuns, {experimentId: 'foo'})
          .and.returnValue(of(createFooRuns()));
        selectSpy
          .withArgs(getRunsLoadState, {experimentId: 'foo'})
          .and.returnValue(
            of({
              state: DataLoadState.LOADED,
              lastLoadedTimeInMs: 0,
            })
          );
        store.overrideSelector(getExperimentIdsFromRoute, ['foo']);
        store.refreshState();

        action.next(buildNavigatedAction());

        expect(actualActions).toEqual([
          actions.fetchRunsRequested({
            experimentIds: ['foo'],
            requestedExperimentIds: [],
          }),
          actions.fetchRunsSucceeded({
            experimentIds: ['foo'],
            runsForAllExperiments: [...createFooRuns()],
            newRunsAndMetadata: {},
          }),
        ]);
      });
    });

    it('does not hang because one run failed to fetch', () => {
      store.overrideSelector(
        getActiveRoute,
        buildCompareRoute(['exp1:123', 'exp2:456'])
      );
      store.overrideSelector(getExperimentIdsFromRoute, ['123', '456']);
      store.refreshState();

      action.next(buildNavigatedAction());

      flushRunsError(0);
      flushFetchRuns(1, [createRun({id: 'bar/runB', name: 'runB'})]);
      flushFetchHparamsMetadata(0, buildHparamsAndMetadata({}));
      flushFetchHparamsMetadata(1, buildHparamsAndMetadata({}));

      expect(actualActions).toEqual([
        actions.fetchRunsRequested({
          experimentIds: ['123', '456'],
          requestedExperimentIds: ['123', '456'],
        }),
        actions.fetchRunsFailed({
          experimentIds: ['123', '456'],
          requestedExperimentIds: ['123', '456'],
        }),
      ]);
    });

    it('does not cancel request even if user navigates away', () => {
      store.overrideSelector(getActiveRoute, buildExperimentRouteFromId('123'));
      store.overrideSelector(getExperimentIdsFromRoute, ['123']);

      const createFooRuns = () => [
        createRun({
          id: 'foo/runA',
          name: 'runA',
        }),
      ];
      const createBarRuns = () => [
        createRun({
          id: 'bar/runB',
          name: 'runB',
        }),
      ];
      store.refreshState();

      action.next(buildNavigatedAction());

      // Emulate navigation to a new experiment route.
      store.overrideSelector(getActiveRoute, buildExperimentRouteFromId('456'));
      store.overrideSelector(getExperimentIdsFromRoute, ['456']);
      // Force selectors to re-evaluate with a change in store.
      store.refreshState();

      action.next(buildNavigatedAction());

      flushFetchRuns(1, createBarRuns());
      flushFetchHparamsMetadata(1, buildHparamsAndMetadata({}));
      flushFetchRuns(0, createFooRuns());
      flushFetchHparamsMetadata(0, buildHparamsAndMetadata({}));

      expect(actualActions).toEqual([
        actions.fetchRunsRequested({
          experimentIds: ['123'],
          requestedExperimentIds: ['123'],
        }),
        actions.fetchRunsRequested({
          experimentIds: ['456'],
          requestedExperimentIds: ['456'],
        }),
        actions.fetchRunsSucceeded({
          experimentIds: ['456'],
          runsForAllExperiments: createBarRuns(),
          newRunsAndMetadata: {
            456: {runs: createBarRuns(), metadata: buildHparamsAndMetadata({})},
          },
        }),
        actions.fetchRunsSucceeded({
          experimentIds: ['123'],
          runsForAllExperiments: createFooRuns(),
          newRunsAndMetadata: {
            123: {runs: createFooRuns(), metadata: buildHparamsAndMetadata({})},
          },
        }),
      ]);
    });

    it('fires FAILED action when at least one runs fetch failed', () => {
      store.overrideSelector(
        getActiveRoute,
        buildCompareRoute(['exp1:123', 'exp2:456'])
      );
      store.overrideSelector(getExperimentIdsFromRoute, ['123', '456']);
      store.refreshState();

      action.next(buildNavigatedAction());

      flushRunsError(0);
      flushFetchHparamsMetadata(0, buildHparamsAndMetadata({}));
      flushFetchRuns(1, []);
      flushFetchHparamsMetadata(1, buildHparamsAndMetadata({}));

      expect(actualActions).toEqual([
        actions.fetchRunsRequested({
          experimentIds: ['123', '456'],
          requestedExperimentIds: ['123', '456'],
        }),
        actions.fetchRunsFailed({
          experimentIds: ['123', '456'],
          requestedExperimentIds: ['123', '456'],
        }),
      ]);
    });

    it('fires FAILED action when at least one hparams fetch failed', () => {
      store.overrideSelector(
        getActiveRoute,
        buildCompareRoute(['exp1:123', 'exp2:456'])
      );
      store.overrideSelector(getExperimentIdsFromRoute, ['123', '456']);
      store.refreshState();

      action.next(buildNavigatedAction());

      flushFetchRuns(0, [createRun({id: 'foo/runA', name: 'runA'})]);
      fetchHparamsMetadataSubjects[0].error(new ErrorEvent('error'));
      fetchHparamsMetadataSubjects[0].complete();
      flushFetchRuns(1, []);
      flushFetchHparamsMetadata(1, buildHparamsAndMetadata({}));

      expect(actualActions).toEqual([
        actions.fetchRunsRequested({
          experimentIds: ['123', '456'],
          requestedExperimentIds: ['123', '456'],
        }),
        actions.fetchRunsFailed({
          experimentIds: ['123', '456'],
          requestedExperimentIds: ['123', '456'],
        }),
      ]);
    });

    describe('multiple actions', () => {
      it('waits for already loading runs so actions do not fire out of order', () => {
        // When actions are fired out of order, then the list of runs can be
        // stale and lead to incorrect run selection.
        const createFooBeforeRuns = () => [
          createRun({
            id: 'foo/runA',
            name: 'runA',
          }),
        ];
        const createFooAfterRuns = () => [
          createRun({
            id: 'foo/runA',
            name: 'runA',
          }),
          createRun({
            id: 'foo/runB',
            name: 'runB',
          }),
        ];
        const createBarRuns = () => [
          createRun({
            id: 'bar/runB',
            name: 'runB',
          }),
        ];

        const runsSubject = new ReplaySubject(1);
        runsSubject.next(createFooBeforeRuns());
        const runsLoadStateSubject = new ReplaySubject(1);
        runsLoadStateSubject.next({
          state: DataLoadState.NOT_LOADED,
          lastLoadedTimeInMs: 0,
        });

        store.overrideSelector(getExperimentIdsFromRoute, ['foo']);
        selectSpy
          .withArgs(getRuns, {experimentId: 'foo'})
          .and.returnValue(runsSubject);
        selectSpy
          .withArgs(getRunsLoadState, {experimentId: 'foo'})
          .and.returnValue(runsLoadStateSubject);
        selectSpy
          .withArgs(getRuns, {experimentId: 'bar'})
          .and.returnValue(of(null));
        selectSpy
          .withArgs(getRunsLoadState, {experimentId: 'bar'})
          .and.returnValue(
            of({
              state: DataLoadState.NOT_LOADED,
              lastLoadedTimeInMs: 0,
            })
          );
        store.refreshState();

        // User triggered reload on `/experiment/foo/`
        action.next(coreActions.manualReload());

        // User navigates to `/compare/a:foo,b:bar/`
        store.overrideSelector(getExperimentIdsFromRoute, ['foo', 'bar']);
        runsLoadStateSubject.next({
          state: DataLoadState.LOADING,
          lastLoadedTimeInMs: 0,
        });
        store.refreshState();
        action.next(buildNavigatedAction());

        // Flush the request for `bar`'s runs.
        flushFetchRuns(1, createBarRuns());
        flushFetchHparamsMetadata(1, buildHparamsAndMetadata({}));

        // Flush the request for `foo`'s runs.
        flushFetchRuns(0, createFooAfterRuns());
        flushFetchHparamsMetadata(0, buildHparamsAndMetadata({}));
        runsSubject.next(createFooAfterRuns());
        runsLoadStateSubject.next({
          state: DataLoadState.LOADED,
          lastLoadedTimeInMs: 123,
        });

        expect(actualActions).toEqual([
          actions.fetchRunsRequested({
            experimentIds: ['foo'],
            requestedExperimentIds: ['foo'],
          }),
          actions.fetchRunsRequested({
            experimentIds: ['foo', 'bar'],
            requestedExperimentIds: ['bar'],
          }),
          actions.fetchRunsSucceeded({
            experimentIds: ['foo'],
            runsForAllExperiments: [...createFooAfterRuns()],
            newRunsAndMetadata: {
              foo: {
                runs: createFooAfterRuns(),
                metadata: buildHparamsAndMetadata({}),
              },
            },
          }),
          actions.fetchRunsSucceeded({
            experimentIds: ['foo', 'bar'],
            runsForAllExperiments: [
              ...createFooAfterRuns(),
              ...createBarRuns(),
            ],
            newRunsAndMetadata: {
              bar: {
                runs: createBarRuns(),
                metadata: buildHparamsAndMetadata({}),
              },
            },
          }),
        ]);
      });

      it('dispatches action when an already loading run fails to load', () => {
        const createFooRuns = () => [];

        const runsSubject = new ReplaySubject(1);
        runsSubject.next(createFooRuns());
        const runsLoadStateSubject = new ReplaySubject(1);
        runsLoadStateSubject.next({
          state: DataLoadState.NOT_LOADED,
          lastLoadedTimeInMs: 0,
        });

        store.overrideSelector(getExperimentIdsFromRoute, ['foo']);
        selectSpy
          .withArgs(getRuns, {experimentId: 'foo'})
          .and.returnValue(runsSubject);
        selectSpy
          .withArgs(getRunsLoadState, {experimentId: 'foo'})
          .and.returnValue(runsLoadStateSubject);
        store.refreshState();

        action.next(coreActions.reload());

        runsLoadStateSubject.next({
          state: DataLoadState.LOADING,
          lastLoadedTimeInMs: 0,
        });
        store.refreshState();
        action.next(coreActions.manualReload());

        flushRunsError(0);
        flushFetchHparamsMetadata(0, buildHparamsAndMetadata({}));
        runsLoadStateSubject.next({
          state: DataLoadState.FAILED,
          lastLoadedTimeInMs: 0,
        });

        expect(actualActions).toEqual([
          actions.fetchRunsRequested({
            experimentIds: ['foo'],
            requestedExperimentIds: ['foo'],
          }),
          actions.fetchRunsRequested({
            experimentIds: ['foo'],
            requestedExperimentIds: [],
          }),
          actions.fetchRunsFailed({
            experimentIds: ['foo'],
            requestedExperimentIds: ['foo'],
          }),
          actions.fetchRunsFailed({
            experimentIds: ['foo'],
            requestedExperimentIds: [],
          }),
        ]);
      });
    });
  });

  describe('removeHparamFilterWhenColumnIsRemoved$', () => {
    beforeEach(() => {
      effects.removeHparamFilterWhenColumnIsRemoved$.subscribe(() => {});
    });

    it('dispatches dashboardHparamFilterRemoved when column type is hparam', () => {
      action.next(
        actions.runsTableHeaderRemoved({
          header: {
            type: ColumnHeaderType.HPARAM,
            name: 'some_hparam',
            enabled: true,
            displayName: 'Some Hparam',
          },
        })
      );
      store.refreshState();

      expect(actualActions).toEqual([
        hparamsActions.dashboardHparamFilterRemoved({
          name: 'some_hparam',
        }),
      ]);
    });

    it('dispatches dashboardMetricFilterRemoved when column type is metric', () => {
      action.next(
        actions.runsTableHeaderRemoved({
          header: {
            type: ColumnHeaderType.METRIC,
            name: 'some_metric',
            enabled: true,
            displayName: 'Some Metric',
          },
        })
      );
      store.refreshState();

      expect(actualActions).toEqual([
        hparamsActions.dashboardMetricFilterRemoved({
          name: 'some_metric',
        }),
      ]);
    });
  });
});
