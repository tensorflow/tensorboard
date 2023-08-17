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
import {Actions, createEffect, ofType, OnInitEffects} from '@ngrx/effects';
import {Action, createAction, createSelector, Store} from '@ngrx/store';
import {forkJoin, merge, Observable, of} from 'rxjs';
import {
  catchError,
  throttleTime,
  combineLatestWith,
  filter,
  map,
  mergeMap,
  switchMap,
  take,
  tap,
  withLatestFrom,
  shareReplay,
} from 'rxjs/operators';
import * as routingActions from '../../app_routing/actions';
import {State} from '../../app_state';
import * as coreActions from '../../core/actions';
import {getActivePlugin} from '../../core/store';
import * as selectors from '../../selectors';
import {DataLoadState} from '../../types/data';
import * as actions from '../actions';
import {
  isFailedTimeSeriesResponse,
  isSingleRunPlugin,
  MetricsDataSource,
  METRICS_PLUGIN_ID,
  TagMetadata,
  TimeSeriesRequest,
  TimeSeriesResponse,
  SampledPluginType,
  isSampledPlugin,
  NonSampledPluginType,
  SampledTagMetadata,
} from '../data_source/index';
import {
  getCardLoadState,
  getCardMetadata,
  getMetricsTagMetadataLoadState,
} from '../store';
import {CardId, CardMetadata, PluginType} from '../types';

export type CardFetchInfo = CardMetadata & {
  id: CardId;
  loadState: DataLoadState;
};

const getCardFetchInfo = createSelector(
  getCardLoadState,
  getCardMetadata,
  (loadState, maybeMetadata, cardId /* props */): CardFetchInfo | null => {
    if (!maybeMetadata) {
      return null;
    }
    return {...maybeMetadata, loadState, id: cardId};
  }
);

const initAction = createAction('[Metrics Effects] Init');

function sampledPluginToTagRunIdPairs(plugin: SampledTagMetadata) {
  return Object.fromEntries(
    Object.entries(plugin.tagRunSampledInfo).map(([tag, sampledRunInfo]) => {
      const runIds = Object.keys(sampledRunInfo);
      return [tag, runIds];
    })
  );
}

@Injectable()
export class MetricsEffects implements OnInitEffects {
  constructor(
    private readonly actions$: Actions,
    private readonly store: Store<State>,
    private readonly dataSource: MetricsDataSource
  ) {}

  /**
   * Computes a record of tag to the experiments it appears in.
   *
   * The computation is done by translating Plugin -> Tag -> Run -> ExpId
   * Unfortunately Sampled and NonSampled plugins store the Tag -> Run relationship
   * differently.
   *
   * SampledPlugins contain Record<Tag, Run>
   * NonSampledPlugins have Record<Run, Tag[]>
   *
   * To handle this inconsistency the SampledPlugins datascructure is simplified and inverted.
   */
  readonly tagToEid$: Observable<Record<string, Set<string>>> = this.store
    .select(selectors.getMetricsTagMetadata)
    .pipe(
      combineLatestWith(this.store.select(selectors.getRunIdToExperimentId)),
      map(([tagMetadata, runToEid]) => {
        const tagToEid: Record<string, Set<string>> = {};
        function mapTagsToEid(tagToRun: Record<string, readonly string[]>) {
          Object.entries(tagToRun).forEach(([tag, runIds]) => {
            if (!tagToEid[tag]) {
              tagToEid[tag] = new Set();
            }
            runIds.forEach((runId) => tagToEid[tag].add(runToEid[runId]));
          });
        }

        for (const pluginType in tagMetadata) {
          if (isSampledPlugin(pluginType as PluginType)) {
            const tagRunPairs = sampledPluginToTagRunIdPairs(
              tagMetadata[pluginType as SampledPluginType]
            );
            mapTagsToEid(tagRunPairs);
            continue;
          }

          mapTagsToEid(
            tagMetadata[pluginType as NonSampledPluginType].tagToRuns
          );
        }

        return tagToEid;
      }),
      shareReplay(1)
    );

  /** @export */
  ngrxOnInitEffects(): Action {
    return initAction();
  }

  /**
   * Our effects react when the plugin dashboard is fully "shown" and experiment
   * ids are available. The `activePlugin` acts as our proxy to know whether it
   * is shown.
   *
   * [Metrics Effects] Init  - the initial `activePlugin` is set.
   * [Core] Plugin Changed   - subsequent `activePlugin` updates.
   * [Core] PluginListing Fetch Successful - list of plugins fetched and the
   *   first `activePlugin` set.
   * [App Routing] Navigated - experiment id updates.
   */
  private readonly dashboardShownWithoutData$ = this.actions$.pipe(
    ofType(
      initAction,
      coreActions.changePlugin,
      coreActions.pluginsListingLoaded,
      routingActions.navigated
    ),
    withLatestFrom(
      this.store.select(getActivePlugin),
      this.store.select(getMetricsTagMetadataLoadState)
    ),
    filter(([, activePlugin, tagLoadState]) => {
      return (
        activePlugin === METRICS_PLUGIN_ID &&
        tagLoadState.state === DataLoadState.NOT_LOADED
      );
    })
  );

  private readonly reloadRequestedWhileShown$ = this.actions$.pipe(
    ofType(coreActions.reload, coreActions.manualReload),
    withLatestFrom(this.store.select(getActivePlugin)),
    filter(([, activePlugin]) => {
      return activePlugin === METRICS_PLUGIN_ID;
    })
  );

  private readonly loadTagMetadata$ = merge(
    this.dashboardShownWithoutData$,
    this.reloadRequestedWhileShown$
  ).pipe(
    withLatestFrom(
      this.store.select(getMetricsTagMetadataLoadState),
      this.store.select(selectors.getExperimentIdsFromRoute)
    ),
    filter(([, tagLoadState, experimentIds]) => {
      /**
       * When `experimentIds` is null, the actual ids have not
       * appeared in the store yet.
       */
      return (
        tagLoadState.state !== DataLoadState.LOADING && experimentIds !== null
      );
    }),
    throttleTime(10),
    tap(() => {
      this.store.dispatch(actions.metricsTagMetadataRequested());
    }),
    switchMap(([, , experimentIds]) => {
      return this.dataSource.fetchTagMetadata(experimentIds!).pipe(
        tap((tagMetadata: TagMetadata) => {
          this.store.dispatch(actions.metricsTagMetadataLoaded({tagMetadata}));
        }),
        catchError(() => {
          this.store.dispatch(actions.metricsTagMetadataFailed());
          return of(null);
        })
      );
    })
  );

  private getVisibleCardFetchInfos(): Observable<CardFetchInfo[]> {
    const visibleCardIds$ = this.store.select(selectors.getVisibleCardIdSet);
    return visibleCardIds$.pipe(
      switchMap((cardIds) => {
        // Explicitly notify subscribers that there are no visible cards,
        // since `forkJoin` does not emit when passed an empty array.
        if (!cardIds.size) {
          return of([]);
        }
        const observables = [...cardIds].map((cardId) => {
          return this.store.select(getCardFetchInfo, cardId).pipe(take(1));
        });
        return forkJoin(observables);
      }),
      map((fetchInfos) => {
        return fetchInfos.filter(Boolean) as CardFetchInfo[];
      })
    );
  }

  private fetchTimeSeries(request: TimeSeriesRequest) {
    return this.dataSource.fetchTimeSeries([request]).pipe(
      tap((responses: TimeSeriesResponse[]) => {
        const errors = responses.filter(isFailedTimeSeriesResponse);
        if (errors.length) {
          console.error('Time series response contained errors:', errors);
        }
        this.store.dispatch(
          actions.fetchTimeSeriesLoaded({response: responses[0]})
        );
      }),
      catchError(() => {
        this.store.dispatch(actions.fetchTimeSeriesFailed({request}));
        return of(null);
      })
    );
  }

  private fetchTimeSeriesForCards(
    fetchInfos: CardFetchInfo[],
    experimentIds: string[]
  ) {
    // Fetch and handle responses.
    return this.tagToEid$.pipe(
      take(1),
      map((tagToEid): TimeSeriesRequest[] => {
        const requests = fetchInfos.map((fetchInfo) => {
          const {plugin, tag, runId, sample} = fetchInfo;
          const filteredEids = experimentIds.filter((eid) =>
            tagToEid[tag]?.has(eid)
          );

          const partialRequest: TimeSeriesRequest = isSingleRunPlugin(plugin)
            ? {plugin, tag, runId: runId!}
            : {plugin, tag, experimentIds: filteredEids};
          if (sample !== undefined) {
            partialRequest.sample = sample;
          }
          return partialRequest;
        });
        const uniqueRequests = new Set(
          requests.map((request) => JSON.stringify(request))
        );

        return Array.from(uniqueRequests).map(
          (serialized) => JSON.parse(serialized) as TimeSeriesRequest
        );
      }),
      tap((requests) => {
        this.store.dispatch(actions.multipleTimeSeriesRequested({requests}));
      }),
      mergeMap((requests: TimeSeriesRequest[]) => {
        const observables = requests.map((request) =>
          this.fetchTimeSeries(request)
        );
        return merge(...observables);
      })
    );
  }

  private readonly visibleCardsWithoutDataChanged$ = this.actions$.pipe(
    ofType(actions.cardVisibilityChanged),
    withLatestFrom(this.getVisibleCardFetchInfos()),
    map(([, fetchInfos]) => {
      return fetchInfos.filter((fetchInfo) => {
        return fetchInfo.loadState === DataLoadState.NOT_LOADED;
      });
    })
  );

  private readonly visibleCardsReloaded$ = this.reloadRequestedWhileShown$.pipe(
    withLatestFrom(this.getVisibleCardFetchInfos()),
    map(([, fetchInfos]) => {
      return fetchInfos.filter((fetchInfo) => {
        return fetchInfo.loadState !== DataLoadState.LOADING;
      });
    })
  );

  private readonly loadTimeSeries$ = merge(
    this.visibleCardsWithoutDataChanged$,
    this.visibleCardsReloaded$
  ).pipe(
    filter((fetchInfos) => fetchInfos.length > 0),

    // Ignore card visibility events until we have non-null
    // experimentIds.
    withLatestFrom(
      this.store
        .select(selectors.getExperimentIdsFromRoute)
        .pipe(filter((experimentIds) => experimentIds !== null))
    ),
    mergeMap(([fetchInfos, experimentIds]) => {
      return this.fetchTimeSeriesForCards(fetchInfos, experimentIds!);
    })
  );

  /**
   * In general, this effect dispatch the following actions:
   *
   * On dashboard shown without data loaded:
   * - metricsTagMetadataRequested
   *
   * On changes to the set of cards that are visible:
   * - multipleTimeSeriesRequested
   *
   * On reloads:
   * - metricsTagMetadataRequested
   * - multipleTimeSeriesRequested
   *
   * On data source responses:
   * - metricsTagMetadataLoaded
   * - metricsTagMetadataFailed
   * - fetchTimeSeriesLoaded
   * - fetchTimeSeriesFailed
   */
  /** @export */
  readonly dataEffects$ = createEffect(
    () => {
      return merge(
        /**
         * Subscribes to: dashboard shown, route navigation, reloads.
         */
        this.loadTagMetadata$,

        /**
         * Subscribes to: card visibility, reloads.
         */
        this.loadTimeSeries$
      );
    },
    {dispatch: false}
  );
}

export const TEST_ONLY = {
  getCardFetchInfo,
  initAction,
};
