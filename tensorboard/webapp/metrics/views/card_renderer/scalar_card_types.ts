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
  smoothOf: string | null;
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
