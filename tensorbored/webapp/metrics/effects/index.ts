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
  debounceTime,
  throttleTime,
  filter,
  map,
  mergeMap,
  switchMap,
  take,
  tap,
  withLatestFrom,
} from 'rxjs/operators';

const TAG_FILTER_STORAGE_KEY = '_tb_tag_filter.v1';
const SUPERIMPOSED_CARDS_STORAGE_KEY = '_tb_superimposed_cards.v1';
const AXIS_SCALES_STORAGE_KEY = '_tb_axis_scales.v1';
const TAG_GROUP_EXPANSION_STORAGE_KEY = '_tb_tag_group_expansion.v1';
const CARD_FULL_WIDTH_STORAGE_KEY = '_tb_card_full_width.v1';

type StoredAxisScalesV1 = {
  version: 1;
  yAxisScale?: string;
  xAxisScale?: string;
  tagAxisScales?: Record<string, {y?: string; x?: string}>;
  symlogLinearThreshold?: number;
  tagSymlogLinearThresholds?: Record<string, number>;
};

type StoredSuperimposedCard = {
  id: string;
  title: string;
  tags: string[];
  runId: string | null;
};

type StoredSuperimposedCardsV1 = {
  version: 1;
  cards: StoredSuperimposedCard[];
};

function safeParseStoredSuperimposedCards(
  serialized: string | null
): StoredSuperimposedCardsV1 {
  if (!serialized) {
    return {version: 1, cards: []};
  }
  try {
    const parsed = JSON.parse(serialized) as Partial<StoredSuperimposedCardsV1>;
    if (parsed.version !== 1 || !Array.isArray(parsed.cards)) {
      return {version: 1, cards: []};
    }
    // Validate each card has required fields
    const validCards = parsed.cards.filter(
      (card) =>
        typeof card.id === 'string' &&
        typeof card.title === 'string' &&
        Array.isArray(card.tags) &&
        card.tags.length > 0
    );
    return {version: 1, cards: validCards};
  } catch {
    return {version: 1, cards: []};
  }
}
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
} from '../data_source/index';
import {
  getCardLoadState,
  getCardMetadata,
  getMetricsTagMetadataLoadState,
  getMetricsYAxisScale,
  getMetricsXAxisScale,
  getTagAxisScales,
  getMetricsSymlogLinearThreshold,
  getTagSymlogLinearThresholds,
  getSuperimposedCardsWithMetadata,
  getMetricsTagGroupExpansionMap,
  getCardStateMap,
  getFullWidthSuperimposedCards,
} from '../store';
import {
  isAxisScaleName,
  nameToScaleType,
  scaleTypeToName,
} from '../../profile/types';
import {ScaleType} from '../../widgets/line_chart_v2/lib/scale_types';
import {CardId, CardMetadata, CardUniqueInfo, PluginType} from '../types';

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
    // Explicitly construct CardFetchInfo to handle optional properties correctly
    const result: CardFetchInfo = {
      plugin: maybeMetadata.plugin,
      tag: maybeMetadata.tag,
      runId: maybeMetadata.runId,
      loadState,
      id: cardId,
    };
    if (maybeMetadata.sample !== undefined) {
      result.sample = maybeMetadata.sample;
    }
    if (maybeMetadata.numSample !== undefined) {
      result.numSample = maybeMetadata.numSample;
    }
    if (maybeMetadata.tags !== undefined) {
      result.tags = [...maybeMetadata.tags];
    }
    if (maybeMetadata.title !== undefined) {
      result.title = maybeMetadata.title;
    }
    return result;
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
  private readonly loadSuperimposedTimeSeries$;

  private readonly addOrRemovePin$;
  private readonly reorderPins$;

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

    this.loadSuperimposedTimeSeries$ = this.actions$.pipe(
      ofType(
        actions.superimposedCardCreated,
        actions.superimposedCardTagAdded,
        actions.profileMetricsSettingsApplied
      ),
      map((action) => {
        if ('tags' in action) {
          return action.tags;
        }
        if ('tag' in action) {
          return [action.tag];
        }
        return action.superimposedCards.flatMap((card) => card.tags);
      }),
      map((tags) => Array.from(new Set(tags))),
      filter((tags) => tags.length > 0),
      withLatestFrom(
        this.store
          .select(selectors.getExperimentIdsFromRoute)
          .pipe(filter((experimentIds) => experimentIds !== null))
      ),
      mergeMap(([tags, experimentIds]) => {
        const fetchInfos: CardFetchInfo[] = tags.map((tag) => ({
          id: `superimposed-${tag}`,
          plugin: PluginType.SCALARS,
          tag,
          runId: null,
          loadState: DataLoadState.NOT_LOADED,
        }));
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
        if (!card) {
          return;
        }

        // Build CardUniqueInfo for this card (supports all plugin types)
        const cardInfo: CardUniqueInfo = {
          plugin: card.plugin,
          tag: card.tag,
        };
        if (card.runId) {
          cardInfo.runId = card.runId;
        }
        if (card.sample !== undefined) {
          cardInfo.sample = card.sample;
        }

        if (wasPinned) {
          this.savedPinsDataSource.removePin(cardInfo);
        } else if (canCreateNewPins) {
          this.savedPinsDataSource.savePin(cardInfo);
        }
      })
    );

    this.reorderPins$ = this.actions$.pipe(
      ofType(actions.metricsPinnedCardsReordered),
      withLatestFrom(
        this.store.select(selectors.getPinnedCardsWithMetadata),
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
      tap(([, pinnedCards]) => {
        const cardInfos: CardUniqueInfo[] = pinnedCards.map((card) => {
          const info: CardUniqueInfo = {
            plugin: card.plugin,
            tag: card.tag,
          };
          if (card.runId) {
            info.runId = card.runId;
          }
          if (card.sample !== undefined) {
            info.sample = card.sample;
          }
          return info;
        });
        this.savedPinsDataSource.setSavedPins(cardInfos);
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
        // Migrate any legacy scalar-only pins to the new format
        this.savedPinsDataSource.migrateLegacyPins();

        // Load all saved pins (supports all plugin types)
        const savedPins = this.savedPinsDataSource.getSavedPins();
        if (!savedPins || savedPins.length === 0) {
          return;
        }

        // Convert CardUniqueInfo to the format expected by the action
        const unresolvedPinnedCards = savedPins.map((pin) => {
          const card: CardUniqueInfo = {
            plugin: pin.plugin,
            tag: pin.tag,
          };
          if (pin.runId !== undefined) {
            card.runId = pin.runId;
          }
          if (pin.sample !== undefined) {
            card.sample = pin.sample;
          }
          return card;
        });

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
        // Remove all pins from localStorage (new format)
        this.savedPinsDataSource.removeAllPins();
        // Also clear legacy pins for consistency
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
          // Save all pinned cards (all plugin types, not just scalars)
          const cardInfos: CardUniqueInfo[] = pinnedCards.map((card) => {
            const info: CardUniqueInfo = {
              plugin: card.plugin,
              tag: card.tag,
            };
            if (card.runId) {
              info.runId = card.runId;
            }
            if (card.sample !== undefined) {
              info.sample = card.sample;
            }
            return info;
          });
          this.savedPinsDataSource.setSavedPins(cardInfos);
        } else {
          this.savedPinsDataSource.removeAllPins();
          this.savedPinsDataSource.removeAllScalarPins();
        }
      })
    );

    // Persist tag filter to localStorage when user changes it
    this.persistTagFilter$ = this.actions$.pipe(
      ofType(actions.metricsTagFilterChanged),
      debounceTime(200),
      tap(({tagFilter}) => {
        // Store the user-set tag filter value. Empty string means user cleared it.
        window.localStorage.setItem(
          TAG_FILTER_STORAGE_KEY,
          JSON.stringify({value: tagFilter, timestamp: Date.now()})
        );
      })
    );

    // Load tag filter from localStorage on navigation (overrides profile value if set)
    this.loadTagFilterFromStorage$ = this.actions$.pipe(
      ofType(routingActions.navigated),
      take(1),
      map(() => {
        const stored = window.localStorage.getItem(TAG_FILTER_STORAGE_KEY);
        if (!stored) {
          return null;
        }
        try {
          const parsed = JSON.parse(stored) as {
            value?: string;
            timestamp?: number;
          };
          // Only apply if the value exists (including empty string which means cleared)
          if (typeof parsed.value === 'string') {
            return parsed.value;
          }
        } catch {
          // Invalid JSON, ignore
        }
        return null;
      }),
      filter((value): value is string => value !== null),
      map((tagFilter) => actions.metricsTagFilterChanged({tagFilter}))
    );

    // Persist superimposed cards to localStorage when they change
    this.persistSuperimposedCards$ = this.actions$.pipe(
      ofType(
        actions.superimposedCardCreated,
        actions.superimposedCardTagAdded,
        actions.superimposedCardTagRemoved,
        actions.superimposedCardDeleted,
        actions.superimposedCardTitleChanged,
        actions.superimposedCardCreatedFromCards,
        actions.profileMetricsSettingsApplied,
        actions.superimposedCardsLoaded
      ),
      debounceTime(200),
      withLatestFrom(this.store.select(getSuperimposedCardsWithMetadata)),
      tap(([, superimposedCards]) => {
        const payload: StoredSuperimposedCardsV1 = {
          version: 1,
          cards: superimposedCards.map((card) => ({
            id: card.id,
            title: card.title,
            tags: card.tags,
            runId: card.runId,
          })),
        };
        window.localStorage.setItem(
          SUPERIMPOSED_CARDS_STORAGE_KEY,
          JSON.stringify(payload)
        );
      })
    );

    // Load superimposed cards from localStorage on navigation
    this.loadSuperimposedCardsFromStorage$ = this.actions$.pipe(
      ofType(routingActions.navigated),
      take(1),
      map(() => {
        const stored = safeParseStoredSuperimposedCards(
          window.localStorage.getItem(SUPERIMPOSED_CARDS_STORAGE_KEY)
        );
        return stored.cards;
      }),
      filter((cards) => cards.length > 0),
      map((cards) =>
        actions.superimposedCardsLoaded({superimposedCards: cards})
      )
    );

    // Persist axis scales to localStorage when user changes them
    this.persistAxisScales$ = this.actions$.pipe(
      ofType(
        actions.metricsChangeYAxisScale,
        actions.metricsChangeXAxisScale,
        actions.metricsTagYAxisScaleChanged,
        actions.metricsTagXAxisScaleChanged,
        actions.metricsChangeSymlogLinearThreshold,
        actions.metricsTagSymlogLinearThresholdChanged,
        actions.profileMetricsSettingsApplied
      ),
      debounceTime(200),
      withLatestFrom(
        this.store.select(getMetricsYAxisScale),
        this.store.select(getMetricsXAxisScale),
        this.store.select(getTagAxisScales),
        this.store.select(getMetricsSymlogLinearThreshold),
        this.store.select(getTagSymlogLinearThresholds)
      ),
      tap(
        ([
          ,
          yScale,
          xScale,
          tagScales,
          symlogThreshold,
          tagSymlogThresholds,
        ]) => {
          const tagAxisScalesPayload: Record<string, {y?: string; x?: string}> =
            {};
          for (const [tag, scales] of Object.entries(tagScales)) {
            const entry: {y?: string; x?: string} = {};
            if (scales.yAxisScale !== ScaleType.LINEAR) {
              entry.y = scaleTypeToName(scales.yAxisScale);
            }
            if (scales.xAxisScale !== ScaleType.LINEAR) {
              entry.x = scaleTypeToName(scales.xAxisScale);
            }
            if (entry.y || entry.x) {
              tagAxisScalesPayload[tag] = entry;
            }
          }
          const payload: StoredAxisScalesV1 = {
            version: 1,
            ...(yScale !== ScaleType.LINEAR
              ? {yAxisScale: scaleTypeToName(yScale)}
              : undefined),
            ...(xScale !== ScaleType.LINEAR
              ? {xAxisScale: scaleTypeToName(xScale)}
              : undefined),
            ...(Object.keys(tagAxisScalesPayload).length > 0
              ? {tagAxisScales: tagAxisScalesPayload}
              : undefined),
            ...(symlogThreshold !== 1
              ? {symlogLinearThreshold: symlogThreshold}
              : undefined),
            ...(Object.keys(tagSymlogThresholds).length > 0
              ? {tagSymlogLinearThresholds: tagSymlogThresholds}
              : undefined),
          };
          if (
            payload.yAxisScale ||
            payload.xAxisScale ||
            payload.tagAxisScales ||
            payload.symlogLinearThreshold ||
            payload.tagSymlogLinearThresholds
          ) {
            window.localStorage.setItem(
              AXIS_SCALES_STORAGE_KEY,
              JSON.stringify(payload)
            );
          } else {
            window.localStorage.removeItem(AXIS_SCALES_STORAGE_KEY);
          }
          window.dispatchEvent(new CustomEvent('tb-axis-scales-changed'));
        }
      )
    );

    // Load axis scales from localStorage on navigation
    this.loadAxisScalesFromStorage$ = this.actions$.pipe(
      ofType(routingActions.navigated),
      take(1),
      map(() => {
        const raw = window.localStorage.getItem(AXIS_SCALES_STORAGE_KEY);
        if (!raw) return [];
        try {
          const parsed = JSON.parse(raw) as Partial<StoredAxisScalesV1>;
          if (parsed.version !== 1) return [];
          const scaleActions: Action[] = [];
          if (parsed.yAxisScale && isAxisScaleName(parsed.yAxisScale)) {
            scaleActions.push(
              actions.metricsChangeYAxisScale({
                scaleType: nameToScaleType(parsed.yAxisScale),
              })
            );
          }
          if (parsed.xAxisScale && isAxisScaleName(parsed.xAxisScale)) {
            scaleActions.push(
              actions.metricsChangeXAxisScale({
                scaleType: nameToScaleType(parsed.xAxisScale),
              })
            );
          }
          if (parsed.tagAxisScales) {
            for (const [tag, entry] of Object.entries(parsed.tagAxisScales)) {
              if (entry.y && isAxisScaleName(entry.y)) {
                scaleActions.push(
                  actions.metricsTagYAxisScaleChanged({
                    tag,
                    scaleType: nameToScaleType(entry.y),
                  })
                );
              }
              if (entry.x && isAxisScaleName(entry.x)) {
                scaleActions.push(
                  actions.metricsTagXAxisScaleChanged({
                    tag,
                    scaleType: nameToScaleType(entry.x),
                  })
                );
              }
            }
          }
          if (
            typeof parsed.symlogLinearThreshold === 'number' &&
            parsed.symlogLinearThreshold > 0
          ) {
            scaleActions.push(
              actions.metricsChangeSymlogLinearThreshold({
                symlogLinearThreshold: parsed.symlogLinearThreshold,
              })
            );
          }
          if (parsed.tagSymlogLinearThresholds) {
            for (const [tag, threshold] of Object.entries(
              parsed.tagSymlogLinearThresholds
            )) {
              if (typeof threshold === 'number' && threshold > 0) {
                scaleActions.push(
                  actions.metricsTagSymlogLinearThresholdChanged({
                    tag,
                    symlogLinearThreshold: threshold,
                  })
                );
              }
            }
          }
          return scaleActions;
        } catch {
          return [];
        }
      }),
      filter((scaleActions) => scaleActions.length > 0),
      mergeMap((scaleActions) => scaleActions)
    );

    this.persistTagGroupExpansion$ = this.actions$.pipe(
      ofType(
        actions.metricsTagGroupExpansionChanged,
        actions.metricsTagMetadataLoaded
      ),
      debounceTime(200),
      withLatestFrom(this.store.select(getMetricsTagGroupExpansionMap)),
      tap(([, expansionMap]) => {
        const entries: Array<[string, boolean]> = Array.from(
          expansionMap.entries()
        );
        if (entries.length > 0) {
          window.localStorage.setItem(
            TAG_GROUP_EXPANSION_STORAGE_KEY,
            JSON.stringify({version: 1, groups: entries})
          );
        } else {
          window.localStorage.removeItem(TAG_GROUP_EXPANSION_STORAGE_KEY);
        }
        window.dispatchEvent(new CustomEvent('tb-tag-group-expansion-changed'));
      })
    );

    this.loadTagGroupExpansionFromStorage$ = this.actions$.pipe(
      ofType(routingActions.navigated),
      take(1),
      map(() => {
        const raw = window.localStorage.getItem(
          TAG_GROUP_EXPANSION_STORAGE_KEY
        );
        if (!raw) return null;
        try {
          const parsed = JSON.parse(raw) as {
            version?: number;
            groups?: Array<[string, boolean]>;
          };
          if (parsed.version !== 1 || !Array.isArray(parsed.groups)) {
            return null;
          }
          const valid = parsed.groups.filter(
            (entry): entry is [string, boolean] =>
              Array.isArray(entry) &&
              entry.length === 2 &&
              typeof entry[0] === 'string' &&
              typeof entry[1] === 'boolean'
          );
          return valid.length > 0 ? valid : null;
        } catch {
          return null;
        }
      }),
      filter((groups): groups is Array<[string, boolean]> => groups !== null),
      map((groups) =>
        actions.metricsTagGroupExpansionStateLoaded({expandedGroups: groups})
      )
    );

    this.persistCardFullWidth$ = this.actions$.pipe(
      ofType(
        actions.metricsCardFullSizeToggled,
        actions.superimposedCardFullWidthChanged,
        actions.cardFullWidthStateLoaded
      ),
      debounceTime(200),
      withLatestFrom(
        this.store.select(getCardStateMap),
        this.store.select(getFullWidthSuperimposedCards)
      ),
      tap(([, cardStateMap, fullWidthSuperimposed]) => {
        const fullWidthCardIds: string[] = [];
        for (const [cardId, state] of Object.entries(cardStateMap)) {
          if (state?.fullWidth) {
            fullWidthCardIds.push(cardId);
          }
        }
        const fullWidthSuperimposedCardIds = Array.from(fullWidthSuperimposed);
        if (
          fullWidthCardIds.length > 0 ||
          fullWidthSuperimposedCardIds.length > 0
        ) {
          window.localStorage.setItem(
            CARD_FULL_WIDTH_STORAGE_KEY,
            JSON.stringify({
              version: 1,
              cards: fullWidthCardIds,
              superimposed: fullWidthSuperimposedCardIds,
            })
          );
        } else {
          window.localStorage.removeItem(CARD_FULL_WIDTH_STORAGE_KEY);
        }
      })
    );

    this.loadCardFullWidthFromStorage$ = this.actions$.pipe(
      ofType(routingActions.navigated),
      take(1),
      map(() => {
        const raw = window.localStorage.getItem(CARD_FULL_WIDTH_STORAGE_KEY);
        if (!raw) return null;
        try {
          const parsed = JSON.parse(raw) as {
            version?: number;
            cards?: string[];
            superimposed?: string[];
          };
          if (parsed.version !== 1) return null;
          const cards = Array.isArray(parsed.cards) ? parsed.cards : [];
          const superimposed = Array.isArray(parsed.superimposed)
            ? parsed.superimposed
            : [];
          if (cards.length === 0 && superimposed.length === 0) return null;
          return {
            fullWidthCardIds: cards,
            fullWidthSuperimposedCardIds: superimposed,
          };
        } catch {
          return null;
        }
      }),
      filter(
        (
          result
        ): result is {
          fullWidthCardIds: string[];
          fullWidthSuperimposedCardIds: string[];
        } => result !== null
      ),
      map((result) => actions.cardFullWidthStateLoaded(result))
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
           * Subscribes to: superimposed card creation or tag updates.
           */
          this.loadSuperimposedTimeSeries$,

          /**
           * Subscribes to: cardPinStateToggled.
           */
          this.addOrRemovePin$,
          /**
           * Subscribes to: metricsPinnedCardsReordered.
           */
          this.reorderPins$,
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
          this.addOrRemovePinsOnToggle$,
          /**
           * Subscribes to: metricsTagFilterChanged - persists to localStorage.
           */
          this.persistTagFilter$,
          /**
           * Subscribes to: superimposed card changes - persists to localStorage.
           */
          this.persistSuperimposedCards$,
          /**
           * Subscribes to: axis scale changes - persists to localStorage.
           */
          this.persistAxisScales$,
          /**
           * Subscribes to: tag group expansion changes - persists to localStorage.
           */
          this.persistTagGroupExpansion$,
          /**
           * Subscribes to: card full width changes - persists to localStorage.
           */
          this.persistCardFullWidth$
        );
      },
      {dispatch: false}
    );

    this.applyTagFilterFromStorage$ = createEffect(
      () => this.loadTagFilterFromStorage$
    );

    this.applySuperimposedCardsFromStorage$ = createEffect(
      () => this.loadSuperimposedCardsFromStorage$
    );

    this.applyAxisScalesFromStorage$ = createEffect(
      () => this.loadAxisScalesFromStorage$
    );

    this.applyTagGroupExpansionFromStorage$ = createEffect(
      () => this.loadTagGroupExpansionFromStorage$
    );

    this.applyCardFullWidthFromStorage$ = createEffect(
      () => this.loadCardFullWidthFromStorage$
    );
  }

  private readonly persistTagFilter$;
  private readonly loadTagFilterFromStorage$;
  readonly applyTagFilterFromStorage$;
  private readonly persistSuperimposedCards$;
  private readonly loadSuperimposedCardsFromStorage$;
  readonly applySuperimposedCardsFromStorage$;
  private readonly persistAxisScales$;
  private readonly loadAxisScalesFromStorage$;
  readonly applyAxisScalesFromStorage$;
  private readonly persistTagGroupExpansion$;
  private readonly loadTagGroupExpansionFromStorage$;
  readonly applyTagGroupExpansionFromStorage$;
  private readonly persistCardFullWidth$;
  private readonly loadCardFullWidthFromStorage$;
  readonly applyCardFullWidthFromStorage$;
}

export const TEST_ONLY = {
  getCardFetchInfo,
  initAction,
};
