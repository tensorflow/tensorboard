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

import {
  TagMetadata,
  TimeSeriesRequest,
  TimeSeriesResponse,
} from '../data_source';
import {CardId, HistogramMode, TooltipSort, XAxisType} from '../types';

/** @typehack */ import * as _typeHackModels from '@ngrx/store/src/models';
/** @typehack */ import * as _typeHackStore from '@ngrx/store';

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

export const metricsChangeScalarSmoothing = createAction(
  '[Metrics] Metrics Setting Change Scalar Smoothing',
  props<{smoothing: number}>()
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
 * An event when some cards enter or exit the viewport. The card sets must be
 * mutually exclusive.
 */
export const cardVisibilityChanged = createAction(
  '[Metrics] Card Visibility Changed',
  props<{enteredCards: Set<CardId>; exitedCards: Set<CardId>}>()
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
