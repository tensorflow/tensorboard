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
import {Action, createReducer, on} from '@ngrx/store';
import * as coreActions from '../../core/actions';
import {DataLoadState} from '../../types/data';

import {stateRehydratedFromUrl} from '../../app_routing/actions';
import {createRouteContextedState} from '../../app_routing/route_contexted_reducer_helper';
import {RouteKind} from '../../app_routing/types';
import {mapObjectValues} from '../../util/lang';
import {composeReducers} from '../../util/ngrx';
import * as actions from '../actions';
import {
  isFailedTimeSeriesResponse,
  isSampledPlugin,
  isSingleRunPlugin,
  isSingleRunTimeSeriesRequest,
  NonSampledPluginType,
  PluginType,
  TagMetadata as DataSourceTagMetadata,
  TimeSeriesRequest,
  TimeSeriesResponse,
} from '../data_source';
import {
  CardId,
  CardInStorage,
  CardMetadata,
  HistogramMode,
  NonPinnedCardId,
  TooltipSort,
  URLDeserializedState,
  XAxisType,
} from '../types';

import {
  createPluginDataWithLoadable,
  createRunToLoadState,
  getCardId,
  getPinnedCardId,
  getRunIds,
  getTimeSeriesLoadable,
} from './metrics_store_internal_utils';
import {
  CardMetadataMap,
  CardStepIndexMap,
  CardToPinnedCard,
  MetricsRoutefulState,
  MetricsRoutelessState,
  MetricsState,
  NonSampledPluginTagMetadata,
  PinnedCardToCard,
  TagMetadata,
  TimeSeriesData,
  TimeSeriesLoadable,
} from './metrics_types';

function buildCardMetadataList(tagMetadata: TagMetadata): CardMetadata[] {
  const results: CardMetadata[] = [];
  for (let pluginKey of Object.keys(tagMetadata)) {
    const plugin = pluginKey as PluginType;
    let tagToRuns;

    if (isSampledPlugin(plugin)) {
      if (isSingleRunPlugin(plugin)) {
        // Single-run, sampled format (e.g. Images).
        const tagRunSampleInfo = tagMetadata[plugin].tagRunSampledInfo;
        for (const tag of Object.keys(tagRunSampleInfo)) {
          for (const runId of Object.keys(tagRunSampleInfo[tag])) {
            const {maxSamplesPerStep} = tagRunSampleInfo[tag][runId];
            for (let i = 0; i < maxSamplesPerStep; i++) {
              results.push({plugin, tag, runId, sample: i});
            }
          }
        }
      } else {
        throw new Error(
          'Multi-run, sampled plugin support not yet implemented'
        );
      }
    } else {
      if (isSingleRunPlugin(plugin)) {
        // Single-run, unsampled format (e.g. Histograms).
        tagToRuns = tagMetadata[plugin].tagToRuns;
        for (const tag of Object.keys(tagToRuns)) {
          for (const runId of tagToRuns[tag]) {
            results.push({plugin, tag, runId});
          }
        }
      } else {
        // Multi-run, unsampled format (e.g. Scalars).
        tagToRuns = tagMetadata[plugin].tagToRuns;
        for (const tag of Object.keys(tagToRuns)) {
          results.push({plugin, tag, runId: null});
        }
      }
    }
  }
  return results;
}

function getMaxStepIndex(
  cardId: CardId,
  cardMetadataMap: CardMetadataMap,
  timeSeriesData: TimeSeriesData
): number | null {
  const {plugin, tag, runId, sample} = cardMetadataMap[cardId];
  const loadable = getTimeSeriesLoadable(timeSeriesData, plugin, tag, sample);
  if (loadable) {
    if (runId !== null && loadable.runToSeries.hasOwnProperty(runId)) {
      const seriesLength = loadable.runToSeries[runId].length;
      return seriesLength > 0 ? seriesLength - 1 : null;
    }
    const seriesLengths = Object.values(loadable.runToSeries).map(
      (series) => series.length
    );
    if (seriesLengths.length) {
      return Math.max(...seriesLengths) - 1;
    }
  }
  return null;
}

/**
 * Normalizes the step for cards in the step index map. This includes
 * - assign a default step
 * - reselect the max step, if the previous series' max was selected
 * - clamp to the new series' max
 * - set to `null` if the series contains no step data
 */
function buildNormalizedCardStepIndexMap(
  cardMetadataMap: CardMetadataMap,
  cardStepIndex: CardStepIndexMap,
  timeSeriesData: TimeSeriesData,
  prevTimeSeriesData: TimeSeriesData
): CardStepIndexMap {
  const result = {...cardStepIndex};
  for (const cardId in cardMetadataMap) {
    if (!cardMetadataMap.hasOwnProperty(cardId)) {
      continue;
    }
    const maxStepIndex = getMaxStepIndex(
      cardId,
      cardMetadataMap,
      timeSeriesData
    );
    if (maxStepIndex === null) {
      if (cardStepIndex.hasOwnProperty(cardId)) {
        result[cardId] = null;
      }
      continue;
    }
    const stepIndex = cardStepIndex.hasOwnProperty(cardId)
      ? cardStepIndex[cardId]
      : null;
    const prevMaxStepIndex = getMaxStepIndex(
      cardId,
      cardMetadataMap,
      prevTimeSeriesData
    );

    const prevWasMax = stepIndex !== null && stepIndex === prevMaxStepIndex;
    const shouldClamp = stepIndex !== null && stepIndex > maxStepIndex;
    const shouldAutoSelectMax = stepIndex === null || prevWasMax;
    if (shouldClamp || shouldAutoSelectMax) {
      result[cardId] = maxStepIndex;
    }
  }
  return result;
}

/**
 * Builds a new loadable whose runToLoadState represents a state where nothing
 * is loaded, and runToSeries is preserved.
 */
function buildResetLoadable(loadable: TimeSeriesLoadable) {
  const runToLoadState = mapObjectValues(
    loadable.runToLoadState,
    (loadState) => {
      return loadState === DataLoadState.LOADING
        ? DataLoadState.LOADING
        : DataLoadState.NOT_LOADED;
    }
  );
  return {...loadable, runToLoadState};
}

/**
 * Returns whether the CardMetadata exactly matches the pinned card from
 * storage.
 */
function cardMatchesCardInStorage(
  cardMetadata: CardMetadata,
  cardInStorage: CardInStorage
) {
  const noRunId = !cardMetadata.runId && !cardInStorage.runId;
  return (
    cardMetadata.tag === cardInStorage.tag &&
    cardMetadata.sample === cardInStorage.sample &&
    (cardMetadata.runId === cardInStorage.runId || noRunId)
  );
}

/**
 * Returns an identifier useful for comparing a card in storage with a real card
 * with loaded metadata.
 */
function hashCardInStorage(
  tag: string,
  runId?: string | null,
  sample?: number
) {
  return JSON.stringify([tag, runId || '', sample]);
}

/**
 * Impure helper to modify the state by creating a new pinned copy of the
 * provided card. May throw if the card provided has no metadata.
 */
function addPinnedCopyToState(
  cardId: NonPinnedCardId,
  nextCardToPinnedCopy: CardToPinnedCard,
  nextPinnedCardToOriginal: PinnedCardToCard,
  nextCardStepIndexMap: CardStepIndexMap,
  nextCardMetadataMap: CardMetadataMap
) {
  // No-op if the card is a pinned copy, or if it already has a pinned copy.
  if (
    nextPinnedCardToOriginal.has(cardId) ||
    nextCardToPinnedCopy.has(cardId)
  ) {
    return;
  }

  // Create a pinned copy. Copies step index from the original card.
  const pinnedCardId = getPinnedCardId(cardId);
  nextCardToPinnedCopy.set(cardId, pinnedCardId);
  nextPinnedCardToOriginal.set(pinnedCardId, cardId);
  if (nextCardStepIndexMap.hasOwnProperty(cardId)) {
    nextCardStepIndexMap[pinnedCardId] = nextCardStepIndexMap[cardId];
  }

  const metadata = nextCardMetadataMap[cardId];
  if (!metadata) {
    throw new Error('Cannot pin a card without metadata');
  }
  nextCardMetadataMap[pinnedCardId] = metadata;
}

const {initialState, reducers: routeContextReducer} = createRouteContextedState(
  {
    // Backend data.
    tagMetadataLoaded: DataLoadState.NOT_LOADED,
    tagMetadata: {
      scalars: {
        tagDescriptions: {},
        tagToRuns: {},
      },
      histograms: {
        tagDescriptions: {},
        tagToRuns: {},
      },
      images: {
        tagDescriptions: {},
        tagRunSampledInfo: {},
      },
    },

    // Cards.
    cardList: [],
    cardToPinnedCopy: new Map(),
    pinnedCardToOriginal: new Map(),
    prePinnedCards: [],
    cardMetadataMap: {},
    cardStepIndex: {},

    tagFilter: '',
    tagGroupExpanded: new Map<string, boolean>(),
  } as MetricsRoutefulState,

  {
    timeSeriesData: {
      scalars: {},
      histograms: {},
      images: {},
    },
    settings: {
      tooltipSort: TooltipSort.DEFAULT,
      ignoreOutliers: true,
      xAxisType: XAxisType.STEP,
      scalarSmoothing: 0.6,
      imageBrightnessInMilli: 1000,
      imageContrastInMilli: 1000,
      imageShowActualSize: false,
      histogramMode: HistogramMode.OFFSET,
    },
    visibleCards: new Set<CardId>(),
  } as MetricsRoutelessState,

  /** onRouteIdChanged */
  (state) => {
    return {
      ...state,
      // Reset visible cards in case we resume a route that was left dirty.
      // Since visibility tracking is async, the state may not have received
      // 'exited card' updates when it was cached by the router.
      visibleCards: new Set<CardId>(),
    };
  }
);

const reducer = createReducer(
  initialState,
  // This hydration action is dispatched on any in-app navigation.
  // switching plugin dashboards will trigger this, which clears things
  on(stateRehydratedFromUrl, (state, {routeKind, partialState}) => {
    if (
      routeKind !== RouteKind.EXPERIMENT &&
      routeKind !== RouteKind.COMPARE_EXPERIMENT
    ) {
      return state;
    }
    // The URL serializes pinned cards + pre-pinned cards. Keep these sets
    // mutually exclusive, and do not add duplicate pre-pinned cards.
    const seenHashes = new Set();
    for (const pinnedCardId of state.pinnedCardToOriginal.keys()) {
      const {tag, runId, sample} = state.cardMetadataMap[pinnedCardId];
      seenHashes.add(hashCardInStorage(tag, runId, sample));
    }

    const hydratedState = partialState as URLDeserializedState;
    const nextPrePinnedCards = [] as CardInStorage[];
    for (const card of [
      ...state.prePinnedCards,
      ...hydratedState.metrics.pinnedCards,
    ]) {
      const hash = hashCardInStorage(card.tag, card.runId, card.sample);
      if (!seenHashes.has(hash)) {
        seenHashes.add(hash);
        nextPrePinnedCards.push(card);
      }
    }
    return {
      ...state,
      prePinnedCards: nextPrePinnedCards,
    };
  }),
  on(coreActions.reload, coreActions.manualReload, (state) => {
    const nextTagMetadataLoaded =
      state.tagMetadataLoaded === DataLoadState.LOADING
        ? DataLoadState.LOADING
        : DataLoadState.NOT_LOADED;

    const nextTimeSeriesData = mapObjectValues<TimeSeriesData>(
      state.timeSeriesData,
      (pluginData, plugin) => {
        return mapObjectValues(pluginData, (tagData) => {
          if (!isSampledPlugin(plugin as PluginType)) {
            return buildResetLoadable(tagData);
          }
          return mapObjectValues(tagData, (sampleData) => {
            return buildResetLoadable(sampleData);
          });
        });
      }
    );

    return {
      ...state,
      tagMetadataLoaded: nextTagMetadataLoaded,
      timeSeriesData: nextTimeSeriesData,
    };
  }),
  on(
    actions.metricsTagMetadataRequested,
    (state: MetricsState): MetricsState => {
      return {
        ...state,
        tagMetadataLoaded: DataLoadState.LOADING,
      };
    }
  ),
  on(
    actions.metricsTagMetadataFailed,
    (state: MetricsState): MetricsState => {
      return {
        ...state,
        tagMetadataLoaded: DataLoadState.FAILED,
      };
    }
  ),
  on(
    actions.metricsTagMetadataLoaded,
    (
      state: MetricsState,
      {tagMetadata}: {tagMetadata: DataSourceTagMetadata}
    ): MetricsState => {
      const nextTagMetadata: TagMetadata = {
        scalars: buildPluginTagData(tagMetadata, PluginType.SCALARS),
        histograms: buildPluginTagData(tagMetadata, PluginType.HISTOGRAMS),
        images: tagMetadata[PluginType.IMAGES],
      };

      // Carry over pre-existing card metadata, even if the new tag
      // metadata does not include it.
      const nextCardMetadataMap = {...state.cardMetadataMap};
      const nextCardMetadataList = buildCardMetadataList(nextTagMetadata);
      const newCardIds = [];

      // Create new cards for unseen metadata.
      for (const cardMetadata of nextCardMetadataList) {
        const cardId = getCardId(cardMetadata);
        if (!state.cardMetadataMap.hasOwnProperty(cardId)) {
          nextCardMetadataMap[cardId] = cardMetadata;
          newCardIds.push(cardId);
        }
      }

      const nextCardList = newCardIds.length
        ? [...state.cardList, ...newCardIds]
        : state.cardList;

      // Automatically create pinned copies of new cards that match, and remove
      // new auto-pinned cards from prePinnedCards so that subsequent
      // `metricsTagMetadataLoaded` will not reset user-created pin states.
      const nextPrePinnedCardSet = new Set(state.prePinnedCards);
      const nextCardToPinnedCopy = new Map(state.cardToPinnedCopy);
      const nextPinnedCardToOriginal = new Map(state.pinnedCardToOriginal);
      const nextCardStepIndexMap = {...state.cardStepIndex};
      for (const newCardId of newCardIds) {
        for (const prePinnedCard of nextPrePinnedCardSet) {
          const cardMetadata = nextCardMetadataMap[newCardId];
          if (cardMatchesCardInStorage(cardMetadata, prePinnedCard)) {
            addPinnedCopyToState(
              newCardId,
              nextCardToPinnedCopy,
              nextPinnedCardToOriginal,
              nextCardStepIndexMap,
              nextCardMetadataMap
            );
            nextPrePinnedCardSet.delete(prePinnedCard);
            break;
          }
        }
      }

      return {
        ...state,
        tagMetadataLoaded: DataLoadState.LOADED,
        tagMetadata: nextTagMetadata,
        cardList: nextCardList,
        cardMetadataMap: nextCardMetadataMap,
        cardStepIndex: nextCardStepIndexMap,
        cardToPinnedCopy: nextCardToPinnedCopy,
        pinnedCardToOriginal: nextPinnedCardToOriginal,
        prePinnedCards: [...nextPrePinnedCardSet],
      };
    }
  ),
  on(actions.metricsTagFilterChanged, (state, {tagFilter}) => {
    return {
      ...state,
      tagFilter,
    };
  }),
  on(actions.metricsChangeTooltipSort, (state, {sort}) => {
    return {
      ...state,
      settings: {
        ...state.settings,
        tooltipSort: sort,
      },
    };
  }),
  on(actions.metricsToggleIgnoreOutliers, (state) => {
    return {
      ...state,
      settings: {
        ...state.settings,
        ignoreOutliers: !state.settings.ignoreOutliers,
      },
    };
  }),
  on(actions.metricsChangeXAxisType, (state, {xAxisType}) => {
    return {
      ...state,
      settings: {
        ...state.settings,
        xAxisType,
      },
    };
  }),
  on(actions.metricsChangeScalarSmoothing, (state, {smoothing}) => {
    return {
      ...state,
      settings: {
        ...state.settings,
        scalarSmoothing: smoothing,
      },
    };
  }),
  on(actions.metricsChangeImageBrightness, (state, {brightnessInMilli}) => {
    return {
      ...state,
      settings: {
        ...state.settings,
        imageBrightnessInMilli: brightnessInMilli,
      },
    };
  }),
  on(actions.metricsChangeImageContrast, (state, {contrastInMilli}) => {
    return {
      ...state,
      settings: {
        ...state.settings,
        imageContrastInMilli: contrastInMilli,
      },
    };
  }),
  on(actions.metricsResetImageBrightness, (state) => {
    return {
      ...state,
      settings: {
        ...state.settings,
        imageBrightnessInMilli: initialState.settings.imageBrightnessInMilli,
      },
    };
  }),
  on(actions.metricsResetImageContrast, (state) => {
    return {
      ...state,
      settings: {
        ...state.settings,
        imageContrastInMilli: initialState.settings.imageContrastInMilli,
      },
    };
  }),
  on(actions.metricsToggleImageShowActualSize, (state) => {
    return {
      ...state,
      settings: {
        ...state.settings,
        imageShowActualSize: !state.settings.imageShowActualSize,
      },
    };
  }),
  on(actions.metricsChangeHistogramMode, (state, {histogramMode}) => {
    return {
      ...state,
      settings: {
        ...state.settings,
        histogramMode,
      },
    };
  }),
  on(
    actions.multipleTimeSeriesRequested,
    (
      state: MetricsState,
      {requests}: {requests: TimeSeriesRequest[]}
    ): MetricsState => {
      if (!requests.length) {
        return state;
      }

      // TODO(psybuzz): the `experimentIds` field on requests is currently
      // ignored. Ideally this reducer should support requesting a
      // subset of all experiments.
      const nextTimeSeriesData = {...state.timeSeriesData};
      for (const request of requests) {
        const {plugin, tag, sample} = request;
        nextTimeSeriesData[plugin] = createPluginDataWithLoadable(
          nextTimeSeriesData,
          plugin,
          tag,
          sample
        ) as {};

        const loadable = getTimeSeriesLoadable(
          nextTimeSeriesData,
          plugin,
          tag,
          sample
        )!;
        const runIds = isSingleRunTimeSeriesRequest(request)
          ? [request.runId]
          : getRunIds(state.tagMetadata, plugin, tag, sample);
        loadable.runToLoadState = createRunToLoadState(
          DataLoadState.LOADING,
          runIds,
          loadable.runToLoadState
        );
      }
      return {...state, timeSeriesData: nextTimeSeriesData};
    }
  ),
  on(
    actions.fetchTimeSeriesFailed,
    (
      state: MetricsState,
      {request}: {request: TimeSeriesRequest}
    ): MetricsState => {
      const nextTimeSeriesData = {...state.timeSeriesData};
      const {plugin, tag, sample} = request;
      nextTimeSeriesData[plugin] = createPluginDataWithLoadable(
        nextTimeSeriesData,
        plugin,
        tag,
        sample
      ) as {};

      const loadable = getTimeSeriesLoadable(
        nextTimeSeriesData,
        plugin,
        tag,
        sample
      )!;
      const runIds = isSingleRunTimeSeriesRequest(request)
        ? [request.runId]
        : getRunIds(state.tagMetadata, plugin, tag, sample);
      loadable.runToLoadState = createRunToLoadState(
        DataLoadState.FAILED,
        runIds,
        loadable.runToLoadState
      );
      return {...state, timeSeriesData: nextTimeSeriesData};
    }
  ),
  on(
    actions.fetchTimeSeriesLoaded,
    (
      state: MetricsState,
      {response}: {response: TimeSeriesResponse}
    ): MetricsState => {
      // Update time series.
      const nextTimeSeriesData = {...state.timeSeriesData};
      const {plugin, tag, runId, sample} = response;
      nextTimeSeriesData[plugin] = createPluginDataWithLoadable(
        nextTimeSeriesData,
        plugin,
        tag,
        sample
      ) as {};

      const loadable = getTimeSeriesLoadable(
        nextTimeSeriesData,
        plugin,
        tag,
        sample
      )!;
      if (isFailedTimeSeriesResponse(response)) {
        const runIds = runId
          ? [runId]
          : getRunIds(state.tagMetadata, plugin, tag, sample);
        loadable.runToLoadState = createRunToLoadState(
          DataLoadState.FAILED,
          runIds,
          loadable.runToLoadState
        );
      } else {
        const runToSeries = response.runToSeries;
        loadable.runToSeries = {...loadable.runToSeries};
        loadable.runToLoadState = {...loadable.runToLoadState};
        for (const runId in runToSeries) {
          if (runToSeries.hasOwnProperty(runId)) {
            loadable.runToSeries[runId] = runToSeries[runId];
            loadable.runToLoadState[runId] = DataLoadState.LOADED;
          }
        }
      }

      const nextState = {
        ...state,
        timeSeriesData: nextTimeSeriesData,
        cardStepIndex: buildNormalizedCardStepIndexMap(
          state.cardMetadataMap,
          state.cardStepIndex,
          nextTimeSeriesData,
          state.timeSeriesData
        ),
      };
      return nextState;
    }
  ),
  on(actions.cardStepSliderChanged, (state, {cardId, stepIndex}) => {
    const maxStepIndex = getMaxStepIndex(
      cardId,
      state.cardMetadataMap,
      state.timeSeriesData
    );
    let nextStepIndex: number | null = stepIndex;
    if (maxStepIndex === null) {
      nextStepIndex = null;
    } else if (stepIndex > maxStepIndex) {
      nextStepIndex = maxStepIndex;
    }
    return {
      ...state,
      cardStepIndex: {...state.cardStepIndex, [cardId]: nextStepIndex},
    };
  }),
  on(actions.metricsTagGroupExpansionChanged, (state, {tagGroup}) => {
    const tagGroupExpanded = new Map(state.tagGroupExpanded);
    tagGroupExpanded.set(tagGroup, !tagGroupExpanded.get(tagGroup));

    return {...state, tagGroupExpanded};
  }),
  on(actions.cardVisibilityChanged, (state, {enteredCards, exitedCards}) => {
    if (enteredCards.size === 0 && exitedCards.size === 0) {
      return state;
    }

    const visibleCards = new Set(state.visibleCards);
    enteredCards.forEach((cardId) => {
      visibleCards.add(cardId);
    });
    exitedCards.forEach((cardId) => {
      visibleCards.delete(cardId);

      if (enteredCards.has(cardId)) {
        throw new Error(
          `A 'cardVisibilityChanged' with an invalid ` +
            `payload contains overlapping sets`
        );
      }
    });
    return {...state, visibleCards};
  }),
  on(actions.cardPinStateToggled, (state, {cardId}) => {
    const isPinnedCopy = state.pinnedCardToOriginal.has(cardId);
    const shouldPin = isPinnedCopy
      ? false
      : !state.cardToPinnedCopy.has(cardId);

    const nextCardToPinnedCopy = new Map(state.cardToPinnedCopy);
    const nextPinnedCardToOriginal = new Map(state.pinnedCardToOriginal);
    const nextCardMetadataMap = {...state.cardMetadataMap};
    const nextCardStepIndexMap = {...state.cardStepIndex};

    if (isPinnedCopy) {
      const originalCardId = state.pinnedCardToOriginal.get(cardId);
      nextCardToPinnedCopy.delete(originalCardId!);
      nextPinnedCardToOriginal.delete(cardId);
      delete nextCardMetadataMap[cardId];
      delete nextCardStepIndexMap[cardId];
    } else {
      if (shouldPin) {
        addPinnedCopyToState(
          cardId,
          nextCardToPinnedCopy,
          nextPinnedCardToOriginal,
          nextCardStepIndexMap,
          nextCardMetadataMap
        );
      } else {
        const pinnedCardId = state.cardToPinnedCopy.get(cardId)!;
        nextCardToPinnedCopy.delete(cardId);
        nextPinnedCardToOriginal.delete(pinnedCardId);
        delete nextCardMetadataMap[pinnedCardId];
        delete nextCardStepIndexMap[pinnedCardId];
      }
    }
    return {
      ...state,
      cardMetadataMap: nextCardMetadataMap,
      cardStepIndex: nextCardStepIndexMap,
      cardToPinnedCopy: nextCardToPinnedCopy,
      pinnedCardToOriginal: nextPinnedCardToOriginal,
    };
  })
);

export function reducers(state: MetricsState, action: Action) {
  return composeReducers(reducer, routeContextReducer)(state, action);
}

function buildPluginTagData(
  tagMetadata: DataSourceTagMetadata,
  pluginType: NonSampledPluginType
): NonSampledPluginTagMetadata {
  return {
    tagDescriptions: tagMetadata[pluginType].tagDescriptions,
    tagToRuns: buildTagToRuns(tagMetadata[pluginType].runTagInfo),
  };
}

/**
 * Takes a run-to-tag map and inverts it.
 */
function buildTagToRuns(runTagInfo: {[run: string]: string[]}) {
  const tagToRuns: {[tag: string]: string[]} = {};
  for (const run in runTagInfo) {
    for (const tag of runTagInfo[run]) {
      tagToRuns[tag] = [...(tagToRuns[tag] || []), run];
    }
  }
  return tagToRuns;
}
