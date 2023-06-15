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
import {NamespaceContextedState} from '../../app_routing/namespaced_state_reducer_helper';
import {DataLoadState, LoadState} from '../../types/data';
import {ElementId} from '../../util/dom';
import {
  HistogramStepDatum,
  ImageStepDatum,
  NonSampledPluginType,
  PluginType,
  SampledPluginType,
  ScalarStepDatum,
  TagToDescription,
  TagToRunSampledInfo,
} from '../data_source';
import {
  CardId,
  CardIdWithMetadata,
  CardMetadata,
  CardUniqueInfo,
  HistogramMode,
  MinMaxStep,
  NonPinnedCardId,
  PinnedCardId,
  TimeSelection,
  TooltipSort,
  XAxisType,
} from '../types';
import {ColumnHeader, DataTableMode} from '../../widgets/data_table/types';
import {Extent} from '../../widgets/line_chart_v2/lib/public_types';

export const METRICS_FEATURE_KEY = 'metrics';

type RunId = string;

type tagToRunIds = Record<string, RunId[]>;

export interface NonSampledPluginTagMetadata {
  tagDescriptions: TagToDescription;
  tagToRuns: tagToRunIds;
}

export interface SampledPluginTagMetadata {
  tagDescriptions: TagToDescription;
  tagRunSampledInfo: TagToRunSampledInfo;
}

export type TagMetadata = {
  [NSPT in NonSampledPluginType]: NonSampledPluginTagMetadata;
} & {
  [SPT in SampledPluginType]: SampledPluginTagMetadata;
};

export interface StepDatum {
  [PluginType.SCALARS]: ScalarStepDatum;
  [PluginType.HISTOGRAMS]: HistogramStepDatum;
  [PluginType.IMAGES]: ImageStepDatum;
}

export interface RunToSeries<T extends PluginType = PluginType> {
  [runId: string]: StepDatum[T][];
}

export interface RunToLoadState {
  [runId: string]: DataLoadState;
}

interface BaseTimeSeriesLoadable<T extends PluginType> {
  runToSeries: RunToSeries<T>;
  runToLoadState: RunToLoadState;
}

export type ScalarTimeSeriesLoadable =
  BaseTimeSeriesLoadable<PluginType.SCALARS>;
export type HistogramTimeSeriesLoadable =
  BaseTimeSeriesLoadable<PluginType.HISTOGRAMS>;
export type ImageTimeSeriesLoadable = BaseTimeSeriesLoadable<PluginType.IMAGES>;

export type SampledImageTimeSeriesLoadable = {
  [sample: number]: ImageTimeSeriesLoadable;
};

export type TimeSeriesLoadables = {
  [PluginType.SCALARS]: ScalarTimeSeriesLoadable;
  [PluginType.HISTOGRAMS]: HistogramTimeSeriesLoadable;
  [PluginType.IMAGES]: ImageTimeSeriesLoadable;
};

export type TimeSeriesLoadable = TimeSeriesLoadables[PluginType];

export type TimeSeriesLoadableType =
  | ScalarTimeSeriesLoadable
  | HistogramTimeSeriesLoadable
  | SampledImageTimeSeriesLoadable;

export type BaseTimeSeriesData<T extends TimeSeriesLoadableType> = {
  [tag: string]: T;
};

export type ScalarTimeSeriesData = BaseTimeSeriesData<ScalarTimeSeriesLoadable>;

export type HistogramTimeSeriesData =
  BaseTimeSeriesData<HistogramTimeSeriesLoadable>;

export type ImageTimeSeriesData =
  BaseTimeSeriesData<SampledImageTimeSeriesLoadable>;

export type TimeSeriesData = {
  [PluginType.SCALARS]: ScalarTimeSeriesData;
  [PluginType.HISTOGRAMS]: HistogramTimeSeriesData;
  [PluginType.IMAGES]: ImageTimeSeriesData;
};

export type CardMetadataMap = Record<
  NonPinnedCardId | PinnedCardId,
  CardMetadata
>;

export enum CardFeatureOverride {
  NONE,
  OVERRIDE_AS_ENABLED,
  OVERRIDE_AS_DISABLED,
}

export type CardState = {
  dataMinMax: MinMaxStep;
  userViewBox: Extent | null;
  timeSelection: TimeSelection;
  stepSelectionOverride: CardFeatureOverride;
  rangeSelectionOverride: CardFeatureOverride;
  tableExpanded: boolean;
  fullWidth: boolean;
};

export type CardStateMap = Record<CardId, Partial<CardState>>;

/**
 * A step index in a card could be set from actions or "modified" from the closest step index
 * set when linked time selection changed. When it is set from linked time selection, closest is true.
 * index: The step index
 * isClosest: Only used in linked time. When the index is adjusted on linked time selection changed, we
 * set this attribute to true.
 */
export type CardStepIndexMetaData = {
  index: number | null;
  isClosest: boolean | null;
};

/**
 * Map from cards to their step index metadata into the time series. Step index may be
 * null when the time series becomes empty.
 */
export type CardStepIndexMap = Record<
  NonPinnedCardId | PinnedCardId,
  CardStepIndexMetaData | null
>;

export type CardInteractions = {
  tagFilters: string[];
  pins: CardIdWithMetadata[];
  clicks: CardIdWithMetadata[];
};

export type CardToPinnedCard = Map<NonPinnedCardId, PinnedCardId>;

export type PinnedCardToCard = Map<PinnedCardId, NonPinnedCardId>;

export interface MetricsNamespacedState {
  tagMetadataLoadState: LoadState;
  tagMetadata: TagMetadata;
  // A list of card ids in the main content area, excluding pinned copies.
  cardList: NonPinnedCardId[];
  cardToPinnedCopy: CardToPinnedCard;
  // A map of card ids that previously pinned by the user.
  cardToPinnedCopyCache: CardToPinnedCard;
  pinnedCardToOriginal: PinnedCardToCard;
  /**
   * Pinned cards imported from storage that do not yet have a corresponding
   * card (e.g. tag metadata might not be loaded yet). Resolving an imported
   * card requires comparing its CardUniqueInfo to a resolved card. After
   * resolution, it is removed from this collection and added to the
   * appropriate data structures (e.g. pinnedCardToOriginal).
   *
   * These may become stale if runs are deleted from the experiment.
   */
  unresolvedImportedPinnedCards: CardUniqueInfo[];
  cardMetadataMap: CardMetadataMap;
  cardStateMap: CardStateMap;
  cardStepIndex: CardStepIndexMap;
  tagFilter: string;
  tagGroupExpanded: Map<string, boolean>;
  linkedTimeSelection: TimeSelection | null;
  linkedTimeEnabled: boolean;
  stepSelectorEnabled: boolean;
  rangeSelectionEnabled: boolean;
  singleSelectionHeaders: ColumnHeader[];
  rangeSelectionHeaders: ColumnHeader[];
  // Empty Set would signify "show all". `filteredPluginTypes` will never have
  // all pluginTypes in the Set.
  filteredPluginTypes: Set<PluginType>;
  // Minimum and maximum step number across all TimeSeries data.
  stepMinMax: {
    min: number;
    max: number;
  };
}

export interface MetricsSettings {
  cardMinWidth: number | null;
  tooltipSort: TooltipSort;
  ignoreOutliers: boolean;
  xAxisType: XAxisType;
  scalarSmoothing: number;
  hideEmptyCards: boolean;
  /**
   * https://github.com/tensorflow/tensorboard/issues/3732
   *
   * When a ML job restarts from a checkpoint or if a user writes to the same logdir
   * with overlapping steps, TensorBoard shows a zig-zag lines which tend to confuse
   * users. This setting guarantees that each line forms a monotonic increases in x-axis
   * by creating a pseudo-runs by partitioning the runs on the client side. In the
   * future, we may fix this at the log writing, reading, or backend response time.
   */
  scalarPartitionNonMonotonicX: boolean;
  /**
   * A non-negative, unitless number. A value of 5000 corresponds to 500%
   * increased brightness from normal.
   */
  imageBrightnessInMilli: number;
  /**
   * A non-negative, unitless number. A value of 5000 corresponds to 500%
   * increased contrast from normal.
   */
  imageContrastInMilli: number;
  imageShowActualSize: boolean;
  histogramMode: HistogramMode;
}

export interface MetricsNonNamespacedState {
  timeSeriesData: TimeSeriesData;
  isSettingsPaneOpen: boolean;
  isSlideoutMenuOpen: boolean;
  tableEditorSelectedTab: DataTableMode;
  // Default settings. For the legacy reasons, we cannot change the name of the
  // prop. It either is set by application or a user via settings storage.
  settings: MetricsSettings;
  settingOverrides: Partial<MetricsSettings>;
  /**
   * Map from ElementId to CardId. Only contains all visible cards.
   */
  visibleCardMap: Map<ElementId, CardId>;
  previousCardInteractions: CardInteractions;
  cardInteractions: CardInteractions;
}

export type MetricsState = NamespaceContextedState<
  MetricsNamespacedState,
  MetricsNonNamespacedState
>;

export interface State {
  [METRICS_FEATURE_KEY]?: MetricsState;
}

export const METRICS_SETTINGS_DEFAULT: MetricsSettings = {
  cardMinWidth: null,
  tooltipSort: TooltipSort.ALPHABETICAL,
  ignoreOutliers: true,
  xAxisType: XAxisType.STEP,
  hideEmptyCards: true,
  scalarSmoothing: 0.6,
  scalarPartitionNonMonotonicX: false,
  imageBrightnessInMilli: 1000,
  imageContrastInMilli: 1000,
  imageShowActualSize: false,
  histogramMode: HistogramMode.OFFSET,
};
