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
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {of, Subject} from 'rxjs';
import {buildNavigatedAction, buildRoute} from '../../app_routing/testing';
import {RouteKind} from '../../app_routing/types';
import {State} from '../../app_state';
import * as coreActions from '../../core/actions';
import {getActivePlugin} from '../../core/store';
import * as coreTesting from '../../core/testing';
import * as selectors from '../../selectors';
import {LoadingMechanismType} from '../../types/api';
import {DataLoadState} from '../../types/data';
import {nextElementId} from '../../util/dom';
import {TBHttpClientTestingModule} from '../../webapp_data_source/tb_http_client_testing';
import * as actions from '../actions';
import {
  MetricsDataSource,
  METRICS_PLUGIN_ID,
  MultiRunPluginType,
  PluginType,
  SingleRunPluginType,
  TagMetadata,
  TimeSeriesRequest,
  TimeSeriesResponse,
  SavedPinsDataSource,
} from '../data_source';
import {getMetricsTagMetadataLoadState} from '../store';
import {
  appStateFromMetricsState,
  buildDataSourceTagMetadata,
  buildMetricsState,
  createCardMetadata,
  createScalarStepData,
  provideTestingMetricsDataSource,
  provideTestingSavedPinsDataSource,
} from '../testing';
import {CardId, TooltipSort} from '../types';
import {CardFetchInfo, MetricsEffects, TEST_ONLY} from './index';
import {buildMockState} from '../../testing/utils';

describe('metrics effects', () => {
  let metricsDataSource: MetricsDataSource;
  let savedPinsDataSource: SavedPinsDataSource;
  let effects: MetricsEffects;
  let store: MockStore<State>;
  let actions$: Subject<Action>;
  let actualActions: Action[] = [];

  beforeEach(async () => {
    actions$ = new Subject<Action>();
    actualActions = [];

    await TestBed.configureTestingModule({
      imports: [TBHttpClientTestingModule],
      providers: [
        provideMockActions(actions$),
        provideTestingMetricsDataSource(),
        provideTestingSavedPinsDataSource(),
        MetricsEffects,
        provideMockStore({
          initialState: {
            ...buildMockState({
              ...appStateFromMetricsState(buildMetricsState()),
              ...coreTesting.createState(coreTesting.createCoreState()),
            }),
          },
        }),
      ],
    }).compileComponents();

    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    spyOn(store, 'dispatch').and.callFake((action: Action) => {
      actualActions.push(action);
    });
    effects = TestBed.inject(MetricsEffects);
    metricsDataSource = TestBed.inject(MetricsDataSource);
    savedPinsDataSource = TestBed.inject(SavedPinsDataSource);
    store.overrideSelector(selectors.getExperimentIdsFromRoute, null);
    store.overrideSelector(selectors.getMetricsIgnoreOutliers, false);
    store.overrideSelector(selectors.getMetricsScalarSmoothing, 0.3);
    store.overrideSelector(
      selectors.getMetricsTooltipSort,
      TooltipSort.ALPHABETICAL
    );
  });

  afterEach(() => {
    store?.resetSelectors();
  });

  describe('#dataEffects', () => {
    beforeEach(() => {
      effects.dataEffects$.subscribe();
    });

    describe('loadTagMetadata', () => {
      let fetchTagMetadataSpy: jasmine.Spy;
      let fetchTagMetadataSubject: Subject<TagMetadata>;

      beforeEach(() => {
        fetchTagMetadataSubject = new Subject();
        fetchTagMetadataSpy = spyOn(
          metricsDataSource,
          'fetchTagMetadata'
        ).and.returnValue(fetchTagMetadataSubject);
      });

      it('loads TagMetadata on dashboard open if data is not loaded', () => {
        store.overrideSelector(selectors.getExperimentIdsFromRoute, null);
        store.overrideSelector(getMetricsTagMetadataLoadState, {
          state: DataLoadState.NOT_LOADED,
          lastLoadedTimeInMs: null,
        });
        store.overrideSelector(getActivePlugin, null);
        store.refreshState();

        expect(fetchTagMetadataSpy).not.toHaveBeenCalled();
        expect(actualActions).toEqual([]);

        // Assume activePlugin's initial bootstrap occurs by the time we init.
        store.overrideSelector(getActivePlugin, METRICS_PLUGIN_ID);
        store.refreshState();
        actions$.next(TEST_ONLY.initAction());

        expect(fetchTagMetadataSpy).not.toHaveBeenCalled();
        expect(actualActions).toEqual([]);

        // Assume experimentIds in the activeRoute are set on navigation.
        store.overrideSelector(selectors.getExperimentIdsFromRoute, ['exp1']);
        store.refreshState();
        actions$.next(buildNavigatedAction());

        fetchTagMetadataSubject.next(buildDataSourceTagMetadata());

        expect(fetchTagMetadataSpy).toHaveBeenCalled();
        expect(actualActions).toEqual([
          actions.metricsTagMetadataRequested(),
          actions.metricsTagMetadataLoaded({
            tagMetadata: buildDataSourceTagMetadata(),
          }),
        ]);
      });

      it('loads TagMetadata when switching to dashboard with experiment', () => {
        store.overrideSelector(selectors.getExperimentIdsFromRoute, ['exp1']);
        store.overrideSelector(getMetricsTagMetadataLoadState, {
          state: DataLoadState.NOT_LOADED,
          lastLoadedTimeInMs: null,
        });
        store.overrideSelector(getActivePlugin, null);
        store.refreshState();

        expect(fetchTagMetadataSpy).not.toHaveBeenCalled();
        expect(actualActions).toEqual([]);

        // Assume activePlugin's initial bootstrap occurs by the time we init.
        store.overrideSelector(getActivePlugin, METRICS_PLUGIN_ID);
        store.refreshState();
        actions$.next(coreActions.changePlugin({plugin: METRICS_PLUGIN_ID}));

        fetchTagMetadataSubject.next(buildDataSourceTagMetadata());

        expect(fetchTagMetadataSpy).toHaveBeenCalled();
        expect(actualActions).toEqual([
          actions.metricsTagMetadataRequested(),
          actions.metricsTagMetadataLoaded({
            tagMetadata: buildDataSourceTagMetadata(),
          }),
        ]);
      });

      it('loads TagMetadata when navigating to a new route', () => {
        store.overrideSelector(selectors.getExperimentIdsFromRoute, ['']);
        store.overrideSelector(getMetricsTagMetadataLoadState, {
          state: DataLoadState.NOT_LOADED,
          lastLoadedTimeInMs: null,
        });
        store.overrideSelector(getActivePlugin, null);
        store.refreshState();

        actions$.next(
          buildNavigatedAction({
            after: buildRoute({routeKind: RouteKind.EXPERIMENT}),
          })
        );
        expect(fetchTagMetadataSpy).not.toHaveBeenCalled();

        actions$.next(coreActions.pluginsListingRequested());
        store.overrideSelector(getActivePlugin, METRICS_PLUGIN_ID);
        store.refreshState();
        actions$.next(
          coreActions.pluginsListingLoaded({
            plugins: {
              [METRICS_PLUGIN_ID]: {
                enabled: true,
                loading_mechanism: {
                  type: LoadingMechanismType.NG_COMPONENT,
                },
                disable_reload: true,
                tab_name: 'hello',
                remove_dom: true,
              },
            },
          })
        );

        expect(fetchTagMetadataSpy).toHaveBeenCalledTimes(1);
        fetchTagMetadataSubject.next(buildDataSourceTagMetadata());
        expect(actualActions).toEqual([
          actions.metricsTagMetadataRequested(),
          actions.metricsTagMetadataLoaded({
            tagMetadata: buildDataSourceTagMetadata(),
          }),
        ]);
      });

      it('does not fetch TagMetadata if default plugin is not timeseries', () => {
        store.overrideSelector(selectors.getExperimentIdsFromRoute, ['']);
        store.overrideSelector(getMetricsTagMetadataLoadState, {
          state: DataLoadState.NOT_LOADED,
          lastLoadedTimeInMs: null,
        });
        store.overrideSelector(getActivePlugin, null);
        store.refreshState();

        actions$.next(
          buildNavigatedAction({
            after: buildRoute({routeKind: RouteKind.EXPERIMENT}),
          })
        );
        expect(fetchTagMetadataSpy).not.toHaveBeenCalled();

        actions$.next(coreActions.pluginsListingRequested());
        store.overrideSelector(getActivePlugin, 'foo');
        store.refreshState();
        actions$.next(
          coreActions.pluginsListingLoaded({
            plugins: {
              foo: {
                enabled: true,
                loading_mechanism: {
                  type: LoadingMechanismType.NG_COMPONENT,
                },
                disable_reload: true,
                tab_name: 'hello',
                remove_dom: true,
              },
              [METRICS_PLUGIN_ID]: {
                enabled: true,
                loading_mechanism: {
                  type: LoadingMechanismType.NG_COMPONENT,
                },
                disable_reload: true,
                tab_name: 'hello',
                remove_dom: true,
              },
            },
          })
        );

        expect(fetchTagMetadataSpy).not.toHaveBeenCalled();
        expect(actualActions).toEqual([]);
      });

      it('does not fetch TagMetadata if data was loaded when opening', () => {
        store.overrideSelector(getMetricsTagMetadataLoadState, {
          state: DataLoadState.LOADED,
          lastLoadedTimeInMs: 1,
        });
        store.overrideSelector(getActivePlugin, METRICS_PLUGIN_ID);
        store.refreshState();
        actions$.next(TEST_ONLY.initAction());

        fetchTagMetadataSubject.next(buildDataSourceTagMetadata());

        expect(fetchTagMetadataSpy).not.toHaveBeenCalled();
        expect(actualActions).toEqual([]);
      });

      it('does not fetch TagMetadata if data was loading when opening', () => {
        store.overrideSelector(getMetricsTagMetadataLoadState, {
          state: DataLoadState.LOADING,
          lastLoadedTimeInMs: null,
        });
        store.overrideSelector(getActivePlugin, METRICS_PLUGIN_ID);
        store.refreshState();
        actions$.next(TEST_ONLY.initAction());

        fetchTagMetadataSubject.next(buildDataSourceTagMetadata());

        expect(fetchTagMetadataSpy).not.toHaveBeenCalled();
        expect(actualActions).toEqual([]);
      });
    });

    describe('reloading', () => {
      let fetchTagMetadataSpy: jasmine.Spy;
      let fetchTimeSeriesSpy: jasmine.Spy;
      let selectSpy: jasmine.Spy;

      beforeEach(() => {
        fetchTagMetadataSpy = spyOn(
          metricsDataSource,
          'fetchTagMetadata'
        ).and.returnValue(of(buildDataSourceTagMetadata()));
        fetchTimeSeriesSpy = spyOn(metricsDataSource, 'fetchTimeSeries');
        selectSpy = spyOn(store, 'select').and.callThrough();
      });

      function provideCardFetchInfo(
        specs: Array<Partial<CardFetchInfo> & {id: CardId}>
      ) {
        for (const {id, ...rest} of specs) {
          selectSpy.withArgs(TEST_ONLY.getCardFetchInfo, id).and.returnValue(
            of({
              id,
              plugin: PluginType.SCALARS,
              tag: 'tagA',
              runId: null,
              sample: undefined,
              loadState: DataLoadState.NOT_LOADED,
              ...rest,
            })
          );
        }
      }

      function buildTimeSeriesResponse(): TimeSeriesResponse {
        return {
          plugin: PluginType.SCALARS,
          tag: 'tagA',
          runToSeries: {
            run1: createScalarStepData(),
          },
        };
      }

      const reloadSpecs = [
        {reloadAction: coreActions.manualReload, reloadName: 'manual reload'},
        {reloadAction: coreActions.reload, reloadName: 'auto reload'},
      ];
      for (const {reloadAction, reloadName} of reloadSpecs) {
        it(`re-fetches data on ${reloadName}, while dashboard is open`, () => {
          store.overrideSelector(selectors.getExperimentIdsFromRoute, ['exp1']);
          store.overrideSelector(getMetricsTagMetadataLoadState, {
            state: DataLoadState.LOADED,
            lastLoadedTimeInMs: 1,
          });
          store.overrideSelector(getActivePlugin, METRICS_PLUGIN_ID);
          store.overrideSelector(
            selectors.getVisibleCardIdSet,
            new Set(['card1', 'card2'])
          );
          provideCardFetchInfo([{id: 'card1'}, {id: 'card2'}]);
          store.refreshState();
          fetchTimeSeriesSpy.and.returnValue(of([buildTimeSeriesResponse()]));

          actions$.next(reloadAction());

          expect(fetchTagMetadataSpy).toHaveBeenCalled();
          expect(fetchTimeSeriesSpy).toHaveBeenCalledTimes(2);
          expect(actualActions).toEqual([
            actions.metricsTagMetadataRequested(),
            actions.metricsTagMetadataLoaded({
              tagMetadata: buildDataSourceTagMetadata(),
            }),

            // Currently we expect 2x the same requests if the cards are the same.
            // Ideally we should dedupe requests for the same info.
            actions.multipleTimeSeriesRequested({
              requests: [
                {
                  plugin: PluginType.SCALARS as MultiRunPluginType,
                  tag: 'tagA',
                  experimentIds: ['exp1'],
                },
                {
                  plugin: PluginType.SCALARS as MultiRunPluginType,
                  tag: 'tagA',
                  experimentIds: ['exp1'],
                },
              ],
            }),
            actions.fetchTimeSeriesLoaded({
              response: buildTimeSeriesResponse(),
            }),
            actions.fetchTimeSeriesLoaded({
              response: buildTimeSeriesResponse(),
            }),
          ]);
        });

        it(`re-fetches data on ${reloadName}, only for non-loading cards`, () => {
          store.overrideSelector(selectors.getExperimentIdsFromRoute, ['exp1']);
          store.overrideSelector(getMetricsTagMetadataLoadState, {
            state: DataLoadState.LOADING,
            lastLoadedTimeInMs: null,
          });
          store.overrideSelector(getActivePlugin, METRICS_PLUGIN_ID);
          store.overrideSelector(
            selectors.getVisibleCardIdSet,
            new Set(['card1', 'card2'])
          );
          provideCardFetchInfo([
            {id: 'card1', loadState: DataLoadState.LOADED},
            {id: 'card2', loadState: DataLoadState.LOADING},
          ]);
          store.refreshState();
          fetchTimeSeriesSpy.and.returnValue(of([buildTimeSeriesResponse()]));

          actions$.next(reloadAction());

          expect(fetchTagMetadataSpy).not.toHaveBeenCalled();
          expect(fetchTimeSeriesSpy).toHaveBeenCalledTimes(1);
          expect(actualActions).toEqual([
            actions.multipleTimeSeriesRequested({
              requests: [
                {
                  plugin: PluginType.SCALARS as MultiRunPluginType,
                  tag: 'tagA',
                  experimentIds: ['exp1'],
                },
              ],
            }),
            actions.fetchTimeSeriesLoaded({
              response: buildTimeSeriesResponse(),
            }),
          ]);
        });
      }

      it('does not re-fetch data on reload, if open and already loading', () => {
        store.overrideSelector(getMetricsTagMetadataLoadState, {
          state: DataLoadState.LOADING,
          lastLoadedTimeInMs: null,
        });
        store.overrideSelector(getActivePlugin, METRICS_PLUGIN_ID);
        store.overrideSelector(
          selectors.getVisibleCardIdSet,
          new Set(['card1', 'card2'])
        );
        provideCardFetchInfo([
          {id: 'card1', loadState: DataLoadState.LOADING},
          {id: 'card2', loadState: DataLoadState.LOADING},
        ]);
        store.refreshState();
        fetchTimeSeriesSpy.and.returnValue(of([buildTimeSeriesResponse()]));

        actions$.next(coreActions.manualReload());
        actions$.next(coreActions.reload());

        expect(fetchTagMetadataSpy).not.toHaveBeenCalled();
        expect(fetchTimeSeriesSpy).not.toHaveBeenCalled();
        expect(actualActions).toEqual([]);
      });

      it('does not re-fetch tag metadata if dashboard is inactive', () => {
        store.overrideSelector(getActivePlugin, null);
        store.refreshState();

        actions$.next(coreActions.manualReload());
        actions$.next(coreActions.reload());

        expect(fetchTagMetadataSpy).not.toHaveBeenCalled();
        expect(actualActions).toEqual([]);
      });

      it('does not re-fetch time series, if no cards are visible', () => {
        store.overrideSelector(getActivePlugin, METRICS_PLUGIN_ID);
        store.overrideSelector(selectors.getVisibleCardIdSet, new Set([]));
        store.refreshState();
        fetchTimeSeriesSpy.and.returnValue(of([buildTimeSeriesResponse()]));

        actions$.next(coreActions.manualReload());
        actions$.next(coreActions.reload());

        expect(fetchTimeSeriesSpy).not.toHaveBeenCalled();
      });

      it('does not re-fetch time series, until a valid experiment id', () => {
        // Reset any `getExperimentIdsFromRoute` overrides above.
        store.resetSelectors();
        store.overrideSelector(getActivePlugin, METRICS_PLUGIN_ID);
        store.overrideSelector(
          selectors.getVisibleCardIdSet,
          new Set(['card1'])
        );
        provideCardFetchInfo([{id: 'card1', loadState: DataLoadState.LOADED}]);
        store.overrideSelector(selectors.getExperimentIdsFromRoute, null);
        store.refreshState();
        fetchTimeSeriesSpy.and.returnValue(of([buildTimeSeriesResponse()]));

        actions$.next(coreActions.manualReload());
        actions$.next(coreActions.reload());

        expect(fetchTimeSeriesSpy).not.toHaveBeenCalled();

        store.overrideSelector(selectors.getExperimentIdsFromRoute, ['exp1']);
        store.refreshState();

        actions$.next(coreActions.manualReload());
        actions$.next(coreActions.reload());

        expect(fetchTimeSeriesSpy).toHaveBeenCalledTimes(2);
      });
    });

    describe('loadTimeSeriesForVisibleCardsWithoutData', () => {
      let fetchTimeSeriesSpy: jasmine.Spy;
      const runToSeries = {run1: createScalarStepData()};
      const sampleBackendResponses: TimeSeriesResponse[] = [
        {
          plugin: PluginType.SCALARS,
          tag: 'scalarTag',
          runToSeries: runToSeries,
        },
        {
          plugin: PluginType.SCALARS,
          tag: 'scalarTag2',
          runToSeries: runToSeries,
        },
      ];

      it('does not fetch when nothing is visible', () => {
        fetchTimeSeriesSpy = spyOn(
          metricsDataSource,
          'fetchTimeSeries'
        ).and.returnValue(of(sampleBackendResponses));
        store.overrideSelector(selectors.getExperimentIdsFromRoute, ['exp1']);
        store.overrideSelector(TEST_ONLY.getCardFetchInfo, {
          id: 'card1',
          plugin: PluginType.SCALARS,
          tag: 'tagA',
          runId: null,
          loadState: DataLoadState.NOT_LOADED,
        });
        store.refreshState();

        actions$.next(
          actions.cardVisibilityChanged({enteredCards: [], exitedCards: []})
        );

        expect(fetchTimeSeriesSpy).not.toHaveBeenCalled();
        expect(actualActions).toEqual([]);
      });

      it('fetches only once when hiding then showing a card', () => {
        fetchTimeSeriesSpy = spyOn(
          metricsDataSource,
          'fetchTimeSeries'
        ).and.returnValue(of(sampleBackendResponses));
        store.overrideSelector(selectors.getExperimentIdsFromRoute, ['exp1']);
        store.overrideSelector(TEST_ONLY.getCardFetchInfo, {
          id: 'card1',
          plugin: PluginType.SCALARS,
          tag: 'tagA',
          runId: null,
          loadState: DataLoadState.NOT_LOADED,
        });

        const card1ElementId = nextElementId();
        store.overrideSelector(
          selectors.getVisibleCardIdSet,
          new Set<string>([])
        );
        store.refreshState();
        actions$.next(
          actions.cardVisibilityChanged({
            enteredCards: [],
            exitedCards: [{elementId: card1ElementId, cardId: 'card1'}],
          })
        );

        expect(fetchTimeSeriesSpy).not.toHaveBeenCalled();
        expect(actualActions).toEqual([]);

        store.overrideSelector(
          selectors.getVisibleCardIdSet,
          new Set(['card1'])
        );
        store.refreshState();
        actions$.next(
          actions.cardVisibilityChanged({
            enteredCards: [{elementId: card1ElementId, cardId: 'card1'}],
            exitedCards: [],
          })
        );

        const expectedRequest: TimeSeriesRequest = {
          plugin: PluginType.SCALARS as MultiRunPluginType,
          tag: 'tagA',
          experimentIds: ['exp1'],
        };
        expect(fetchTimeSeriesSpy.calls.count()).toBe(1);
        expect(fetchTimeSeriesSpy).toHaveBeenCalledWith([expectedRequest]);
        expect(actualActions).toEqual([
          actions.multipleTimeSeriesRequested({requests: [expectedRequest]}),
          actions.fetchTimeSeriesLoaded({response: sampleBackendResponses[0]}),
        ]);
      });

      it('does not fetch when a loaded card exits and re-enters', () => {
        fetchTimeSeriesSpy = spyOn(
          metricsDataSource,
          'fetchTimeSeries'
        ).and.returnValue(of(sampleBackendResponses));
        store.overrideSelector(selectors.getExperimentIdsFromRoute, ['exp1']);
        store.overrideSelector(TEST_ONLY.getCardFetchInfo, {
          id: 'card1',
          plugin: PluginType.SCALARS,
          tag: 'tagA',
          runId: null,
          loadState: DataLoadState.LOADED,
        });

        // Initial load.
        const card1ElementId = nextElementId();
        store.overrideSelector(
          selectors.getVisibleCardIdSet,
          new Set(['card1'])
        );
        store.refreshState();
        actions$.next(
          actions.cardVisibilityChanged({
            enteredCards: [{elementId: card1ElementId, cardId: 'card1'}],
            exitedCards: [],
          })
        );

        expect(fetchTimeSeriesSpy).not.toHaveBeenCalled();
        expect(actualActions).toEqual([]);

        // Exit.
        store.overrideSelector(selectors.getVisibleCardIdSet, new Set([]));
        store.refreshState();
        actions$.next(
          actions.cardVisibilityChanged({
            enteredCards: [],
            exitedCards: [{elementId: card1ElementId, cardId: 'card1'}],
          })
        );

        expect(fetchTimeSeriesSpy).not.toHaveBeenCalled();
        expect(actualActions).toEqual([]);

        // Re-enter.
        store.overrideSelector(
          selectors.getVisibleCardIdSet,
          new Set(['card1'])
        );
        store.refreshState();
        actions$.next(
          actions.cardVisibilityChanged({
            enteredCards: [{elementId: card1ElementId, cardId: 'card1'}],
            exitedCards: [],
          })
        );

        expect(fetchTimeSeriesSpy).not.toHaveBeenCalled();
        expect(actualActions).toEqual([]);
      });

      it('fetches multiple card data', () => {
        store.overrideSelector(selectors.getExperimentIdsFromRoute, ['exp1']);
        const selectSpy = spyOn(store, 'select').and.callThrough();
        selectSpy.withArgs(TEST_ONLY.getCardFetchInfo, 'card1').and.returnValue(
          of({
            id: 'card1',
            plugin: PluginType.SCALARS,
            tag: 'tagA',
            runId: null,
            sample: undefined,
            loadState: DataLoadState.NOT_LOADED,
          })
        );
        selectSpy.withArgs(TEST_ONLY.getCardFetchInfo, 'card2').and.returnValue(
          of({
            id: 'card2',
            plugin: PluginType.IMAGES,
            tag: 'tagB',
            runId: 'run1',
            sample: 5,
            loadState: DataLoadState.NOT_LOADED,
          })
        );

        const expectedRequests: TimeSeriesRequest[] = [
          {
            plugin: PluginType.SCALARS as MultiRunPluginType,
            tag: 'tagA',
            experimentIds: ['exp1'],
          },
          {
            plugin: PluginType.IMAGES as SingleRunPluginType,
            tag: 'tagB',
            runId: 'run1',
            sample: 5,
          },
        ];
        fetchTimeSeriesSpy = spyOn(metricsDataSource, 'fetchTimeSeries');
        fetchTimeSeriesSpy
          .withArgs([expectedRequests[0]])
          .and.returnValue(of([sampleBackendResponses[0]]));
        fetchTimeSeriesSpy
          .withArgs([expectedRequests[1]])
          .and.returnValue(of([sampleBackendResponses[1]]));

        store.overrideSelector(
          selectors.getVisibleCardIdSet,
          new Set(['card1', 'card2'])
        );
        store.refreshState();
        actions$.next(
          actions.cardVisibilityChanged({
            enteredCards: [
              {elementId: nextElementId(), cardId: 'card1'},
              {elementId: nextElementId(), cardId: 'card2'},
            ],
            exitedCards: [],
          })
        );

        expect(fetchTimeSeriesSpy.calls.allArgs()).toEqual([
          [[expectedRequests[0]]],
          [[expectedRequests[1]]],
        ]);
        expect(actualActions).toEqual([
          actions.multipleTimeSeriesRequested({requests: expectedRequests}),
          actions.fetchTimeSeriesLoaded({response: sampleBackendResponses[0]}),
          actions.fetchTimeSeriesLoaded({response: sampleBackendResponses[1]}),
        ]);
      });

      const metaSpec = [
        {loadState: DataLoadState.FAILED, tag: 'failed'},
        {loadState: DataLoadState.LOADED, tag: 'loaded'},
        {loadState: DataLoadState.LOADING, tag: 'loading'},
      ];
      for (const spec of metaSpec) {
        const {loadState, tag} = spec;
        const title = `should not fetch when load state is ${tag}`;
        it(title, () => {
          const selectSpy = spyOn(store, 'select').and.callThrough();
          selectSpy
            .withArgs(TEST_ONLY.getCardFetchInfo, 'card1')
            .and.returnValue(
              of({
                id: 'card1',
                plugin: PluginType.SCALARS,
                tag: 'tagA',
                loadState,
              })
            );
          fetchTimeSeriesSpy = spyOn(metricsDataSource, 'fetchTimeSeries');

          store.overrideSelector(
            selectors.getVisibleCardIdSet,
            new Set(['card1'])
          );
          store.refreshState();
          actions$.next(
            actions.cardVisibilityChanged({
              enteredCards: [{elementId: nextElementId(), cardId: 'card1'}],
              exitedCards: [],
            })
          );

          expect(fetchTimeSeriesSpy).not.toHaveBeenCalled();
          expect(actualActions).toEqual([]);
        });
      }
    });

    describe('addOrRemovePin', () => {
      let saveScalarPinSpy: jasmine.Spy;
      let removeScalarPinSpy: jasmine.Spy;

      beforeEach(() => {
        saveScalarPinSpy = spyOn(savedPinsDataSource, 'saveScalarPin');
        removeScalarPinSpy = spyOn(savedPinsDataSource, 'removeScalarPin');

        store.overrideSelector(selectors.getEnableGlobalPins, true);
        store.overrideSelector(TEST_ONLY.getCardFetchInfo, {
          id: 'card1',
          plugin: PluginType.SCALARS,
          tag: 'tagA',
          runId: null,
          loadState: DataLoadState.LOADED,
        });
        store.overrideSelector(
          selectors.getVisibleCardIdSet,
          new Set(['card1'])
        );
        store.refreshState();
      });

      it('removes scalar pin if the given card was pinned', () => {
        actions$.next(
          actions.cardPinStateToggled({
            cardId: 'card1',
            wasPinned: true,
            canCreateNewPins: true,
          })
        );

        expect(removeScalarPinSpy).toHaveBeenCalledWith('tagA');
        expect(saveScalarPinSpy).not.toHaveBeenCalled();
      });

      it('pins the card if the given card was not pinned and canCreateNewPins is true', () => {
        actions$.next(
          actions.cardPinStateToggled({
            cardId: 'card1',
            wasPinned: false,
            canCreateNewPins: true,
          })
        );

        expect(saveScalarPinSpy).toHaveBeenCalledWith('tagA');
        expect(removeScalarPinSpy).not.toHaveBeenCalled();
      });

      it('does not pin the card if the given card was not pinned and canCreateNewPins is false', () => {
        actions$.next(
          actions.cardPinStateToggled({
            cardId: 'card1',
            wasPinned: false,
            canCreateNewPins: false,
          })
        );

        expect(saveScalarPinSpy).not.toHaveBeenCalled();
        expect(removeScalarPinSpy).not.toHaveBeenCalled();
      });

      it('does not pin the card if the plugin type is not a scalar', () => {
        store.overrideSelector(TEST_ONLY.getCardFetchInfo, {
          id: 'card2',
          plugin: PluginType.HISTOGRAMS,
          tag: 'tagA',
          runId: null,
          loadState: DataLoadState.LOADED,
        });
        store.overrideSelector(
          selectors.getVisibleCardIdSet,
          new Set(['card2'])
        );
        store.refreshState();

        actions$.next(
          actions.cardPinStateToggled({
            cardId: 'card2',
            wasPinned: false,
            canCreateNewPins: true,
          })
        );

        expect(saveScalarPinSpy).not.toHaveBeenCalled();
        expect(removeScalarPinSpy).not.toHaveBeenCalled();
      });

      it('does not pin the card if there is no matching card', () => {
        actions$.next(
          actions.cardPinStateToggled({
            cardId: 'card3',
            wasPinned: false,
            canCreateNewPins: true,
          })
        );

        expect(saveScalarPinSpy).not.toHaveBeenCalled();
        expect(removeScalarPinSpy).not.toHaveBeenCalled();
      });

      it('does not pin the card if getEnableGlobalPins is false', () => {
        store.overrideSelector(selectors.getEnableGlobalPins, false);
        store.refreshState();

        actions$.next(
          actions.cardPinStateToggled({
            cardId: 'card1',
            wasPinned: false,
            canCreateNewPins: true,
          })
        );

        expect(saveScalarPinSpy).not.toHaveBeenCalled();
        expect(removeScalarPinSpy).not.toHaveBeenCalled();
      });

      it('does not pin the card if getShouldPersistSettings is false', () => {
        store.overrideSelector(selectors.getShouldPersistSettings, false);
        store.refreshState();

        actions$.next(
          actions.cardPinStateToggled({
            cardId: 'card1',
            wasPinned: false,
            canCreateNewPins: true,
          })
        );

        expect(saveScalarPinSpy).not.toHaveBeenCalled();
        expect(removeScalarPinSpy).not.toHaveBeenCalled();
      });

      it('does not pin the card if getMetricsSavingPinsEnabled is false', () => {
        store.overrideSelector(selectors.getMetricsSavingPinsEnabled, false);
        store.refreshState();

        actions$.next(
          actions.cardPinStateToggled({
            cardId: 'card1',
            wasPinned: false,
            canCreateNewPins: true,
          })
        );

        expect(saveScalarPinSpy).not.toHaveBeenCalled();
        expect(removeScalarPinSpy).not.toHaveBeenCalled();
      });
    });

    describe('loadSavedPins', () => {
      const fakeTagList = ['tagA', 'tagB'];
      const fakeUniqueCardInfos = fakeTagList.map((tag) => ({
        plugin: PluginType.SCALARS,
        tag: tag,
      }));
      let getSavedScalarPinsSpy: jasmine.Spy;

      beforeEach(() => {
        store.overrideSelector(selectors.getEnableGlobalPins, true);
        store.refreshState();
      });

      it('dispatches unresolvedPinnedCards action if tag is given', () => {
        getSavedScalarPinsSpy = spyOn(
          savedPinsDataSource,
          'getSavedScalarPins'
        ).and.returnValue(['tagA', 'tagB']);

        actions$.next(TEST_ONLY.initAction());

        expect(actualActions).toEqual([
          actions.metricsUnresolvedPinnedCardsFromLocalStorageAdded({
            cards: fakeUniqueCardInfos,
          }),
        ]);
      });

      it('does not dispatch unresolvedPinnedCards action if tag is an empty list', () => {
        getSavedScalarPinsSpy = spyOn(
          savedPinsDataSource,
          'getSavedScalarPins'
        ).and.returnValue([]);

        actions$.next(TEST_ONLY.initAction());

        expect(actualActions).toEqual([]);
      });

      it('does not load saved pins if getEnableGlobalPins is false', () => {
        getSavedScalarPinsSpy = spyOn(
          savedPinsDataSource,
          'getSavedScalarPins'
        ).and.returnValue(['tagA', 'tagB']);
        store.overrideSelector(selectors.getEnableGlobalPins, false);
        store.refreshState();

        actions$.next(TEST_ONLY.initAction());

        expect(actualActions).toEqual([]);
      });

      it('does not load saved pins if getShouldPersistSettings is false', () => {
        getSavedScalarPinsSpy = spyOn(
          savedPinsDataSource,
          'getSavedScalarPins'
        ).and.returnValue(['tagA', 'tagB']);
        store.overrideSelector(selectors.getShouldPersistSettings, false);
        store.refreshState();

        actions$.next(TEST_ONLY.initAction());

        expect(actualActions).toEqual([]);
      });

      it('does not load saved pins if getMetricsSavingPinsEnabled is false', () => {
        getSavedScalarPinsSpy = spyOn(
          savedPinsDataSource,
          'getSavedScalarPins'
        ).and.returnValue(['tagA', 'tagB']);
        store.overrideSelector(selectors.getMetricsSavingPinsEnabled, false);
        store.refreshState();

        actions$.next(TEST_ONLY.initAction());

        expect(actualActions).toEqual([]);
      });
    });

    describe('removeAllPins', () => {
      let removeAllScalarPinsSpy: jasmine.Spy;

      beforeEach(() => {
        removeAllScalarPinsSpy = spyOn(
          savedPinsDataSource,
          'removeAllScalarPins'
        );
        store.overrideSelector(selectors.getEnableGlobalPins, true);
        store.refreshState();
      });

      it('removes all pins by calling removeAllScalarPins method', () => {
        actions$.next(actions.metricsClearAllPinnedCards());

        expect(removeAllScalarPinsSpy).toHaveBeenCalled();
      });

      it('does not remove pins if getEnableGlobalPins is false', () => {
        store.overrideSelector(selectors.getEnableGlobalPins, false);
        store.refreshState();

        actions$.next(actions.metricsClearAllPinnedCards());

        expect(removeAllScalarPinsSpy).not.toHaveBeenCalled();
      });

      it('does not remove pins if getShouldPersistSettings is false', () => {
        store.overrideSelector(selectors.getShouldPersistSettings, false);
        store.refreshState();

        actions$.next(actions.metricsClearAllPinnedCards());

        expect(removeAllScalarPinsSpy).not.toHaveBeenCalled();
      });

      it('does not remove pins if getMetricsSavingPinsEnabled is false', () => {
        store.overrideSelector(selectors.getMetricsSavingPinsEnabled, false);
        store.refreshState();

        actions$.next(actions.metricsClearAllPinnedCards());

        expect(removeAllScalarPinsSpy).not.toHaveBeenCalled();
      });
    });

    describe('addOrRemovePinsOnToggle', () => {
      let removeAllScalarPinsSpy: jasmine.Spy;
      let saveScalarPinsSpy: jasmine.Spy;

      beforeEach(() => {
        removeAllScalarPinsSpy = spyOn(
          savedPinsDataSource,
          'removeAllScalarPins'
        );
        saveScalarPinsSpy = spyOn(savedPinsDataSource, 'saveScalarPins');
        store.overrideSelector(selectors.getPinnedCardsWithMetadata, [
          {
            cardId: 'card1',
            ...createCardMetadata(PluginType.SCALARS),
            tag: 'tag1',
          },
          {
            cardId: 'card2',
            ...createCardMetadata(PluginType.IMAGES),
            tag: 'tag2',
          },
          {
            cardId: 'card3',
            ...createCardMetadata(PluginType.SCALARS),
            tag: 'tag3',
          },
        ]);
        store.overrideSelector(selectors.getEnableGlobalPins, true);
        store.overrideSelector(selectors.getMetricsSavingPinsEnabled, false);
        store.refreshState();
      });

      it('removes all pins if getMetricsSavingPinsEnabled is false', () => {
        actions$.next(actions.metricsEnableSavingPinsToggled());

        expect(removeAllScalarPinsSpy).toHaveBeenCalled();
        expect(saveScalarPinsSpy).not.toHaveBeenCalled();
      });

      it('add existing pins if getMetricsSavingPinsEnabled is true', () => {
        store.overrideSelector(selectors.getMetricsSavingPinsEnabled, true);
        store.refreshState();

        actions$.next(actions.metricsEnableSavingPinsToggled());

        expect(saveScalarPinsSpy).toHaveBeenCalledWith(['tag1', 'tag3']);
        expect(removeAllScalarPinsSpy).not.toHaveBeenCalled();
      });

      it('does not add or remove pins if getEnableGlobalPins is false', () => {
        store.overrideSelector(selectors.getEnableGlobalPins, false);
        store.refreshState();

        actions$.next(actions.metricsEnableSavingPinsToggled());

        expect(removeAllScalarPinsSpy).not.toHaveBeenCalled();
        expect(saveScalarPinsSpy).not.toHaveBeenCalled();
      });

      it('does not add or remove pins if getShouldPersistSettings is false', () => {
        store.overrideSelector(selectors.getShouldPersistSettings, false);
        store.refreshState();

        actions$.next(actions.metricsEnableSavingPinsToggled());

        expect(removeAllScalarPinsSpy).not.toHaveBeenCalled();
        expect(saveScalarPinsSpy).not.toHaveBeenCalled();
      });
    });
  });
});
