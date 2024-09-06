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
import {areSameRouteKindAndExperiments} from '../../app_routing';
import {stateRehydratedFromUrl} from '../../app_routing/actions';
import {createNamespaceContextedState} from '../../app_routing/namespaced_state_reducer_helper';
import {RouteKind} from '../../app_routing/types';
import * as coreActions from '../../core/actions';
import {persistentSettingsLoaded} from '../../persistent_settings';
import {DataLoadState} from '../../types/data';
import {ElementId} from '../../util/dom';
import {mapObjectValues} from '../../util/lang';
import {composeReducers} from '../../util/ngrx';
import {TimeSelectionToggleAffordance} from '../../widgets/card_fob/card_fob_types';
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
  CardMetadata,
  CardUniqueInfo,
  SCALARS_SMOOTHING_MAX,
  SCALARS_SMOOTHING_MIN,
  TooltipSort,
  URLDeserializedState,
} from '../types';
import {groupCardIdWithMetdata} from '../utils';
import {ColumnHeaderType, DataTableMode} from '../../widgets/data_table/types';
import {
  buildOrReturnStateWithPinnedCopy,
  buildOrReturnStateWithUnresolvedImportedPins,
  canCreateNewPins,
  cardRangeSelectionEnabled,
  createPluginDataWithLoadable,
  createRunToLoadState,
  generateNextCardStepIndex,
  generateNextCardStepIndexFromLinkedTimeSelection,
  generateNextPinnedCardMappings,
  generateScalarCardMinMaxStep,
  getCardId,
  getRunIds,
  getTimeSeriesLoadable,
} from './metrics_store_internal_utils';
import {
  CardFeatureOverride,
  CardMetadataMap,
  CardStateMap,
  CardStepIndexMap,
  MetricsNamespacedState,
  MetricsNonNamespacedState,
  MetricsSettings,
  MetricsState,
  METRICS_SETTINGS_DEFAULT,
  NonSampledPluginTagMetadata,
  RunToSeries,
  TagMetadata,
  TimeSeriesData,
  TimeSeriesLoadable,
  CardToPinnedCard,
  PinnedCardToCard,
} from './metrics_types';
import {dataTableUtils} from '../../widgets/data_table/utils';

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
              results.push({
                plugin,
                tag,
                runId,
                sample: i,
                numSample: maxSamplesPerStep,
              });
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
      continue;
    }
    const stepIndex = cardStepIndex.hasOwnProperty(cardId)
      ? cardStepIndex[cardId]!.index
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
      result[cardId] = {index: maxStepIndex, isClosest: false};
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
 * Returns an identifier useful for comparing a card in storage with a real card
 * with loaded metadata.
 */
function serializeCardUniqueInfo(
  plugin: string,
  tag: string,
  runId?: string | null,
  sample?: number
): string {
  return JSON.stringify([plugin, tag, runId || '', sample]);
}

const {initialState, reducers: namespaceContextedReducer} =
  createNamespaceContextedState<
    MetricsNamespacedState,
    MetricsNonNamespacedState
  >(
    {
      // Backend data.
      tagMetadataLoadState: {
        state: DataLoadState.NOT_LOADED,
        lastLoadedTimeInMs: null,
      },
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
      cardToPinnedCopyCache: new Map(),
      pinnedCardToOriginal: new Map(),
      unresolvedImportedPinnedCards: [],
      cardMetadataMap: {},
      cardStateMap: {},
      cardStepIndex: {},
      tagFilter: '',
      tagGroupExpanded: new Map<string, boolean>(),
      linkedTimeSelection: null,
      linkedTimeEnabled: false,
      stepSelectorEnabled: true,
      rangeSelectionEnabled: false,
      singleSelectionHeaders: [
        {
          type: ColumnHeaderType.RUN,
          name: 'run',
          displayName: 'Run',
          enabled: true,
          removable: false,
          sortable: true,
          movable: false,
        },
        {
          type: ColumnHeaderType.SMOOTHED,
          name: 'smoothed',
          displayName: 'Smoothed',
          enabled: true,
          removable: true,
          sortable: true,
          movable: true,
        },
        {
          type: ColumnHeaderType.VALUE,
          name: 'value',
          displayName: 'Value',
          enabled: true,
          removable: true,
          sortable: true,
          movable: true,
        },
        {
          type: ColumnHeaderType.STEP,
          name: 'step',
          displayName: 'Step',
          enabled: true,
          removable: true,
          sortable: true,
          movable: true,
        },
        {
          type: ColumnHeaderType.RELATIVE_TIME,
          name: 'relative',
          displayName: 'Relative',
          enabled: true,
          removable: true,
          sortable: true,
          movable: true,
        },
      ],
      rangeSelectionHeaders: [
        {
          type: ColumnHeaderType.RUN,
          name: 'run',
          displayName: 'Run',
          enabled: true,
          removable: false,
          sortable: true,
          movable: true,
        },
        {
          type: ColumnHeaderType.MIN_VALUE,
          name: 'min',
          displayName: 'Min',
          enabled: true,
          removable: true,
          sortable: true,
          movable: true,
        },
        {
          type: ColumnHeaderType.MAX_VALUE,
          name: 'max',
          displayName: 'Max',
          enabled: true,
          removable: true,
          sortable: true,
          movable: true,
        },
        {
          type: ColumnHeaderType.START_VALUE,
          name: 'start',
          displayName: 'Start Value',
          enabled: true,
          removable: true,
          sortable: true,
          movable: true,
        },
        {
          type: ColumnHeaderType.END_VALUE,
          name: 'end',
          displayName: 'End Value',
          enabled: true,
          removable: true,
          sortable: true,
          movable: true,
        },
        {
          type: ColumnHeaderType.VALUE_CHANGE,
          name: 'valueChange',
          displayName: 'Value',
          enabled: true,
          removable: true,
          sortable: true,
          movable: true,
        },
        {
          type: ColumnHeaderType.PERCENTAGE_CHANGE,
          name: 'percentageChange',
          displayName: '%',
          enabled: true,
          removable: true,
          sortable: true,
          movable: true,
        },
        {
          type: ColumnHeaderType.START_STEP,
          name: 'startStep',
          displayName: 'Start Step',
          enabled: true,
          removable: true,
          sortable: true,
          movable: true,
        },
        {
          type: ColumnHeaderType.END_STEP,
          name: 'endStep',
          displayName: 'End Step',
          enabled: true,
          removable: true,
          sortable: true,
          movable: true,
        },
        {
          type: ColumnHeaderType.STEP_AT_MAX,
          name: 'stepAtMax',
          displayName: 'Step At Max',
          enabled: false,
          removable: true,
          sortable: true,
          movable: true,
        },
        {
          type: ColumnHeaderType.STEP_AT_MIN,
          name: 'stepAtMin',
          displayName: 'Step At Min',
          enabled: false,
          removable: true,
          sortable: true,
          movable: true,
        },
        {
          type: ColumnHeaderType.MEAN,
          name: 'mean',
          displayName: 'Mean',
          enabled: false,
          removable: true,
          sortable: true,
          movable: true,
        },
        {
          type: ColumnHeaderType.RAW_CHANGE,
          name: 'rawChange',
          displayName: 'Raw',
          enabled: false,
          removable: true,
          sortable: true,
          movable: true,
        },
      ],
      filteredPluginTypes: new Set(),
      stepMinMax: {
        min: Infinity,
        max: -Infinity,
      },
    },
    {
      isSettingsPaneOpen: true,
      isSlideoutMenuOpen: false,
      lastPinnedCardTime: 0,
      tableEditorSelectedTab: DataTableMode.SINGLE,
      timeSeriesData: {
        scalars: {},
        histograms: {},
        images: {},
      },
      settings: METRICS_SETTINGS_DEFAULT,
      settingOverrides: {},
      visibleCardMap: new Map<ElementId, CardId>(),
      previousCardInteractions: {
        tagFilters: [],
        pins: [],
        clicks: [],
      },
      newCardInteractions: {
        tagFilters: [],
        pins: [],
        clicks: [],
      },
    },

    /** onNavigated */
    (state, oldRoute, newRoute) => {
      if (!areSameRouteKindAndExperiments(oldRoute, newRoute)) {
        return {
          ...state,
          // When the route changes we want to trigger tag metadata reload and
          // clear some of the metadata that is derived from that request:
          // tagMetadata, cardList, cardMetadataMap. These are the key inputs
          // for deciding which cards to render and which runs to render on
          // those cards (See b/225162725).
          tagMetadataLoadState: {
            state: DataLoadState.NOT_LOADED,
            lastLoadedTimeInMs: null,
          },
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
          cardList: [],
          cardMetadataMap: {},
          // Reset visible cards in case we resume a route that was left dirty.
          // Since visibility tracking is async, the state may not have received
          // 'exited card' updates when it was cached by the router.
          visibleCardMap: new Map<ElementId, CardId>(),
        };
      }

      return state;
    }
  );

export const INITIAL_STATE = initialState;

const reducer = createReducer(
  initialState,
  on(stateRehydratedFromUrl, (state, {routeKind, partialState}) => {
    if (
      routeKind !== RouteKind.EXPERIMENT &&
      routeKind !== RouteKind.COMPARE_EXPERIMENT
    ) {
      return state;
    }
    // The URL contains pinned cards + unresolved imported pins. Keep these sets
    // mutually exclusive, and do not add duplicate any unresolved imported
    // cards.
    const serializedCardUniqueInfos = new Set();

    // Visit existing pins.
    for (const pinnedCardId of state.pinnedCardToOriginal.keys()) {
      const {plugin, tag, runId, sample} = state.cardMetadataMap[pinnedCardId];
      serializedCardUniqueInfos.add(
        serializeCardUniqueInfo(plugin, tag, runId, sample)
      );
    }

    // We need to include previous unresolved imported pins, because the new
    // hydrated state might not include them. For example, navigating from
    // experiment A (with pins) --> B --> A, we want to ensure that rehydration
    // does not drop the old unresolved pins on A.
    const hydratedState = partialState as URLDeserializedState;
    const unresolvedImportedPinnedCards = [] as CardUniqueInfo[];
    for (const card of [
      ...state.unresolvedImportedPinnedCards,
      ...hydratedState.metrics.pinnedCards,
    ]) {
      const cardUniqueInfoString = serializeCardUniqueInfo(
        card.plugin,
        card.tag,
        card.runId,
        card.sample
      );
      if (!serializedCardUniqueInfos.has(cardUniqueInfoString)) {
        serializedCardUniqueInfos.add(cardUniqueInfoString);
        unresolvedImportedPinnedCards.push(card);
      }
    }

    const resolvedResult = buildOrReturnStateWithUnresolvedImportedPins(
      unresolvedImportedPinnedCards,
      state.cardList,
      state.cardMetadataMap,
      state.cardToPinnedCopy,
      state.cardToPinnedCopyCache,
      state.pinnedCardToOriginal,
      state.cardStepIndex,
      state.cardStateMap
    );

    const hydratedSmoothing = hydratedState.metrics.smoothing;
    let newSettings = state.settingOverrides;

    if (Number.isFinite(hydratedSmoothing) && hydratedSmoothing !== null) {
      const newSmoothing = Math.max(
        SCALARS_SMOOTHING_MIN,
        Math.min(
          SCALARS_SMOOTHING_MAX,
          Number(hydratedSmoothing.toPrecision(3))
        )
      );
      newSettings = {
        ...state.settingOverrides,
        scalarSmoothing: newSmoothing,
      };
    }

    const newState = {
      ...state,
      ...resolvedResult,
      settingOverrides: newSettings,
    };

    if (hydratedState.metrics.tagFilter !== null) {
      newState.tagFilter = hydratedState.metrics.tagFilter;
    }
    return newState;
  }),
  on(persistentSettingsLoaded, (state, {partialSettings}) => {
    const metricsSettings: Partial<MetricsSettings> = {};
    if (
      partialSettings.tooltipSort &&
      Object.values(TooltipSort).includes(partialSettings.tooltipSort)
    ) {
      metricsSettings.tooltipSort = partialSettings.tooltipSort;
    }
    if (typeof partialSettings.timeSeriesCardMinWidth === 'number') {
      metricsSettings.cardMinWidth = partialSettings.timeSeriesCardMinWidth;
    }
    if (typeof partialSettings.ignoreOutliers === 'boolean') {
      metricsSettings.ignoreOutliers = partialSettings.ignoreOutliers;
    }
    if (typeof partialSettings.scalarSmoothing === 'number') {
      metricsSettings.scalarSmoothing = partialSettings.scalarSmoothing;
    }
    if (typeof partialSettings.savingPinsEnabled === 'boolean') {
      metricsSettings.savingPinsEnabled = partialSettings.savingPinsEnabled;
    }

    const isSettingsPaneOpen =
      partialSettings.timeSeriesSettingsPaneOpened ?? state.isSettingsPaneOpen;
    const stepSelectorEnabled =
      partialSettings.stepSelectorEnabled ?? state.stepSelectorEnabled;
    const rangeSelectionEnabled =
      partialSettings.rangeSelectionEnabled ?? state.rangeSelectionEnabled;
    const linkedTimeEnabled =
      partialSettings.linkedTimeEnabled ?? state.linkedTimeEnabled;
    const singleSelectionHeaders =
      partialSettings.singleSelectionHeaders ?? state.singleSelectionHeaders;
    const rangeSelectionHeaders =
      partialSettings.rangeSelectionHeaders ?? state.rangeSelectionHeaders;

    return {
      ...state,
      isSettingsPaneOpen,
      stepSelectorEnabled,
      rangeSelectionEnabled,
      linkedTimeEnabled,
      singleSelectionHeaders,
      rangeSelectionHeaders,
      settings: {
        ...state.settings,
        ...metricsSettings,
      },
    };
  }),
  on(coreActions.reload, coreActions.manualReload, (state) => {
    const nextTagMetadataLoaded =
      state.tagMetadataLoadState.state === DataLoadState.LOADING
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
      tagMetadataLoadState: {
        ...state.tagMetadataLoadState,
        state: nextTagMetadataLoaded,
      },
      timeSeriesData: nextTimeSeriesData,
    };
  }),
  on(
    actions.metricsTagMetadataRequested,
    (state: MetricsState): MetricsState => {
      return {
        ...state,
        tagMetadataLoadState: {
          ...state.tagMetadataLoadState,
          state: DataLoadState.LOADING,
        },
      };
    }
  ),
  on(actions.metricsTagMetadataFailed, (state: MetricsState): MetricsState => {
    return {
      ...state,
      tagMetadataLoadState: {
        ...state.tagMetadataLoadState,
        state: DataLoadState.FAILED,
      },
    };
  }),
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

      const newCardMetadataMap = {} as CardMetadataMap;
      const nextCardMetadataList = buildCardMetadataList(nextTagMetadata);
      const nextCardList: string[] = [];

      // Create new cards for unseen metadata.
      for (const cardMetadata of nextCardMetadataList) {
        const cardId = getCardId(cardMetadata);
        newCardMetadataMap[cardId] = cardMetadata;
        nextCardList.push(cardId);
      }

      let tagGroupExpanded = state.tagGroupExpanded;
      if (state.tagGroupExpanded.size === 0) {
        const cardListWithMetadata = nextCardList
          .map((cardId) => {
            return {...newCardMetadataMap[cardId], cardId};
          })
          .filter(Boolean);
        const cardGroups = groupCardIdWithMetdata(cardListWithMetadata);

        tagGroupExpanded = new Map(state.tagGroupExpanded);
        for (const group of cardGroups.slice(0, 2)) {
          tagGroupExpanded.set(group.groupName, true);
        }
      }

      // Generates next pinned/original card id mapping because they are namespaced
      // state and remain unchanged under the same namespace.
      const {
        nextCardToPinnedCopy,
        nextPinnedCardToOriginal,
        pinnedCardMetadataMap,
      } = generateNextPinnedCardMappings(
        state.cardToPinnedCopyCache,
        newCardMetadataMap,
        nextCardList
      );
      const nextCardMetadataMap = {
        ...newCardMetadataMap,
        ...pinnedCardMetadataMap,
      };

      const nextCardStepIndex = generateNextCardStepIndex(
        state.cardStepIndex,
        nextCardMetadataMap
      );

      const resolvedResult = buildOrReturnStateWithUnresolvedImportedPins(
        state.unresolvedImportedPinnedCards,
        nextCardList,
        nextCardMetadataMap,
        nextCardToPinnedCopy,
        state.cardToPinnedCopyCache,
        nextPinnedCardToOriginal,
        nextCardStepIndex,
        state.cardStateMap
      );

      return {
        ...state,
        ...resolvedResult,
        tagGroupExpanded,
        tagMetadataLoadState: {
          state: DataLoadState.LOADED,
          lastLoadedTimeInMs: Date.now(),
        },
        tagMetadata: nextTagMetadata,
        cardList: nextCardList,
      };
    }
  ),
  on(actions.metricsCardStateUpdated, (state, {cardId, settings}) => {
    const nextcardStateMap = {...state.cardStateMap};
    nextcardStateMap[cardId] = {
      ...nextcardStateMap[cardId],
      ...settings,
    };

    return {
      ...state,
      cardStateMap: nextcardStateMap,
    };
  }),
  on(actions.metricsCardFullSizeToggled, (state, {cardId}) => {
    const nextcardStateMap = {...state.cardStateMap};
    nextcardStateMap[cardId] = {
      ...nextcardStateMap[cardId],
      fullWidth: !nextcardStateMap[cardId]?.fullWidth,
      tableExpanded: !nextcardStateMap[cardId]?.fullWidth,
    };

    return {
      ...state,
      cardStateMap: nextcardStateMap,
    };
  }),
  on(actions.metricsTagFilterChanged, (state, {tagFilter}) => {
    return {
      ...state,
      tagFilter,
    };
  }),
  on(actions.metricsChangeTooltipSort, (state, {sort}) => {
    return {
      ...state,
      settingOverrides: {
        ...state.settingOverrides,
        tooltipSort: sort,
      },
    };
  }),
  on(actions.metricsToggleIgnoreOutliers, (state) => {
    const nextIgnoreOutliers = !(
      state.settingOverrides.ignoreOutliers ?? state.settings.ignoreOutliers
    );
    return {
      ...state,
      settingOverrides: {
        ...state.settingOverrides,
        ignoreOutliers: nextIgnoreOutliers,
      },
    };
  }),
  on(actions.metricsChangeXAxisType, (state, {xAxisType}) => {
    return {
      ...state,
      settingOverrides: {
        ...state.settingOverrides,
        xAxisType,
      },
    };
  }),
  on(actions.metricsChangeScalarSmoothing, (state, {smoothing}) => {
    return {
      ...state,
      settingOverrides: {
        ...state.settingOverrides,
        scalarSmoothing: smoothing,
      },
    };
  }),
  on(actions.metricsScalarPartitionNonMonotonicXToggled, (state) => {
    const nextScalarPartitionNonMonotonicX = !(
      state.settingOverrides.scalarPartitionNonMonotonicX ??
      state.settings.scalarPartitionNonMonotonicX
    );
    return {
      ...state,
      settingOverrides: {
        ...state.settingOverrides,
        scalarPartitionNonMonotonicX: nextScalarPartitionNonMonotonicX,
      },
    };
  }),
  on(actions.metricsChangeImageBrightness, (state, {brightnessInMilli}) => {
    return {
      ...state,
      settingOverrides: {
        ...state.settingOverrides,
        imageBrightnessInMilli: brightnessInMilli,
      },
    };
  }),
  on(actions.metricsChangeImageContrast, (state, {contrastInMilli}) => {
    return {
      ...state,
      settingOverrides: {
        ...state.settingOverrides,
        imageContrastInMilli: contrastInMilli,
      },
    };
  }),
  on(actions.metricsResetImageBrightness, (state) => {
    const {imageBrightnessInMilli, ...nextOverride} = state.settingOverrides;
    return {
      ...state,
      settingOverrides: nextOverride,
    };
  }),
  on(actions.metricsResetImageContrast, (state) => {
    const {imageContrastInMilli, ...nextOverride} = state.settingOverrides;
    return {
      ...state,
      settingOverrides: nextOverride,
    };
  }),
  on(actions.metricsToggleImageShowActualSize, (state) => {
    const nextImageShowActualSize = !(
      state.settingOverrides.imageShowActualSize ??
      state.settings.imageShowActualSize
    );
    return {
      ...state,
      settingOverrides: {
        ...state.settingOverrides,
        imageShowActualSize: nextImageShowActualSize,
      },
    };
  }),
  on(actions.metricsChangeHistogramMode, (state, {histogramMode}) => {
    return {
      ...state,
      settingOverrides: {
        ...state.settingOverrides,
        histogramMode,
      },
    };
  }),
  on(actions.metricsChangeCardWidth, (state, {cardMinWidth}) => {
    return {
      ...state,
      settingOverrides: {
        ...state.settingOverrides,
        cardMinWidth,
      },
    };
  }),
  on(actions.metricsResetCardWidth, (state) => {
    return {
      ...state,
      settingOverrides: {
        ...state.settingOverrides,
        cardMinWidth: null,
      },
    };
  }),
  on(actions.metricsHideEmptyCardsToggled, (state) => {
    return {
      ...state,
      settingOverrides: {
        ...state.settingOverrides,
        hideEmptyCards: !state.settingOverrides.hideEmptyCards,
      },
    };
  }),
  on(actions.metricsEnableSavingPinsToggled, (state) => {
    const nextSavingPinsEnabled = !(
      state.settingOverrides.savingPinsEnabled ??
      state.settings.savingPinsEnabled
    );
    return {
      ...state,
      settingOverrides: {
        ...state.settingOverrides,
        savingPinsEnabled: nextSavingPinsEnabled,
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
      const nextStepMinMax = {...state.stepMinMax};
      const nextCardStateMap = {...state.cardStateMap};
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

            for (const step of runToSeries[runId]) {
              nextStepMinMax.min = Math.min(nextStepMinMax.min, step.step);
              nextStepMinMax.max = Math.max(nextStepMinMax.max, step.step);
            }
          }
        }
      }

      if (response.runToSeries && response.plugin === PluginType.SCALARS) {
        const cardId = getCardId({plugin, tag, runId: null});
        const nextMinMax = generateScalarCardMinMaxStep(
          loadable.runToSeries as RunToSeries<PluginType.SCALARS>
        );
        nextCardStateMap[cardId] = {
          ...nextCardStateMap[cardId],
          dataMinMax: nextMinMax,
        };
        const pinnedId = state.cardToPinnedCopy.get(cardId);
        if (pinnedId) {
          nextCardStateMap[pinnedId] = {
            ...nextCardStateMap[pinnedId],
            dataMinMax: nextMinMax,
          };
        }
      }

      const nextState: MetricsState = {
        ...state,
        timeSeriesData: nextTimeSeriesData,
        cardStepIndex: buildNormalizedCardStepIndexMap(
          state.cardMetadataMap,
          state.cardStepIndex,
          nextTimeSeriesData,
          state.timeSeriesData
        ),
        stepMinMax: nextStepMinMax,
        cardStateMap: nextCardStateMap,
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
      cardStepIndex: {
        ...state.cardStepIndex,
        [cardId]: {index: nextStepIndex, isClosest: false},
      },
    };
  }),
  on(actions.metricsTagGroupExpansionChanged, (state, {tagGroup}) => {
    const tagGroupExpanded = new Map(state.tagGroupExpanded);
    tagGroupExpanded.set(tagGroup, !tagGroupExpanded.get(tagGroup));

    return {...state, tagGroupExpanded};
  }),
  on(actions.cardVisibilityChanged, (state, {enteredCards, exitedCards}) => {
    if (!enteredCards.length && !exitedCards.length) {
      return state;
    }

    const visibleCardMap = new Map(state.visibleCardMap);
    enteredCards.forEach(({elementId, cardId}) => {
      const existingCardId = visibleCardMap.get(elementId) ?? null;
      if (existingCardId !== null && existingCardId !== cardId) {
        throw new Error(
          `A DOM element cannot be reused for more than 1 unique card metadata`
        );
      }
      visibleCardMap.set(elementId, cardId);
    });
    exitedCards.forEach(({elementId}) => {
      visibleCardMap.delete(elementId);
    });
    return {...state, visibleCardMap};
  }),
  on(actions.cardPinStateToggled, (state, {cardId}) => {
    const isPinnedCopy = state.pinnedCardToOriginal.has(cardId);
    const shouldPin = isPinnedCopy
      ? false
      : !state.cardToPinnedCopy.has(cardId);

    if (shouldPin && !canCreateNewPins(state)) {
      return state;
    }

    let nextCardToPinnedCopy = new Map(state.cardToPinnedCopy);
    let nextCardToPinnedCopyCache = new Map(state.cardToPinnedCopyCache);
    let nextPinnedCardToOriginal = new Map(state.pinnedCardToOriginal);
    let nextCardMetadataMap = {...state.cardMetadataMap};
    let nextCardStepIndexMap = {...state.cardStepIndex};
    let nextCardStateMap = {...state.cardStateMap};
    let nextLastPinnedCardTime = state.lastPinnedCardTime;

    if (isPinnedCopy) {
      const originalCardId = state.pinnedCardToOriginal.get(cardId);
      nextCardToPinnedCopy.delete(originalCardId!);
      nextCardToPinnedCopyCache.delete(originalCardId!);
      nextPinnedCardToOriginal.delete(cardId);
      delete nextCardMetadataMap[cardId];
      delete nextCardStepIndexMap[cardId];
      delete nextCardStateMap[cardId];
    } else {
      if (shouldPin) {
        const resolvedResult = buildOrReturnStateWithPinnedCopy(
          cardId,
          nextCardToPinnedCopy,
          nextCardToPinnedCopyCache,
          nextPinnedCardToOriginal,
          nextCardStepIndexMap,
          nextCardMetadataMap,
          nextCardStateMap
        );
        nextCardToPinnedCopy = resolvedResult.cardToPinnedCopy;
        nextCardToPinnedCopyCache = resolvedResult.cardToPinnedCopyCache;
        nextPinnedCardToOriginal = resolvedResult.pinnedCardToOriginal;
        nextCardMetadataMap = resolvedResult.cardMetadataMap;
        nextCardStepIndexMap = resolvedResult.cardStepIndex;
        nextCardStateMap = resolvedResult.cardStateMap;
        nextLastPinnedCardTime = Date.now();
      } else {
        const pinnedCardId = state.cardToPinnedCopy.get(cardId)!;
        nextCardToPinnedCopy.delete(cardId);
        nextCardToPinnedCopyCache.delete(cardId);
        nextPinnedCardToOriginal.delete(pinnedCardId);
        delete nextCardMetadataMap[pinnedCardId];
        delete nextCardStepIndexMap[pinnedCardId];
        delete nextCardStateMap[cardId];
      }
    }
    return {
      ...state,
      cardMetadataMap: nextCardMetadataMap,
      cardStateMap: nextCardStateMap,
      cardStepIndex: nextCardStepIndexMap,
      cardToPinnedCopy: nextCardToPinnedCopy,
      cardToPinnedCopyCache: nextCardToPinnedCopyCache,
      pinnedCardToOriginal: nextPinnedCardToOriginal,
      lastPinnedCardTime: nextLastPinnedCardTime,
    };
  }),
  on(actions.linkedTimeToggled, (state) => {
    const nextLinkedTimeEnabled = !state.linkedTimeEnabled;
    let nextCardStepIndexMap = {...state.cardStepIndex};
    let nextLinkedTimeSelection = state.linkedTimeSelection;
    let nextStepSelectorEnabled = state.stepSelectorEnabled;
    let nextRangeSelectionEnabled = state.rangeSelectionEnabled;

    // Updates cardStepIndex only when toggle to enable linked time.
    if (nextLinkedTimeEnabled) {
      const {max} = state.stepMinMax;
      const startStep = max === -Infinity ? 0 : max;
      nextLinkedTimeSelection = state.linkedTimeSelection ?? {
        start: {step: startStep},
        end: null,
      };

      nextCardStepIndexMap = generateNextCardStepIndexFromLinkedTimeSelection(
        state.cardStepIndex,
        state.cardMetadataMap,
        state.timeSeriesData,
        nextLinkedTimeSelection
      );

      nextStepSelectorEnabled = nextLinkedTimeEnabled;
      nextRangeSelectionEnabled = Boolean(nextLinkedTimeSelection.end);
    }

    return {
      ...state,
      cardStepIndex: nextCardStepIndexMap,
      linkedTimeEnabled: nextLinkedTimeEnabled,
      linkedTimeSelection: nextLinkedTimeSelection,
      stepSelectorEnabled: nextStepSelectorEnabled,
      rangeSelectionEnabled: nextRangeSelectionEnabled,
    };
  }),
  on(actions.rangeSelectionToggled, (state) => {
    const nextRangeSelectionEnabled = !state.rangeSelectionEnabled;
    let nextStepSelectorEnabled = state.stepSelectorEnabled;
    let linkedTimeSelection = state.linkedTimeSelection;

    const nextCardStateMap = Object.entries(state.cardStateMap).reduce(
      (cardStateMap, [cardId, cardState]) => {
        // Range selection is tiered, it can be turned on/off globally and
        // then overridden for an individual card.
        //
        // Since range selection was last toggled on/off, some cards were
        // individually turned off/on respectively. Those cards differed
        // from the "global" step selection enablement state. Now that
        // range selection is being turned back on or off, all cards once
        // again have the "global" state.
        cardStateMap[cardId] = {
          ...cardState,
          stepSelectionOverride: CardFeatureOverride.NONE,
          rangeSelectionOverride: CardFeatureOverride.NONE,
        };
        return cardStateMap;
      },
      {} as CardStateMap
    );

    if (nextRangeSelectionEnabled) {
      nextStepSelectorEnabled = nextRangeSelectionEnabled;
      if (!linkedTimeSelection) {
        linkedTimeSelection = {
          start: {step: state.stepMinMax.min},
          end: {step: state.stepMinMax.max},
        };
      }
      if (!linkedTimeSelection.end) {
        // Enabling range selection from single selection selects the first
        // step as the start of the range. The previous start step from single
        // selection is now the end step.
        linkedTimeSelection = {
          start: {step: state.stepMinMax.min},
          end: linkedTimeSelection.start,
        };
      }
    } else {
      if (linkedTimeSelection) {
        // Disabling range selection keeps the largest step from the range.
        linkedTimeSelection = {
          start: linkedTimeSelection.end ?? linkedTimeSelection.start,
          end: null,
        };
      }
    }
    return {
      ...state,
      stepSelectorEnabled: nextStepSelectorEnabled,
      rangeSelectionEnabled: nextRangeSelectionEnabled,
      linkedTimeSelection,
      cardStateMap: nextCardStateMap,
    };
  }),
  on(actions.timeSelectionChanged, (state, change) => {
    const {cardId, timeSelection} = change;
    const nextStartStep = timeSelection.start.step;
    const nextEndStep = timeSelection.end?.step;
    const end =
      nextEndStep === undefined
        ? null
        : {step: nextStartStep > nextEndStep ? nextStartStep : nextEndStep};

    let nextRangeSelectionEnabled = state.rangeSelectionEnabled;
    if (state.linkedTimeEnabled) {
      // If there is no endStep then current selection state is single.
      // Otherwise selection state is range.
      nextRangeSelectionEnabled = nextEndStep !== undefined;
    }

    const nextTimeSelection = {
      start: {
        step: nextStartStep,
      },
      end,
    };
    const nextCardStepIndexMap =
      generateNextCardStepIndexFromLinkedTimeSelection(
        state.cardStepIndex,
        state.cardMetadataMap,
        state.timeSeriesData,
        nextTimeSelection
      );
    const nextCardStateMap = {...state.cardStateMap};
    if (cardId) {
      nextCardStateMap[cardId] = {
        ...nextCardStateMap[cardId],
        timeSelection: nextTimeSelection,
        stepSelectionOverride: CardFeatureOverride.OVERRIDE_AS_ENABLED,
        rangeSelectionOverride:
          nextTimeSelection.end?.step === undefined
            ? CardFeatureOverride.OVERRIDE_AS_DISABLED
            : CardFeatureOverride.OVERRIDE_AS_ENABLED,
      };
    }

    return {
      ...state,
      linkedTimeSelection: nextTimeSelection,
      cardStepIndex: nextCardStepIndexMap,
      cardStateMap: nextCardStateMap,
      rangeSelectionEnabled: nextRangeSelectionEnabled,
    };
  }),
  on(actions.cardViewBoxChanged, (state, {cardId, userViewBox}) => {
    const nextCardStateMap = {...state.cardStateMap};
    nextCardStateMap[cardId] = {
      ...nextCardStateMap[cardId],
      userViewBox,
    };

    return {
      ...state,
      cardStateMap: nextCardStateMap,
    };
  }),
  on(actions.stepSelectorToggled, (state, {affordance, cardId}) => {
    const nextCardStateMap = {...state.cardStateMap};
    if (cardId) {
      // cardId is only included when the event is generated from a scalar card
      // The only time that the scalar card dispatches a step selection toggled
      // event is when the last fob is being removed, therefore this should
      // always result in stepSelection being disabled.
      const {timeSelection, ...cardState} = nextCardStateMap[cardId] || {};
      nextCardStateMap[cardId] = {
        ...cardState,
        stepSelectionOverride: CardFeatureOverride.OVERRIDE_AS_DISABLED,
      };
    } else {
      // Step selection is tiered, it can be turned on/off global and then
      // overridden for an individual card.
      //
      // When no cardId is provided, the global status is being changed and
      // thus all cards should be made to adhere to the new state.
      Object.keys(nextCardStateMap).forEach((cardId) => {
        nextCardStateMap[cardId] = {
          ...nextCardStateMap[cardId],
          stepSelectionOverride: CardFeatureOverride.NONE,
        };
      });
    }

    if (
      !state.linkedTimeEnabled &&
      affordance !== TimeSelectionToggleAffordance.CHECK_BOX
    ) {
      // In plain step selection mode (without linked time), we do not allow
      // interactions with fobs to modify global step selection state.
      return {
        ...state,
        cardStateMap: nextCardStateMap,
      };
    }

    const nextStepSelectorEnabled = !state.stepSelectorEnabled;
    const nextLinkedTimeEnabled =
      nextStepSelectorEnabled && state.linkedTimeEnabled;
    const nextRangeSelectionEnabled =
      nextStepSelectorEnabled && state.rangeSelectionEnabled;

    return {
      ...state,
      linkedTimeEnabled: nextLinkedTimeEnabled,
      stepSelectorEnabled: nextStepSelectorEnabled,
      rangeSelectionEnabled: nextRangeSelectionEnabled,
      cardStateMap: nextCardStateMap,
    };
  }),
  on(actions.tableEditorTabChanged, (state, {tab}) => {
    return {
      ...state,
      tableEditorSelectedTab: tab,
    };
  }),
  on(
    actions.dataTableColumnOrderChanged,
    (state, {source, destination, side, dataTableMode}) => {
      let headers =
        dataTableMode === DataTableMode.RANGE
          ? [...state.rangeSelectionHeaders]
          : [...state.singleSelectionHeaders];
      headers = dataTableUtils.moveColumn(headers, source, destination, side);

      if (dataTableMode === DataTableMode.RANGE) {
        return {
          ...state,
          rangeSelectionHeaders: headers,
        };
      }
      return {
        ...state,
        singleSelectionHeaders: headers,
      };
    }
  ),
  on(
    actions.dataTableColumnToggled,
    (state, {dataTableMode, header: toggledHeader, cardId}) => {
      const {cardStateMap, rangeSelectionEnabled, linkedTimeEnabled} = state;
      const rangeEnabled = cardId
        ? cardRangeSelectionEnabled(
            cardStateMap,
            rangeSelectionEnabled,
            linkedTimeEnabled,
            cardId
          )
        : dataTableMode === DataTableMode.RANGE;
      const targetedHeaders = rangeEnabled
        ? state.rangeSelectionHeaders
        : state.singleSelectionHeaders;

      const newHeaders = targetedHeaders.map((header) => {
        const newHeader = {...header};
        if (header.name === toggledHeader.name) {
          newHeader.enabled = !newHeader.enabled;
        }
        return newHeader;
      });

      if (rangeEnabled) {
        return {
          ...state,
          rangeSelectionHeaders: newHeaders,
        };
      }
      return {
        ...state,
        singleSelectionHeaders: newHeaders,
      };
    }
  ),
  on(actions.metricsToggleVisiblePlugin, (state, {plugin}) => {
    let nextFilteredPluginTypes = new Set(state.filteredPluginTypes);
    if (nextFilteredPluginTypes.has(plugin)) {
      nextFilteredPluginTypes.delete(plugin);
    } else {
      nextFilteredPluginTypes.add(plugin);
    }
    if (
      Object.values(PluginType).every((pluginType) =>
        nextFilteredPluginTypes.has(pluginType)
      )
    ) {
      nextFilteredPluginTypes = new Set();
    }

    return {...state, filteredPluginTypes: nextFilteredPluginTypes};
  }),
  on(actions.metricsShowAllPlugins, (state): MetricsState => {
    return {...state, filteredPluginTypes: new Set()};
  }),
  on(actions.metricsSettingsPaneToggled, (state) => {
    return {...state, isSettingsPaneOpen: !state.isSettingsPaneOpen};
  }),
  on(actions.metricsSettingsPaneClosed, (state) => {
    return {...state, isSettingsPaneOpen: false};
  }),
  on(actions.metricsSlideoutMenuToggled, (state) => {
    return {...state, isSlideoutMenuOpen: !state.isSlideoutMenuOpen};
  }),
  on(actions.metricsSlideoutMenuOpened, (state, {mode}) => {
    // The reason the toggle action does not open the settings pane is because
    // the settings pane is the only place the menu can be toggled. The open
    // request can be made from the card when the settings menu is closed,
    // therefore we need to make sure the settings menu is opened, too.
    return {
      ...state,
      isSlideoutMenuOpen: true,
      isSettingsPaneOpen: true,
      tableEditorSelectedTab: mode,
    };
  }),
  on(actions.metricsSlideoutMenuClosed, (state) => {
    return {...state, isSlideoutMenuOpen: false};
  }),
  on(
    actions.metricsUnresolvedPinnedCardsFromLocalStorageAdded,
    (state, {cards}) => {
      return {
        ...state,
        unresolvedImportedPinnedCards: [
          ...state.unresolvedImportedPinnedCards,
          ...cards,
        ],
      };
    }
  ),
  on(actions.metricsClearAllPinnedCards, (state) => {
    const nextCardMetadataMap = {...state.cardMetadataMap};
    const nextCardStepIndex = {...state.cardStepIndex};
    const nextCardStateMap = {...state.cardStateMap};

    for (const cardId of state.pinnedCardToOriginal.keys()) {
      delete nextCardMetadataMap[cardId];
      delete nextCardStepIndex[cardId];
      delete nextCardStateMap[cardId];
    }

    return {
      ...state,
      cardMetadataMap: nextCardMetadataMap,
      cardStateMap: nextCardStateMap,
      cardStepIndex: nextCardStepIndex,
      cardToPinnedCopy: new Map() as CardToPinnedCard,
      cardToPinnedCopyCache: new Map() as CardToPinnedCard,
      pinnedCardToOriginal: new Map() as PinnedCardToCard,
    };
  })
);

export function reducers(state: MetricsState | undefined, action: Action) {
  return composeReducers(reducer, namespaceContextedReducer)(state, action);
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
