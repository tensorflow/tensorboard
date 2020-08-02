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

import {DataLoadState, LoadState} from '../../../types/data';

export {DataLoadState, LoadState};

export const NPMI_FEATURE_KEY = 'npmi';

export interface Tags {
  [tagId: string]: string;
}

export interface AnnotationListing {
  [runId: string]: string[];
}

export interface MetricListing {
  [runId: string]: string[];
}

export interface ValueListing {
  [runId: string]: number[][];
}

export interface SummaryListing {
  [runId: string]: number[];
}

export interface NpmiState {
  annotationsData: AnnotationListing;
  annotationsLoaded: LoadState;

  metricsData: MetricListing;
  npmiMetricsData: MetricListing;
  countMetricsData: MetricListing;
  metricsLoaded: LoadState;

  valuesData: ValueListing;
  countValuesData: ValueListing;
  npmiValuesData: ValueListing;
  valuesLoaded: LoadState;

  countData: SummaryListing;
}

export interface State {
  [NPMI_FEATURE_KEY]: NpmiState;
}
