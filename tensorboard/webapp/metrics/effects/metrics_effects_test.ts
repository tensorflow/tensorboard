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
import * as coreActions from '../../core/actions';
import {getActivePlugin} from '../../core/store';
import * as coreTesting from '../../core/testing';
import {DataLoadState} from '../../types/data';
import {TBHttpClientTestingModule} from '../../webapp_data_source/tb_http_client_testing';
import {of, Subject} from 'rxjs';

import {buildNavigatedAction} from '../../app_routing/testing';
import {State} from '../../app_state';
import * as selectors from '../../selectors';
import * as actions from '../actions';
import {
  METRICS_PLUGIN_ID,
  MetricsDataSource,
  MultiRunPluginType,
  PluginType,
  SingleRunPluginType,
  TagMetadata,
  TimeSeriesResponse,
} from '../data_source';
import {getMetricsTagMetadataLoaded} from '../store';
import {
  appStateFromMetricsState,
  buildDataSourceTagMetadata,
  buildMetricsState,
  createScalarStepData,
  provideTestingMetricsDataSource,
} from '../testing';
import {CardId, TooltipSort} from '../types';
import {CardFetchInfo, MetricsEffects, TEST_ONLY} from './index';

describe('metrics effects', () => {
  let dataSource: MetricsDataSource;
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
        MetricsEffects,
        provideMockStore({
          initialState: {
            ...appStateFromMetricsState(buildMetricsState()),
            ...coreTesting.createState(coreTesting.createCoreState()),
          },
        }),
      ],
    }).compileComponents();

    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    spyOn(store, 'dispatch').and.callFake((action: Action) => {
      actualActions.push(action);
    });
    effects = TestBed.inject(MetricsEffects);
    dataSource = TestBed.inject(MetricsDataSource);
    store.overrideSelector(selectors.getExperimentIdsFromRoute, null);
    store.overrideSelector(selectors.getRouteId, 'route1');
    store.overrideSelector(selectors.getMetricsIgnoreOutliers, false);
    store.overrideSelector(selectors.getMetricsScalarSmoothing, 0.3);
    store.overrideSelector(
      selectors.getMetricsTooltipSort,
      TooltipSort.DEFAULT
    );
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
          dataSource,
          'fetchTagMetadata'
        ).and.returnValue(fetchTagMetadataSubject);
      });

      it('loads TagMetadata on dashboard open if data is not loaded', () => {
        store.overrideSelector(selectors.getExperimentIdsFromRoute, null);
        store.overrideSelector(
          getMetricsTagMetadataLoaded,
          DataLoadState.NOT_LOADED
        );
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
        store.overrideSelector(
          getMetricsTagMetadataLoaded,
          DataLoadState.NOT_LOADED
        );
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

      it('does not fetch TagMetadata if data was loaded when opening', () => {
        store.overrideSelector(
          getMetricsTagMetadataLoaded,
          DataLoadState.LOADED
        );
        store.overrideSelector(getActivePlugin, METRICS_PLUGIN_ID);
        store.refreshState();
        actions$.next(TEST_ONLY.initAction());

        fetchTagMetadataSubject.next(buildDataSourceTagMetadata());

        expect(fetchTagMetadataSpy).not.toHaveBeenCalled();
        expect(actualActions).toEqual([]);
      });

      it('does not fetch TagMetadata if data was loading when opening', () => {
        store.overrideSelector(
          getMetricsTagMetadataLoaded,
          DataLoadState.LOADING
        );
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
          dataSource,
          'fetchTagMetadata'
        ).and.returnValue(of(buildDataSourceTagMetadata()));
        fetchTimeSeriesSpy = spyOn(dataSource, 'fetchTimeSeries');
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

      function buildTimeSeriesResponse() {
        return {
          plugin: PluginType.SCALARS,
          tag: 'tagA',
          sample: undefined,
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
          store.overrideSelector(
            getMetricsTagMetadataLoaded,
            DataLoadState.LOADED
          );
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
                  sample: undefined,
                },
                {
                  plugin: PluginType.SCALARS as MultiRunPluginType,
                  tag: 'tagA',
                  experimentIds: ['exp1'],
                  sample: undefined,
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
          store.overrideSelector(
            getMetricsTagMetadataLoaded,
            DataLoadState.LOADING
          );
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
                  sample: undefined,
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
        store.overrideSelector(
          getMetricsTagMetadataLoaded,
          DataLoadState.LOADING
        );
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
        store.overrideSelector(selectors.getRouteId, 'route1');
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
          dataSource,
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
          actions.cardVisibilityChanged({
            enteredCards: new Set(),
            exitedCards: new Set(),
          })
        );

        expect(fetchTimeSeriesSpy).not.toHaveBeenCalled();
        expect(actualActions).toEqual([]);
      });

      it('fetches only once when hiding then showing a card', () => {
        fetchTimeSeriesSpy = spyOn(
          dataSource,
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

        store.overrideSelector(
          selectors.getVisibleCardIdSet,
          new Set<string>([])
        );
        store.refreshState();
        actions$.next(
          actions.cardVisibilityChanged({
            enteredCards: new Set(),
            exitedCards: new Set(['card1']),
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
            enteredCards: new Set(['card1']),
            exitedCards: new Set(),
          })
        );

        const expectedRequest = {
          plugin: PluginType.SCALARS as MultiRunPluginType,
          tag: 'tagA',
          experimentIds: ['exp1'],
          sample: undefined,
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
          dataSource,
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
        store.overrideSelector(
          selectors.getVisibleCardIdSet,
          new Set(['card1'])
        );
        store.refreshState();
        actions$.next(
          actions.cardVisibilityChanged({
            enteredCards: new Set(['card1']),
            exitedCards: new Set(),
          })
        );

        expect(fetchTimeSeriesSpy).not.toHaveBeenCalled();
        expect(actualActions).toEqual([]);

        // Exit.
        store.overrideSelector(selectors.getVisibleCardIdSet, new Set([]));
        store.refreshState();
        actions$.next(
          actions.cardVisibilityChanged({
            enteredCards: new Set(),
            exitedCards: new Set(['card1']),
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
            enteredCards: new Set(['card1']),
            exitedCards: new Set(),
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

        const expectedRequests = [
          {
            plugin: PluginType.SCALARS as MultiRunPluginType,
            tag: 'tagA',
            experimentIds: ['exp1'],
            sample: undefined,
          },
          {
            plugin: PluginType.IMAGES as SingleRunPluginType,
            tag: 'tagB',
            runId: 'run1',
            sample: 5,
          },
        ];
        fetchTimeSeriesSpy = spyOn(dataSource, 'fetchTimeSeries');
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
            enteredCards: new Set(['card1', 'card2']),
            exitedCards: new Set(),
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
          fetchTimeSeriesSpy = spyOn(dataSource, 'fetchTimeSeries');

          store.overrideSelector(
            selectors.getVisibleCardIdSet,
            new Set(['card1'])
          );
          store.refreshState();
          actions$.next(
            actions.cardVisibilityChanged({
              enteredCards: new Set(['card1']),
              exitedCards: new Set(),
            })
          );

          expect(fetchTimeSeriesSpy).not.toHaveBeenCalled();
          expect(actualActions).toEqual([]);
        });
      }
    });
  });
});
