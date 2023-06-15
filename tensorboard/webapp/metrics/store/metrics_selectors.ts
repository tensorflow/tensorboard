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
import {DataLoadState, LoadState} from '../../types/data';
import {ElementId} from '../../util/dom';
import {DeepReadonly} from '../../util/types';
import {
  CardId,
  CardIdWithMetadata,
  CardMetadata,
  CardUniqueInfo,
  HistogramMode,
  NonPinnedCardId,
  PinnedCardId,
  PluginType,
  TimeSelection,
  TooltipSort,
  XAxisType,
} from '../types';
import {MinMaxStep} from '../views/card_renderer/scalar_card_types';
import {formatTimeSelection} from '../views/card_renderer/utils';
import * as storeUtils from './metrics_store_internal_utils';
import {
  cardRangeSelectionEnabled,
  getCardSelectionStateToBoolean,
  getMinMaxStepFromCardState,
} from './metrics_store_internal_utils';
import {
  CardMetadataMap,
  CardStateMap,
  CardStepIndexMetaData,
  MetricsSettings,
  MetricsState,
  METRICS_FEATURE_KEY,
  RunToSeries,
  TagMetadata,
  CardInteractions,
} from './metrics_types';
import {ColumnHeader, DataTableMode} from '../../widgets/data_table/types';
import {Extent} from '../../widgets/line_chart_v2/lib/public_types';
import {memoize} from '../../util/memoize';

const selectMetricsState =
  createFeatureSelector<MetricsState>(METRICS_FEATURE_KEY);

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

export const getCardMetadataMap = createSelector(
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

export const getCardStateMap = createSelector(
  selectMetricsState,
  (state: MetricsState): CardStateMap => {
    return state.cardStateMap;
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
 * The index metadata into the step values array for a card's UI. This may be greater
 * than the number of step values available, if time series data is not loaded.
 */
export const getCardStepIndexMetaData = createSelector(
  selectMetricsState,
  (state: MetricsState, cardId: CardId): CardStepIndexMetaData | null => {
    if (!state.cardStepIndex.hasOwnProperty(cardId)) {
      return null;
    }
    return state.cardStepIndex[cardId];
  }
);

/**
 * Returns step values of an image card.
 */
export const getMetricsImageCardSteps = createSelector(
  selectMetricsState,
  (state: MetricsState, cardId: CardId): number[] => {
    return storeUtils.getImageCardSteps(
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

export const getCardInteractions = createSelector(
  selectMetricsState,
  (state): CardInteractions => {
    return state.cardInteractions;
  }
);

export const getPreviousCardInteractions = createSelector(
  selectMetricsState,
  (state): CardInteractions => {
    return state.previousCardInteractions;
  }
);

const getSuggestedCardIds = createSelector(
  getPreviousCardInteractions,
  getCardToPinnedCopy,
  getCardMetadataMap,
  (cardInteractions, cardToPinnedCopy, cardMetadataMap): NonPinnedCardId[] => {
    const previousPins = cardInteractions.pins
      .map(({cardId}) => cardId)
      .filter((cardId) => cardMetadataMap[cardId])
      .reverse();

    const previousTagSearches = cardInteractions.tagFilters
      .map((tagFilter) => {
        return Object.entries(cardMetadataMap)
          .filter(([, metadata]) => {
            return metadata.tag.match(tagFilter);
          })
          .map(([cardId]) => cardId);
      })
      .flat()
      .filter(Boolean)
      .slice(-3)
      .reverse();

    const previouslyClickedCards = cardInteractions.clicks
      .map(({cardId}) => cardId)
      .filter((cardId) => cardMetadataMap[cardId])
      .slice(-3)
      .reverse();

    return Array.from(
      new Set([
        ...previousPins,
        ...previousTagSearches,
        ...previouslyClickedCards,
      ])
    )
      .filter((cardId) => !cardToPinnedCopy.get(cardId))
      .slice(0, 10);
  }
);

/**
 * Returns an ordered list of cards that a user may be interested in.
 */
export const getSuggestedCardsWithMetadata = createSelector(
  getSuggestedCardIds,
  getCardMetadataMap,
  (getSuggestedCardIds, metadataMap): DeepReadonly<CardIdWithMetadata[]> => {
    return getSuggestedCardIds
      .filter((cardId) => metadataMap.hasOwnProperty(cardId))
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

export const getMetricsHideEmptyCards = createSelector(
  selectSettings,
  (settings): boolean => settings.hideEmptyCards
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

export const getMetricsLinkedTimeEnabled = createSelector(
  selectMetricsState,
  (state: MetricsState): boolean => {
    return state.linkedTimeEnabled;
  }
);

export const getMetricsStepSelectorEnabled = createSelector(
  selectMetricsState,
  (state: MetricsState): boolean => {
    return state.stepSelectorEnabled;
  }
);

export const getMetricsRangeSelectionEnabled = createSelector(
  selectMetricsState,
  (state: MetricsState): boolean => {
    return state.rangeSelectionEnabled;
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
 * Returns value of the linked time set by user. When linked time selection is never
 * set, it returns the default value which is derived from the timeseries data
 * loaded thus far.
 *
 * This selector is intended to used by settings panel only. Other views should
 * use `getMetricsLinkedTimeSelection` that returns `TimeSelection` value according to
 * the setting.
 *
 * @see getMetricsLinkedTimeSelection For most views.
 */
export const getMetricsLinkedTimeSelectionSetting = createSelector(
  selectMetricsState,
  getMetricsStepMinMax,
  (state, stepMinMax): TimeSelection => {
    if (!state.linkedTimeSelection) {
      return {
        start: {
          step: stepMinMax.max,
        },
        end: null,
      };
    }

    return state.linkedTimeSelection;
  }
);

/**
 * Returns linked time selection set by user. If linkedTime is disabled, it returns
 * `null`. Also, when range selection mode is disabled, it returns `end=null`
 * even if it has value set.
 *
 * Virtually all views should use this selector.
 */
export const getMetricsLinkedTimeSelection = createSelector(
  selectMetricsState,
  getMetricsLinkedTimeSelectionSetting,
  (
    state: MetricsState,
    linkedTimeSelection: TimeSelection
  ): TimeSelection | null => {
    if (!state.linkedTimeEnabled) return null;
    return linkedTimeSelection;
  }
);

export const getMetricsFilteredPluginTypes = createSelector(
  selectMetricsState,
  (state: MetricsState): Set<PluginType> => {
    return state.filteredPluginTypes;
  }
);

export const isMetricsSettingsPaneOpen = createSelector(
  selectMetricsState,
  (state): boolean => state.isSettingsPaneOpen
);

export const isMetricsSlideoutMenuOpen = createSelector(
  selectMetricsState,
  (state): boolean => state.isSlideoutMenuOpen
);

export const getTableEditorSelectedTab = createSelector(
  selectMetricsState,
  (state): DataTableMode => state.tableEditorSelectedTab
);

export const getMetricsCardRangeSelectionEnabled = createSelector(
  getCardStateMap,
  getMetricsRangeSelectionEnabled,
  getMetricsLinkedTimeEnabled,
  (
    cardStateMap: CardStateMap,
    globalRangeSelectionEnabled: boolean,
    linkedTimeEnabled: boolean,
    cardId: CardId
  ) =>
    cardRangeSelectionEnabled(
      cardStateMap,
      globalRangeSelectionEnabled,
      linkedTimeEnabled,
      cardId
    )
);

/**
 * Gets the min and max step visible in a metrics card.
 * This value can either be the data min max or be overridden
 * by min max within userViewBox.
 *
 * Note: min max within userViewBox is not necessarily a subset of dataMinMax.
 */
export const getMetricsCardMinMax = createSelector(
  getCardStateMap,
  (cardStateMap: CardStateMap, cardId: CardId): MinMaxStep | undefined => {
    if (!cardStateMap[cardId]) return;
    return getMinMaxStepFromCardState(cardStateMap[cardId]);
  }
);

/**
 * Returns the min and max step found in the cards data.
 */
export const getMetricsCardDataMinMax = createSelector(
  getCardStateMap,
  (cardStateMap: CardStateMap, cardId: CardId): MinMaxStep | undefined => {
    return cardStateMap[cardId]?.dataMinMax;
  }
);

/**
 * Returns user defined view extent. Null means no zoom in, user box is the same as data extent.
 */
export const getMetricsCardUserViewBox = createSelector(
  getCardStateMap,
  (cardStateMap: CardStateMap, cardId: CardId): Extent | null => {
    return cardStateMap[cardId]?.userViewBox ?? null;
  }
);

/**
 * Gets the time selection of a metrics card.
 */
export const getMetricsCardTimeSelection = createSelector(
  getCardStateMap,
  getMetricsStepSelectorEnabled,
  getMetricsRangeSelectionEnabled,
  getMetricsLinkedTimeEnabled,
  getMetricsLinkedTimeSelection,
  (
    cardStateMap: CardStateMap,
    globalStepSelectionEnabled: boolean,
    globalRangeSelectionEnabled: boolean,
    linkedTimeEnabled: boolean,
    linkedTimeSelection: TimeSelection | null,
    cardId: CardId
  ): TimeSelection | undefined => {
    const cardState = cardStateMap[cardId];
    if (!cardState) {
      return;
    }
    const minMaxStep = getMinMaxStepFromCardState(cardState);
    if (!minMaxStep) {
      return;
    }

    // Handling Linked Time
    if (linkedTimeEnabled && linkedTimeSelection) {
      return formatTimeSelection(
        linkedTimeSelection,
        minMaxStep,
        // Note that globalRangeSelection should always be used with linked time.
        globalRangeSelectionEnabled
      );
    }

    // If the user has disabled step selection, nothing should be returned.
    if (
      !getCardSelectionStateToBoolean(
        cardState.stepSelectionOverride,
        globalStepSelectionEnabled
      )
    ) {
      return;
    }

    const rangeSelectionEnabled = getCardSelectionStateToBoolean(
      cardState.rangeSelectionOverride,
      globalRangeSelectionEnabled
    );

    let timeSelection = cardState.timeSelection;
    if (!timeSelection) {
      timeSelection = {
        start: {step: minMaxStep.minStep},
        end: {step: minMaxStep.maxStep},
      };
    }
    if (rangeSelectionEnabled) {
      if (!timeSelection.end) {
        // Enabling range selection from single selection selects the first
        // step as the start of the range. The previous start step from single
        // selection is now the end step.
        timeSelection = {
          start: {step: minMaxStep.minStep},
          end: timeSelection.start,
        };
      }
    } else {
      // Disabling range selection keeps the largest step from the range.
      timeSelection = {
        start: timeSelection.end ?? timeSelection.start,
        end: null,
      };
    }

    return formatTimeSelection(
      timeSelection,
      minMaxStep,
      rangeSelectionEnabled
    );
  }
);

export const getSingleSelectionHeaders = createSelector(
  selectMetricsState,
  (state: MetricsState): ColumnHeader[] => {
    return state.singleSelectionHeaders;
  }
);

export const getRangeSelectionHeaders = createSelector(
  selectMetricsState,
  (state: MetricsState): ColumnHeader[] => {
    return state.rangeSelectionHeaders;
  }
);

export const getColumnHeadersForCard = memoize((cardId: string) => {
  return createSelector(
    (state) => state,
    getSingleSelectionHeaders,
    getRangeSelectionHeaders,
    (state, singleSelectionHeaders, rangeSelectionHeaders) => {
      return getMetricsCardRangeSelectionEnabled(state, cardId)
        ? rangeSelectionHeaders
        : singleSelectionHeaders;
    }
  );
});
