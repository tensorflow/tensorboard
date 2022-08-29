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

import {ExperimentAlias} from '../../../experiments/types';
import {
  DataSeries,
  DataSeriesMetadata,
  DataSeriesMetadataMap,
  Point,
} from '../../../widgets/line_chart_v2/types';

export enum SeriesType {
  ORIGINAL,
  DERIVED,
}

// Smoothed series is derived from a data serie. The additional information on the
// metadata allows us to render smoothed value and its original value in the tooltip.
export interface SmoothedSeriesMetadata extends DataSeriesMetadata {
  type: SeriesType.DERIVED;
  aux: false;
  originalSeriesId: string;
  alias: ExperimentAlias | null;
}

export interface OriginalSeriesMetadata extends DataSeriesMetadata {
  type: SeriesType.ORIGINAL;
  alias: ExperimentAlias | null;
}

export type ScalarCardSeriesMetadata =
  | SmoothedSeriesMetadata
  | OriginalSeriesMetadata;

export type ScalarCardSeriesMetadataMap =
  DataSeriesMetadataMap<ScalarCardSeriesMetadata>;

export interface ScalarCardPoint extends Point {
  wallTime: number;
  value: number;
  step: number;
  relativeTimeInMs: number;
}

export type ScalarCardDataSeries = DataSeries<ScalarCardPoint>;

export interface PartialSeries {
  runId: string;
  points: ScalarCardPoint[];
}

export interface PartitionedSeries {
  // id that uniquely identifies a partitioned series. This may be derived from runId
  // but is not interchangeable.
  seriesId: string;
  partitionIndex: number;
  partitionSize: number;
  runId: string;
  points: ScalarCardPoint[];
}

/**
 * This enum defines the columns available in the data table. The
 * ScalarCardComponent must know which piece of data is associated with each
 * value and the DataTable widget must know how to display each value.
 */
export enum ColumnHeaders {
  COLOR = 'COLOR',
  RELATIVE_TIME = 'RELATIVE_TIME',
  RUN = 'RUN',
  STEP = 'STEP',
  TIME = 'TIME',
  VALUE = 'VALUE',
  SMOOTHED = 'SMOOTHED',
  VALUE_CHANGE = 'VALUE_CHANGE',
  START_STEP = 'START_STEP',
  END_STEP = 'END_STEP',
  START_VALUE = 'START_VALUE',
  END_VALUE = 'END_VALUE',
  MIN_VALUE = 'MIN_VALUE',
  MAX_VALUE = 'MAX_VALUE',
  PERCENTAGE_CHANGE = 'PERCENTAGE_CHANGE',
}

export enum SortingOrder {
  ASCENDING,
  DESCENDING,
}

export interface SortingInfo {
  header: ColumnHeaders;
  order: SortingOrder;
}

/**
 * An object which essentially contains the data for an entire row in the
 * DataTable. It will have a value for each required ColumnHeader for a given
 * run.
 */
export type SelectedStepRunData = {
  [key in ColumnHeaders]?: string | number;
};

/**
 * An object which is intended to hold the min and max step within each scalar
 * card.
 */
export type MinMaxStep = {
  minStep: number;
  maxStep: number;
};
