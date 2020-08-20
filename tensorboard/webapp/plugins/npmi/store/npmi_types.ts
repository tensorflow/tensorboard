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

type Annotation = string;
type Metric = string;
export type AnnotationDataListing = Record<Annotation, ValueData[]>;

export interface ValueData {
  nPMIValue: number | null;
  countValue: number | null;
  annotation: Annotation;
  metric: Metric;
  run: string;
}

export interface MetricListing {
  [runId: string]: Metric[];
}

export interface NpmiState {
  // coming from backend
  pluginDataLoaded: LoadState;
  annotationData: AnnotationDataListing;
  runToMetrics: MetricListing;
}

export interface State {
  [NPMI_FEATURE_KEY]: NpmiState;
}
