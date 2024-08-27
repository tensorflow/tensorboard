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
  filter,
  map,
  mergeMap,
  switchMap,
  take,
  tap,
  withLatestFrom,
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
  SavedPinsDataSource,
  Tag,
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

@Injectable()
export class MetricsEffects implements OnInitEffects {
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
  private readonly dashboardShownWithoutData$;

  private readonly reloadRequestedWhileShown$;

  private readonly loadTagMetadata$;

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
    return this.metricsDataSource.fetchTimeSeries([request]).pipe(
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
    /**
     * TODO(psybuzz): if 2 cards require the same data, we should dedupe instead of
     * making 2 identical requests.
     */
    const requests: TimeSeriesRequest[] = fetchInfos.map((fetchInfo) => {
      const {plugin, tag, runId, sample} = fetchInfo;
      const partialRequest: TimeSeriesRequest = isSingleRunPlugin(plugin)
        ? {plugin, tag, runId: runId!}
        : {plugin, tag, experimentIds};
      if (sample !== undefined) {
        partialRequest.sample = sample;
      }
      return partialRequest;
    });

    // Fetch and handle responses.
    return of(requests).pipe(
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

  private readonly visibleCardsWithoutDataChanged$;

  private readonly visibleCardsReloaded$;

  private readonly loadTimeSeries$;

  private readonly addOrRemovePin$;

  private readonly loadSavedPins$;

  private readonly removeAllPins$;

  private readonly addOrRemovePinsOnToggle$;

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
  readonly dataEffects$;

  constructor(
    private readonly actions$: Actions,
    private readonly store: Store<State>,
    private readonly metricsDataSource: MetricsDataSource,
    private readonly savedPinsDataSource: SavedPinsDataSource
  ) {
    this.dashboardShownWithoutData$ = actions$.pipe(
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

    this.reloadRequestedWhileShown$ = actions$.pipe(
      ofType(coreActions.reload, coreActions.manualReload),
      withLatestFrom(this.store.select(getActivePlugin)),
      filter(([, activePlugin]) => {
        return activePlugin === METRICS_PLUGIN_ID;
      })
    );

    this.loadTagMetadata$ = merge(
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
        return this.metricsDataSource.fetchTagMetadata(experimentIds!).pipe(
          tap((tagMetadata: TagMetadata) => {
            this.store.dispatch(
              actions.metricsTagMetadataLoaded({tagMetadata})
            );
          }),
          catchError(() => {
            this.store.dispatch(actions.metricsTagMetadataFailed());
            return of(null);
          })
        );
      })
    );

    this.visibleCardsWithoutDataChanged$ = this.actions$.pipe(
      ofType(actions.cardVisibilityChanged),
      withLatestFrom(this.getVisibleCardFetchInfos()),
      map(([, fetchInfos]) => {
        return fetchInfos.filter((fetchInfo) => {
          return fetchInfo.loadState === DataLoadState.NOT_LOADED;
        });
      })
    );

    this.visibleCardsReloaded$ = this.reloadRequestedWhileShown$.pipe(
      withLatestFrom(this.getVisibleCardFetchInfos()),
      map(([, fetchInfos]) => {
        return fetchInfos.filter((fetchInfo) => {
          return fetchInfo.loadState !== DataLoadState.LOADING;
        });
      })
    );

    this.loadTimeSeries$ = merge(
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

    this.addOrRemovePin$ = this.actions$.pipe(
      ofType(actions.cardPinStateToggled),
      withLatestFrom(
        this.getVisibleCardFetchInfos(),
        this.store.select(selectors.getEnableGlobalPins),
        this.store.select(selectors.getShouldPersistSettings),
        this.store.select(selectors.getMetricsSavingPinsEnabled)
      ),
      filter(
        ([
          ,
          ,
          enableGlobalPinsFeature,
          shouldPersistSettings,
          isMetricsSavingPinsEnabled,
        ]) =>
          enableGlobalPinsFeature &&
          shouldPersistSettings &&
          isMetricsSavingPinsEnabled
      ),
      tap(([{cardId, canCreateNewPins, wasPinned}, fetchInfos]) => {
        const card = fetchInfos.find((value) => value.id === cardId);
        // Saving only scalar pinned cards.
        if (!card || card.plugin !== PluginType.SCALARS) {
          return;
        }
        if (wasPinned) {
          this.savedPinsDataSource.removeScalarPin(card.tag);
        } else if (canCreateNewPins) {
          this.savedPinsDataSource.saveScalarPin(card.tag);
        }
      })
    );

    this.loadSavedPins$ = this.actions$.pipe(
      // Should be dispatch before stateRehydratedFromUrl.
      ofType(initAction),
      withLatestFrom(
        this.store.select(selectors.getEnableGlobalPins),
        this.store.select(selectors.getShouldPersistSettings),
        this.store.select(selectors.getMetricsSavingPinsEnabled)
      ),
      filter(
        ([
          ,
          enableGlobalPinsFeature,
          shouldPersistSettings,
          isMetricsSavingPinsEnabled,
        ]) =>
          enableGlobalPinsFeature &&
          shouldPersistSettings &&
          isMetricsSavingPinsEnabled
      ),
      tap(() => {
        const tags = this.savedPinsDataSource.getSavedScalarPins();
        if (!tags || tags.length === 0) {
          return;
        }
        const unresolvedPinnedCards = tags.map((tag) => ({
          plugin: PluginType.SCALARS,
          tag: tag,
        }));
        this.store.dispatch(
          actions.metricsUnresolvedPinnedCardsFromLocalStorageAdded({
            cards: unresolvedPinnedCards,
          })
        );
      })
    );

    this.removeAllPins$ = this.actions$.pipe(
      ofType(actions.metricsClearAllPinnedCards),
      withLatestFrom(
        this.store.select(selectors.getEnableGlobalPins),
        this.store.select(selectors.getShouldPersistSettings),
        this.store.select(selectors.getMetricsSavingPinsEnabled)
      ),
      filter(
        ([
          ,
          enableGlobalPinsFeature,
          shouldPersistSettings,
          isMetricsSavingPinsEnabled,
        ]) =>
          enableGlobalPinsFeature &&
          shouldPersistSettings &&
          isMetricsSavingPinsEnabled
      ),
      tap(() => {
        this.savedPinsDataSource.removeAllScalarPins();
      })
    );

    this.addOrRemovePinsOnToggle$ = this.actions$.pipe(
      ofType(actions.metricsEnableSavingPinsToggled),
      withLatestFrom(
        this.store.select(selectors.getPinnedCardsWithMetadata),
        this.store.select(selectors.getEnableGlobalPins),
        this.store.select(selectors.getShouldPersistSettings),
        this.store.select(selectors.getMetricsSavingPinsEnabled)
      ),
      filter(
        ([, , enableGlobalPins, getShouldPersistSettings]) =>
          enableGlobalPins && getShouldPersistSettings
      ),
      tap(([, pinnedCards, , , getMetricsSavingPinsEnabled]) => {
        if (getMetricsSavingPinsEnabled) {
          const tags: Tag[] = pinnedCards
            .map((card) => {
              return card.plugin === PluginType.SCALARS ? card.tag : null;
            })
            .filter((v): v is Tag => v !== null);
          this.savedPinsDataSource.saveScalarPins(tags);
        } else {
          this.savedPinsDataSource.removeAllScalarPins();
        }
      })
    );

    this.dataEffects$ = createEffect(
      () => {
        return merge(
          /**
           * Subscribes to: dashboard shown, route navigation, reloads.
           */
          this.loadTagMetadata$,

          /**
           * Subscribes to: card visibility, reloads.
           */
          this.loadTimeSeries$,

          /**
           * Subscribes to: cardPinStateToggled.
           */
          this.addOrRemovePin$,
          /**
           * Subscribes to: dashboard shown (initAction).
           */
          this.loadSavedPins$,
          /**
           * Subscribes to: metricsClearAllPinnedCards.
           */
          this.removeAllPins$,
          /**
           * Subscribes to: metricsEnableSavingPinsToggled.
           */
          this.addOrRemovePinsOnToggle$
        );
      },
      {dispatch: false}
    );
  }
}

export const TEST_ONLY = {
  getCardFetchInfo,
  initAction,
};
