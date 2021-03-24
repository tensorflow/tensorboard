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
import {DataLoadState} from '../types/data';
import {of} from 'rxjs';

import {State} from '../app_state';
import {HistogramMode} from '../widgets/histogram/histogram_types';

import {
  HistogramStepDatum,
  ImageId,
  ImageStepDatum,
  MetricsDataSource,
  PluginType,
  ScalarStepDatum,
  TagMetadata as DataSourceTagMetadata,
  TimeSeriesRequest,
} from './data_source';
import {
  METRICS_FEATURE_KEY,
  MetricsState,
  TagMetadata,
  TimeSeriesData,
} from './store';
import * as selectors from './store/metrics_selectors';
import {RunToSeries, StepDatum} from './store/metrics_types';
import {CardId, CardMetadata, TooltipSort, XAxisType} from './types';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';

export function buildMetricsSettingsState(
  overrides?: Partial<MetricsState['settings']>
): MetricsState['settings'] {
  return {
    tooltipSort: TooltipSort.NEAREST,
    ignoreOutliers: false,
    xAxisType: XAxisType.WALL_TIME,
    scalarSmoothing: 0.3,
    scalarPartitionNonMonotonicX: false,
    imageBrightnessInMilli: 123,
    imageContrastInMilli: 123,
    imageShowActualSize: true,
    histogramMode: HistogramMode.OFFSET,
    ...overrides,
  };
}

function buildBlankState(): MetricsState {
  return {
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
    timeSeriesData: {
      scalars: {},
      histograms: {},
      images: {},
    },
    settings: buildMetricsSettingsState(),
    cardList: [],
    cardToPinnedCopy: new Map(),
    pinnedCardToOriginal: new Map(),
    unresolvedImportedPinnedCards: [],
    cardMetadataMap: {},
    cardStepIndex: {},
    visibleCards: new Set(),
    tagFilter: '',
    tagGroupExpanded: new Map(),
  };
}

export function buildMetricsState(
  overrides?: Partial<MetricsState>
): MetricsState {
  return {...buildBlankState(), ...overrides};
}

export function appStateFromMetricsState(metricsState?: MetricsState): State {
  return {
    [METRICS_FEATURE_KEY]: metricsState || buildMetricsState(),
  };
}

export function buildTagMetadata(): TagMetadata {
  return {
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
  };
}

export function buildDataSourceTagMetadata(): DataSourceTagMetadata {
  return {
    scalars: {
      tagDescriptions: {},
      runTagInfo: {},
    },
    histograms: {
      tagDescriptions: {},
      runTagInfo: {},
    },
    images: {
      tagDescriptions: {},
      tagRunSampledInfo: {},
    },
  };
}

export function createScalarStepData(): ScalarStepDatum[] {
  return [
    {step: 0, wallTime: 123, value: 42},
    {step: 1, wallTime: 124, value: -42},
    {step: 99, wallTime: 125, value: 0},
  ];
}

export function createHistogramStepData(): HistogramStepDatum[] {
  return [
    {step: 0, wallTime: 123, bins: [{min: 0, max: 100, count: 42}]},
    {step: 1, wallTime: 124, bins: [{min: 0, max: 100, count: 42}]},
    {step: 99, wallTime: 125, bins: [{min: 0, max: 100, count: 42}]},
  ];
}

export function createImageStepData(): ImageStepDatum[] {
  return [
    {step: 0, wallTime: 123, imageId: '<image_id_0>'},
    {step: 1, wallTime: 124, imageId: '<image_id_1>'},
    {step: 99, wallTime: 125, imageId: '<image_id_2>'},
  ];
}

function createStepData(plugin: PluginType) {
  switch (plugin) {
    case PluginType.SCALARS:
      return createScalarStepData();
    case PluginType.HISTOGRAMS:
      return createHistogramStepData();
    case PluginType.IMAGES:
      return createImageStepData();
    default:
      throw new Error('Cannot create step data for unknown plugin type.');
  }
}

export function buildTimeSeriesData(): TimeSeriesData {
  return {
    scalars: {},
    histograms: {},
    images: {},
  };
}

export function createTimeSeriesData(): TimeSeriesData {
  return {
    scalars: {
      tagA: {
        runToSeries: {run1: createScalarStepData()},
        runToLoadState: {run1: DataLoadState.FAILED},
      },
    },
    histograms: {
      tagB: {
        runToSeries: {run1: createHistogramStepData()},
        runToLoadState: {run1: DataLoadState.FAILED},
      },
    },
    images: {
      tagC: {
        9: {
          runToSeries: {run1: createImageStepData()},
          runToLoadState: {run1: DataLoadState.FAILED},
        },
      },
    },
  };
}

export function createCardMetadata(plugin?: PluginType): CardMetadata {
  switch (plugin) {
    case PluginType.IMAGES:
      return {plugin, tag: 'tagA', runId: 'run1', sample: 999};
    case PluginType.HISTOGRAMS:
      return {
        plugin,
        tag: 'tagA',
        runId: 'run1',
      };
    case PluginType.SCALARS:
    default:
      return {
        plugin: PluginType.SCALARS,
        tag: 'tagA',
        runId: null,
      };
  }
}

export function provideMockCardSeriesData(
  storeSelectSpy: jasmine.Spy,
  plugin: PluginType,
  cardId: CardId,
  metadataOverride?: Partial<CardMetadata> | null,
  timeSeries?: StepDatum[typeof plugin][] | null,
  stepIndex: number | null = 0
) {
  const cardMetadata = {...createCardMetadata(plugin), ...metadataOverride};
  let runToSeries = null;
  if (timeSeries !== null) {
    runToSeries = {
      [cardMetadata.runId as string]: timeSeries || createStepData(plugin),
    };
  }

  storeSelectSpy
    .withArgs(selectors.getCardMetadata, cardId)
    .and.returnValue(of(cardMetadata));
  storeSelectSpy
    .withArgs(selectors.getCardTimeSeries, cardId)
    .and.returnValue(of(runToSeries));
  storeSelectSpy
    .withArgs(selectors.getCardStepIndex, cardId)
    .and.returnValue(of(stepIndex));
}

export function provideMockCardRunToSeriesData(
  storeSelectSpy: jasmine.Spy,
  plugin: PluginType,
  cardId: CardId,
  metadataOverride?: Partial<CardMetadata> | null,
  runToSeries?: RunToSeries<typeof plugin> | null,
  stepIndex: number | null = 0
) {
  const cardMetadata = {...createCardMetadata(plugin), ...metadataOverride};
  if (runToSeries !== null) {
    runToSeries = runToSeries || {
      [cardMetadata.runId as string]: createStepData(plugin),
    };
  }

  storeSelectSpy
    .withArgs(selectors.getCardMetadata, cardId)
    .and.returnValue(of(cardMetadata));
  storeSelectSpy
    .withArgs(selectors.getCardTimeSeries, cardId)
    .and.returnValue(of(runToSeries));
  storeSelectSpy
    .withArgs(selectors.getCardStepIndex, cardId)
    .and.returnValue(of(stepIndex));
}

@Injectable()
export class TestingMetricsDataSource implements MetricsDataSource {
  fetchTagMetadata(experimentIds: string[]) {
    return of(buildDataSourceTagMetadata());
  }

  fetchTimeSeries(requests: TimeSeriesRequest[]) {
    return of([]);
  }

  imageUrl(imageId: ImageId) {
    return '';
  }

  downloadUrl(
    pluginId: PluginType,
    tag: string,
    runId: string,
    downloadType: 'json' | 'csv'
  ) {
    return '';
  }
}

export function provideTestingMetricsDataSource() {
  return [
    TestingMetricsDataSource,
    {provide: MetricsDataSource, useExisting: TestingMetricsDataSource},
  ];
}
