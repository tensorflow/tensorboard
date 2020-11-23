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

import {
  DataSeries,
  DataSeriesMetadata,
  DataSeriesMetadataMap,
  Point,
} from '../../../widgets/line_chart_v2/types';

export interface ScalarCardSeriesMetadata extends DataSeriesMetadata {
  // Whether current series is derived from another series. Useful when displaying a
  // tooltip where we need to show smoothed value and original value on a same row;
  // sub_view/interactive_view only gives metdata, closest point index and its point
  // value. We are supposed to find the original unsmoothed value to display on the
  // tooltip.
  smoothOf: string | null;
  // Whether the series is smoothed by and derived by other series. Usedful for detecting
  // whether this series is auxiliary.
  smoothedBy: string | null;
}

export type ScalarCardSeriesMetadataMap = DataSeriesMetadataMap<
  ScalarCardSeriesMetadata
>;

export interface ScalarCardPoint extends Point {
  wallTime: number;
  value: number;
  step: number;
}

export type ScalarCardDataSeries = DataSeries<ScalarCardPoint>;
