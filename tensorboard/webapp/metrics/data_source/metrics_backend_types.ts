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
 * @fileoverview Types produced only by the backend data source.
 *
 * Types defined in `plugins/metrics/http_api.md`.
 */

import {
  HistogramStepDatum,
  ImageStepDatum,
  PluginType,
  RunToTags,
  ScalarStepDatum,
  TagToDescription,
  TagToRunSampledInfo,
} from './types';

export interface BackendNonSampledTagMetadata {
  runTagInfo: RunToTags;
  tagDescriptions: TagToDescription;
}

export type BackendSampledTagMetadata = {
  tagDescriptions: TagToDescription;
  tagRunSampledInfo: TagToRunSampledInfo;
};

export type BackendTagMetadata = {
  [PluginType.SCALARS]: BackendNonSampledTagMetadata;
  [PluginType.HISTOGRAMS]: BackendNonSampledTagMetadata;
  [PluginType.IMAGES]: BackendSampledTagMetadata;
};

export interface BackendTimeSeriesRequest {
  plugin: PluginType;
  tag: string;
  run?: string;
  sample?: number;
}

export type BackendRunToSeries =
  | {
      [run: string]: ScalarStepDatum[];
    }
  | {[run: string]: HistogramStepDatum[]}
  | {[run: string]: ImageStepDatum[]};

export interface BackendTimeSeriesSuccessfulResponse {
  plugin: PluginType;
  tag: string;
  run?: string;
  sample?: number;
  runToSeries: BackendRunToSeries;
  error?: undefined;
}

export interface BackendTimeSeriesFailedResponse {
  plugin: PluginType;
  tag: string;
  run?: string;
  sample?: number;
  error: string;
  runToSeries?: undefined;
}

export type BackendTimeSeriesResponse =
  | BackendTimeSeriesSuccessfulResponse
  | BackendTimeSeriesFailedResponse;
