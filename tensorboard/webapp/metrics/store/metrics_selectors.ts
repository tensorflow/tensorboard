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
import {createFeatureSelector, createSelector} from '@ngrx/store';
import {DataLoadState} from '../../types/data';

import {State} from '../../app_state';
import {DeepReadonly} from '../../util/types';
import {
  CardId,
  CardIdWithMetadata,
  CardUniqueInfo,
  CardMetadata,
  HistogramMode,
  NonPinnedCardId,
  PinnedCardId,
  TooltipSort,
  XAxisType,
} from '../types';

import * as storeUtils from './metrics_store_internal_utils';
import {
  CardMetadataMap,
  METRICS_FEATURE_KEY,
  MetricsState,
  RunToSeries,
  TagMetadata,
} from './metrics_types';

/** @typehack */ import * as _typeHackStore from '@ngrx/store';

const selectMetricsState = createFeatureSelector<State, MetricsState>(
  METRICS_FEATURE_KEY
);

export const getMetricsTagMetadataLoaded = createSelector(
  selectMetricsState,
  (state: MetricsState): DataLoadState => state.tagMetadataLoaded
);

export const getMetricsTagMetadata = createSelector(
  selectMetricsState,
  (state: MetricsState): DeepReadonly<TagMetadata> => {
    return state.tagMetadata;
  }
);

/**
 * Cards
 */
const getCardIds = createSelector(selectMetricsState, (state): CardId[] => {
  return state.cardList;
});

export const getCardLoadState = createSelector(
  selectMetricsState,
  (state: MetricsState, cardId: CardId): DataLoadState => {
    if (!state.cardMetadataMap.hasOwnProperty(cardId)) {
      return DataLoadState.NOT_LOADED;
    }
    const {plugin, tag, runId, sample} = state.cardMetadataMap[cardId];
    const loadable = storeUtils.getTimeSeriesLoadable(
      state.timeSeriesData,
      plugin,
      tag,
      sample
    );
    if (!loadable) {
      return DataLoadState.NOT_LOADED;
    }
    const runToLoadState = loadable.runToLoadState;
    if (runId) {
      return runToLoadState.hasOwnProperty(runId)
        ? runToLoadState[runId]
        : DataLoadState.NOT_LOADED;
    }

    const runIds = storeUtils.getRunIds(state.tagMetadata, plugin, tag, sample);
    if (!runIds.length) {
      throw new Error('Cannot load a card whose tag has no runs');
    }
    if (
      runIds.every((runId) => runToLoadState[runId] === DataLoadState.LOADED)
    ) {
      return DataLoadState.LOADED;
    }
    return runIds.some(
      (runId) => runToLoadState[runId] === DataLoadState.LOADING
    )
      ? DataLoadState.LOADING
      : DataLoadState.NOT_LOADED;
  }
);

export const getCardTimeSeries = createSelector(
  selectMetricsState,
  (state: MetricsState, cardId: CardId): DeepReadonly<RunToSeries> | null => {
    if (!state.cardMetadataMap.hasOwnProperty(cardId)) {
      return null;
    }
    const {plugin, tag, sample} = state.cardMetadataMap[cardId];
    const loadable = storeUtils.getTimeSeriesLoadable(
      state.timeSeriesData,
      plugin,
      tag,
      sample
    );
    return loadable ? loadable.runToSeries : null;
  }
);

const getCardMetadataMap = createSelector(
  selectMetricsState,
  (state: MetricsState): CardMetadataMap => {
    return state.cardMetadataMap;
  }
);

export const getCardMetadata = createSelector(
  getCardMetadataMap,
  (
    metadataMap: CardMetadataMap,
    cardId: CardId
  ): DeepReadonly<CardMetadata> | null => {
    if (!metadataMap.hasOwnProperty(cardId)) {
      return null;
    }
    return metadataMap[cardId];
  }
);

// A cheap identity selector to skip recomputing selectors.
const getVisibleCardIdSet = createSelector(
  selectMetricsState,
  (state): Set<CardId> => {
    return state.visibleCards;
  }
);

export const getVisibleCardIds = createSelector(
  getVisibleCardIdSet,
  (cardIdSet: Set<CardId>): CardId[] => {
    return [...cardIdSet];
  }
);

/**
 * Returns current list of card data whose metadata is loaded.
 */
export const getNonEmptyCardIdsWithMetadata = createSelector(
  getCardIds,
  getCardMetadataMap,
  (
    cardIds: CardId[],
    metadataMap: CardMetadataMap
  ): DeepReadonly<CardIdWithMetadata[]> => {
    return cardIds
      .filter((cardId) => {
        return metadataMap.hasOwnProperty(cardId);
      })
      .map((cardId) => {
        return {cardId, ...metadataMap[cardId]};
      });
  }
);

/**
 * The index into the step values array for a card's UI. This may be greater
 * than the number of step values available, if time series data is not loaded.
 */
export const getCardStepIndex = createSelector(
  selectMetricsState,
  (state: MetricsState, cardId: CardId): number | null => {
    if (!state.cardStepIndex.hasOwnProperty(cardId)) {
      return null;
    }
    return state.cardStepIndex[cardId];
  }
);

const getCardToPinnedCopy = createSelector(
  selectMetricsState,
  (state): Map<NonPinnedCardId, PinnedCardId> => {
    return state.cardToPinnedCopy;
  }
);

const getPinnedCardToOriginal = createSelector(
  selectMetricsState,
  (state): Map<PinnedCardId, NonPinnedCardId> => {
    return state.pinnedCardToOriginal;
  }
);

/**
 * Returns an ordered list of the cards in the pinned location.
 */
export const getPinnedCardsWithMetadata = createSelector(
  getCardToPinnedCopy,
  getCardMetadataMap,
  (
    cardToPinnedCopy: Map<NonPinnedCardId, PinnedCardId>,
    metadataMap: CardMetadataMap
  ): DeepReadonly<CardIdWithMetadata[]> => {
    return [...cardToPinnedCopy.values()]
      .filter((cardId) => {
        return metadataMap.hasOwnProperty(cardId);
      })
      .map((cardId) => {
        return {cardId, ...metadataMap[cardId]};
      });
  }
);

/**
 * Returns true if a card is pinned or a separate card exists that is a pinned
 * copy of this card. Defaults to false if the card is unknown.
 */
export const getCardPinnedState = createSelector(
  getCardToPinnedCopy,
  getPinnedCardToOriginal,
  (
    cardToPinnedCopy: Map<NonPinnedCardId, PinnedCardId>,
    pinnedCardToOriginal: Map<PinnedCardId, NonPinnedCardId>,
    cardId: NonPinnedCardId | PinnedCardId
  ): boolean => {
    return cardToPinnedCopy.has(cardId) || pinnedCardToOriginal.has(cardId);
  }
);

export const getUnresolvedImportedPinnedCards = createSelector(
  selectMetricsState,
  (state: MetricsState): CardUniqueInfo[] => {
    return state.unresolvedImportedPinnedCards;
  }
);

/**
 * Whether the UI is allowed to pin more cards. This may be limited if the URL
 * contains too many pins already.
 */
export const getCanCreateNewPins = createSelector(
  selectMetricsState,
  (state: MetricsState): boolean => {
    return storeUtils.canCreateNewPins(state);
  }
);

/**
 * Settings.
 */
export const getMetricsTooltipSort = createSelector(
  selectMetricsState,
  (state): TooltipSort => state.settings.tooltipSort
);

export const getMetricsIgnoreOutliers = createSelector(
  selectMetricsState,
  (state): boolean => state.settings.ignoreOutliers
);

export const getMetricsXAxisType = createSelector(
  selectMetricsState,
  (state): XAxisType => state.settings.xAxisType
);

export const getMetricsHistogramMode = createSelector(
  selectMetricsState,
  (state): HistogramMode => state.settings.histogramMode
);

export const getMetricsScalarSmoothing = createSelector(
  selectMetricsState,
  (state): number => state.settings.scalarSmoothing
);

export const getMetricsImageBrightnessInMilli = createSelector(
  selectMetricsState,
  (state): number => state.settings.imageBrightnessInMilli
);

export const getMetricsImageContrastInMilli = createSelector(
  selectMetricsState,
  (state): number => state.settings.imageContrastInMilli
);

export const getMetricsImageShowActualSize = createSelector(
  selectMetricsState,
  (state): boolean => state.settings.imageShowActualSize
);

export const getMetricsTagFilter = createSelector(
  selectMetricsState,
  (state): string => state.tagFilter
);

export const getMetricsTagGroupExpansionState = createSelector(
  selectMetricsState,
  (state: MetricsState, tagGroup: string): boolean => {
    return Boolean(state.tagGroupExpanded.get(tagGroup));
  }
);
