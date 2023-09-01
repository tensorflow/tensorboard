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
import {createAction, props} from '@ngrx/store';
import {ElementId} from '../../util/dom';
import {
  TimeSelectionToggleAffordance,
  TimeSelectionWithAffordance,
} from '../../widgets/card_fob/card_fob_types';
import {
  TagMetadata,
  TimeSeriesRequest,
  TimeSeriesResponse,
} from '../data_source';
import {CardInteractions, CardState} from '../store/metrics_types';
import {
  CardId,
  HeaderEditInfo,
  HeaderToggleInfo,
  HistogramMode,
  PluginType,
  TooltipSort,
  XAxisType,
} from '../types';
import {SortingInfo, DataTableMode} from '../../widgets/data_table/types';
import {Extent} from '../../widgets/line_chart_v2/lib/public_types';

export const metricsSettingsPaneClosed = createAction(
  '[Metrics] Metrics Settings Pane Closed'
);

export const metricsSettingsPaneToggled = createAction(
  '[Metrics] Metrics Settings Pane Toggled'
);

export const metricsSlideoutMenuToggled = createAction(
  '[Metrics] Slide out settings menu toggled'
);

export const metricsSlideoutMenuOpened = createAction(
  '[Metrics] User requested to open the slide out menu',
  props<{mode: DataTableMode}>()
);

export const tableEditorTabChanged = createAction(
  '[Metrics] User changed the tab in the table editor',
  props<{tab: DataTableMode}>()
);

export const metricsSlideoutMenuClosed = createAction(
  '[Metrics] Slide out settings menu closed'
);

export const metricsTagMetadataRequested = createAction(
  '[Metrics] Metrics Tag Metadata Requested'
);

export const metricsTagMetadataLoaded = createAction(
  '[Metrics] Metrics Tag Metadata Loaded',
  props<{tagMetadata: TagMetadata}>()
);

export const metricsTagMetadataFailed = createAction(
  '[Metrics] Metrics Tag Metadata Failed'
);

export const metricsCardStateUpdated = createAction(
  '[Metrics] Metrics Card State Updated',
  props<{
    cardId: CardId;
    settings: Partial<CardState>;
  }>()
);

export const metricsCardFullSizeToggled = createAction(
  '[Metrics] Metrics Card Full Size Toggled',
  props<{cardId: CardId}>()
);

export const metricsChangeTooltipSort = createAction(
  '[Metrics] Metrics Settings Change Tooltip',
  props<{sort: TooltipSort}>()
);

export const metricsToggleShowDataDownload = createAction(
  '[Metrics] Metrics Settings Toggle Show Data Download'
);

export const metricsToggleIgnoreOutliers = createAction(
  '[Metrics] Metrics Setting Toggle Ignore Outlier'
);

export const metricsChangeXAxisType = createAction(
  '[Metrics] Metrics Setting Change X Axis Type',
  props<{xAxisType: XAxisType}>()
);

export const metricsChangeCardWidth = createAction(
  '[Metrics] Metrics Setting Change Card Width',
  props<{cardMinWidth: number}>()
);

export const metricsResetCardWidth = createAction(
  '[Metrics] Metrics Setting Reset Card Width'
);

export const metricsChangeScalarSmoothing = createAction(
  '[Metrics] Metrics Setting Change Scalar Smoothing',
  props<{smoothing: number}>()
);

export const metricsScalarPartitionNonMonotonicXToggled = createAction(
  '[Metrics] Metrics Setting Partition Non Monotonic X Toggled'
);

export const metricsChangeImageBrightness = createAction(
  '[Metrics] Metrics Setting Change Image Brightness',
  props<{brightnessInMilli: number}>()
);

export const metricsChangeImageContrast = createAction(
  '[Metrics] Metrics Setting Change Image Contrast',
  props<{contrastInMilli: number}>()
);

export const metricsResetImageBrightness = createAction(
  '[Metrics] Image Brightness Setting Reset'
);

export const metricsResetImageContrast = createAction(
  '[Metrics] Image Contrast Setting Reset'
);

export const metricsToggleImageShowActualSize = createAction(
  '[Metrics] Metrics Setting Toggle Image Show Actual Size'
);

export const metricsChangeHistogramMode = createAction(
  '[Metrics] Metrics Setting Change Histogram Mode',
  props<{histogramMode: HistogramMode}>()
);

export const multipleTimeSeriesRequested = createAction(
  '[Metrics] Multiple Time Series Requested',
  props<{requests: TimeSeriesRequest[]}>()
);

export const fetchTimeSeriesFailed = createAction(
  '[Metrics] Fetch Time Series Request Failed',
  props<{request: TimeSeriesRequest}>()
);

export const fetchTimeSeriesLoaded = createAction(
  '[Metrics] Fetch Time Series Response Loaded',
  props<{response: TimeSeriesResponse}>()
);

/**
 * An event when some cards enter or exit the viewport. An element within
 * `enteredCards` must not be found within `exitedCards`, and vice versa.
 */
export const cardVisibilityChanged = createAction(
  '[Metrics] Card Visibility Changed',
  props<{
    enteredCards: Array<{elementId: ElementId; cardId: CardId}>;
    exitedCards: Array<{elementId: ElementId; cardId: CardId}>;
  }>()
);

export const cardStepSliderChanged = createAction(
  '[Metrics] Card Step Slider Changed',
  props<{cardId: CardId; stepIndex: number}>()
);

export const metricsTagFilterChanged = createAction(
  '[Metrics] Tag Filter Changed',
  props<{tagFilter: string}>()
);

export const metricsTagGroupExpansionChanged = createAction(
  '[Metrics] Metrics Tag Group Expansion Changed',
  props<{tagGroup: string}>()
);

export const cardPinStateToggled = createAction(
  '[Metrics] Card Pin State Toggled',
  props<{cardId: CardId; canCreateNewPins: boolean; wasPinned: boolean}>()
);

export const metricsToggleVisiblePlugin = createAction(
  '[Metrics] Toggle Visible Plugin',
  props<{
    plugin: PluginType;
  }>()
);

export const metricsShowAllPlugins = createAction(
  '[Metrics] Toggle Show All Plugins'
);

export const timeSelectionChanged = createAction(
  '[Metrics] Time Selection Changed',
  props<{cardId?: CardId} & TimeSelectionWithAffordance>()
);

export const cardViewBoxChanged = createAction(
  '[Metrics] Card User View Box Changed',
  props<{cardId: CardId; userViewBox: Extent | null}>()
);

export const linkedTimeToggled = createAction(
  '[Metrics] Linked Time Enable Toggle',
  props<{
    // Affordance for internal analytics purpose. When no affordance is specified or is
    // undefined we do not want to log an analytics event.
    affordance?: TimeSelectionToggleAffordance;
  }>()
);

export const sortingDataTable = createAction(
  '[Metrics] Sorting Data Table By Header',
  props<SortingInfo>()
);

export const dataTableColumnEdited = createAction(
  '[Metrics] Data table columns edited in edit menu',
  props<HeaderEditInfo>()
);

export const dataTableColumnToggled = createAction(
  '[Metrics] Data table column toggled in edit menu or delete button clicked',
  props<HeaderToggleInfo>()
);

export const stepSelectorToggled = createAction(
  '[Metrics] Time Selector Enable Toggle',
  props<{
    // Affordance for internal analytics purpose. When no affordance is specified or is
    // undefined we do not want to log an analytics event.
    affordance?: TimeSelectionToggleAffordance;
    // This action can be triggered by two different events:
    //   1) Clicking the checkbox in the settings panel
    //   2) Removing the last fob from a scalar card
    //
    // Setting the cardId results in stepSelection being toggled for a specific card.
    // Without the cardId being set this action only effects the global stepSeletion.
    cardId?: CardId;
  }>()
);
export const rangeSelectionToggled = createAction(
  '[Metrics] Range Selection Toggled',
  props<{
    // Affordance for internal analytics purpose. When no affordance is specified or is
    // undefined we do not want to log an analytics event.
    affordance?: TimeSelectionToggleAffordance;
  }>()
);

export const metricsHideEmptyCardsToggled = createAction(
  '[Metrics] Hide Empty Cards Changed'
);

export const metricsPreviousCardInteractionsChanged = createAction(
  '[Metrics] Card Interactions Changed',
  props<{cardInteractions: CardInteractions}>()
);

export const metricsCardClicked = createAction(
  '[Metrics] Card Clicked',
  props<{cardId: string}>()
);

// TODO(jieweiwu): Delete after internal code is updated.
export const stepSelectorTimeSelectionChanged = timeSelectionChanged;
