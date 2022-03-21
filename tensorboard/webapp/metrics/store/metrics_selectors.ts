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
import {State} from '../../app_state';
import {DataLoadState, LoadState} from '../../types/data';
import {ElementId} from '../../util/dom';
import {DeepReadonly} from '../../util/types';
import {
  CardId,
  CardIdWithMetadata,
  CardMetadata,
  CardUniqueInfo,
  HistogramMode,
  LinkedTime,
  NonPinnedCardId,
  PinnedCardId,
  PluginType,
  TooltipSort,
  XAxisType,
} from '../internal_types';
import * as storeUtils from './metrics_store_internal_utils';
import {
  CardMetadataMap,
  MetricsSettings,
  MetricsState,
  METRICS_FEATURE_KEY,
  RunToSeries,
  TagMetadata,
} from './metrics_types';

const selectMetricsState = createFeatureSelector<State, MetricsState>(
  METRICS_FEATURE_KEY
);

export const getMetricsTagMetadataLoadState = createSelector(
  selectMetricsState,
  (state: MetricsState): LoadState => state.tagMetadataLoadState
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

// A cheap identity selector to skip recomputing selectors when `state` changes.
const selectVisibleCardMap = createSelector(
  selectMetricsState,
  (state): Map<ElementId, CardId> => {
    return state.visibleCardMap;
  }
);

export const getVisibleCardIdSet = createSelector(
  selectVisibleCardMap,
  (visibleCardMap): Set<CardId> => {
    return new Set<CardId>(visibleCardMap.values());
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

/**
 * Returns step values of an image card.
 */
export const getMetricsImageCardStepValues = createSelector(
  selectMetricsState,
  (state: MetricsState, cardId: CardId): number[] => {
    if (!state.cardMetadataMap.hasOwnProperty(cardId)) {
      return [];
    }
    return storeUtils.getImageCardStepValues(
      cardId,
      state.cardMetadataMap,
      state.timeSeriesData
    );
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

const selectSettings = createSelector(
  selectMetricsState,
  (state): MetricsSettings => {
    return {
      ...state.settings,
      ...state.settingOverrides,
    };
  }
);

/**
 * Settings.
 */
export const getMetricsSettingOverrides = createSelector(
  selectMetricsState,
  (state): Partial<MetricsSettings> => {
    return state.settingOverrides;
  }
);

export const getMetricsCardMinWidth = createSelector(
  selectSettings,
  (settings): number | null => settings.cardMinWidth
);

export const getMetricsTooltipSort = createSelector(
  selectSettings,
  (settings): TooltipSort => settings.tooltipSort
);

export const getMetricsIgnoreOutliers = createSelector(
  selectSettings,
  (settings): boolean => settings.ignoreOutliers
);

export const getMetricsXAxisType = createSelector(
  selectSettings,
  (settings): XAxisType => settings.xAxisType
);

export const getMetricsHistogramMode = createSelector(
  selectSettings,
  (settings): HistogramMode => settings.histogramMode
);

export const getMetricsScalarSmoothing = createSelector(
  selectSettings,
  (settings): number => settings.scalarSmoothing
);

export const getMetricsScalarPartitionNonMonotonicX = createSelector(
  selectSettings,
  (settings): boolean => settings.scalarPartitionNonMonotonicX
);

export const getMetricsImageBrightnessInMilli = createSelector(
  selectSettings,
  (settings): number => settings.imageBrightnessInMilli
);

export const getMetricsImageContrastInMilli = createSelector(
  selectSettings,
  (settings): number => settings.imageContrastInMilli
);

export const getMetricsImageShowActualSize = createSelector(
  selectSettings,
  (settings): boolean => settings.imageShowActualSize
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

export const getMetricsSelectTimeEnabled = createSelector(
  selectMetricsState,
  (state: MetricsState): boolean => {
    return state.selectTimeEnabled;
  }
);

export const getMetricsUseRangeSelectTime = createSelector(
  selectMetricsState,
  (state: MetricsState): boolean => {
    return state.useRangeSelectTime;
  }
);

export const getMetricsStepMinMax = createSelector(
  selectMetricsState,
  (state: MetricsState): {min: number; max: number} => {
    const {min, max} = state.stepMinMax;
    return {
      min: min === Infinity ? 0 : min,
      max: max === -Infinity ? 1000 : max,
    };
  }
);

/**
 * Returns value of the selected time set by user. When selected time is never
 * set, it returns the default value which is derived from the timeseries data
 * loaded thus far.
 *
 * This selector is intended to used by settings panel only. Other views should
 * use `getMetricsSelectedTime` that returns `LinkedTime` value according to
 * the setting.
 *
 * @see getMetricsSelectedTime For most views.
 */
export const getMetricsSelectedTimeSetting = createSelector(
  selectMetricsState,
  getMetricsStepMinMax,
  (state, stepMinMax): LinkedTime => {
    if (!state.selectedTime) {
      return {
        start: {
          step: stepMinMax.min,
        },
        end: null,
      };
    }

    return state.selectedTime;
  }
);

/**
 * Returns selected time set by user. If selectTime is disabled, it returns
 * `null`. Also, when range selection mode is disabled, it returns `end=null`
 * even if it has value set.
 *
 * Virtually all views should use this selector.
 */
export const getMetricsSelectedTime = createSelector(
  selectMetricsState,
  getMetricsSelectedTimeSetting,
  (state: MetricsState, selectedTime: LinkedTime): LinkedTime | null => {
    if (!state.selectTimeEnabled) return null;
    if (state.useRangeSelectTime) {
      return selectedTime;
    }
    return {...selectedTime, end: null};
  }
);

export const getMetricsFilteredPluginTypes = createSelector(
  selectMetricsState,
  (state: MetricsState): Set<PluginType> => {
    return state.filteredPluginTypes;
  }
);

export const getPromoteTimeSeries = createSelector(
  selectMetricsState,
  (state: MetricsState): boolean => {
    return state.promoteTimeSeries;
  }
);

export const isMetricsSettingsPaneOpen = createSelector(
  selectMetricsState,
  (state): boolean => state.isSettingsPaneOpen
);
