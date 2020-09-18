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
/**
 * @fileoverview Utilities used internally by the Metrics feature's NgRx store.
 */

import {DataLoadState} from '../../types/data';

import {isSampledPlugin, PluginType, SampledPluginType} from '../data_source';
import {CardId, CardMetadata} from '../types';

import {
  RunToLoadState,
  TagMetadata,
  TimeSeriesData,
  TimeSeriesLoadables,
} from './metrics_types';

/**
 * Returns the loadable information for a specific tag, containing its series
 * data and load state. Returns `null` when the requested tag has no initial
 * loadable in `timeSeriesData`.
 */
export function getTimeSeriesLoadable(
  timeSeriesData: TimeSeriesData,
  plugin: PluginType,
  tag: string,
  sample?: number
): TimeSeriesLoadables[typeof plugin] | null {
  const pluginData = timeSeriesData[plugin];
  if (!pluginData.hasOwnProperty(tag)) {
    return null;
  }
  if (isSampledPlugin(plugin)) {
    if (!timeSeriesData[plugin][tag].hasOwnProperty(sample!)) {
      return null;
    }
    return timeSeriesData[plugin][tag][sample!];
  }
  return timeSeriesData[plugin][tag];
}

/**
 * Create a new plugin data with new references to a new time series loadable.
 * The return object is a shallow clone, so consumers must clone fields as
 * needed.
 */
export function createPluginDataWithLoadable(
  timeSeriesData: TimeSeriesData,
  plugin: PluginType,
  tag: string,
  sample?: number
): TimeSeriesData[typeof plugin] {
  if (isSampledPlugin(plugin)) {
    const pluginData = {...timeSeriesData[plugin]};
    const tagData = createSampledTagDataWithLoadable<typeof plugin>(
      pluginData,
      tag,
      sample!
    );
    pluginData[tag] = tagData;
    return pluginData;
  }

  const pluginData = {...timeSeriesData[plugin]};
  const hasTag = pluginData.hasOwnProperty(tag);
  pluginData[tag] = hasTag
    ? {...pluginData[tag]}
    : buildTimeSeriesLoadable<typeof plugin>();
  return pluginData;
}

function createSampledTagDataWithLoadable<P extends SampledPluginType>(
  pluginData: TimeSeriesData[SampledPluginType],
  tag: string,
  sample: number
) {
  const hasTag = pluginData.hasOwnProperty(tag);
  const tagData = hasTag ? {...pluginData[tag]} : {};

  const hasSample = tagData.hasOwnProperty(sample);
  tagData[sample] = hasSample
    ? {...tagData[sample]}
    : buildTimeSeriesLoadable<P>();
  return tagData;
}

function buildTimeSeriesLoadable<
  P extends PluginType
>(): TimeSeriesLoadables[P] {
  return {
    runToSeries: {},
    runToLoadState: {},
  };
}

/**
 * Note: do not rely on the implementation details of these ID generators below.
 * Clients should operate on `CardId`s, whose type may be open to change.
 */

export function getCardId(cardMetadata: CardMetadata) {
  return JSON.stringify(cardMetadata);
}

export function getPinnedCardId(baseCardId: CardId) {
  return JSON.stringify({baseCardId});
}

/**
 * Creates a RunToLoadState with a specific load state for all specified runs.
 */
export function createRunToLoadState(
  loadState: DataLoadState,
  runs: string[],
  prevRunToLoadState?: RunToLoadState
): RunToLoadState {
  const runToLoadState = {...prevRunToLoadState} as RunToLoadState;
  for (const run of runs) {
    runToLoadState[run] = loadState;
  }
  return runToLoadState;
}

export function getRunIds(
  tagMetadata: TagMetadata,
  plugin: PluginType,
  tag: string,
  sample?: number
) {
  if (isSampledPlugin(plugin)) {
    const tagRunSampledInfo = tagMetadata[plugin].tagRunSampledInfo;
    if (!tagRunSampledInfo.hasOwnProperty(tag)) {
      return [];
    }
    const runIds = Object.keys(tagRunSampledInfo[tag]);
    return runIds.filter((runId) => {
      return sample! < tagRunSampledInfo[tag][runId].maxSamplesPerStep;
    });
  }
  const tagToRunIds = tagMetadata[plugin].tagToRuns;
  return tagToRunIds.hasOwnProperty(tag) ? tagToRunIds[tag] : [];
}
