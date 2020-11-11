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

export * from './scale_types';

export interface Dimension {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  width: number;
  y: number;
  height: number;
}

export interface Extent {
  x: [number, number];
  y: [number, number];
}

export interface DataSeriesMetadata {
  id: string;
  displayName: string;
  visible: boolean;
  color: string;
  // Number between 0-1. Default is 1.
  opacity?: number;
  /**
   * Whether the series is auxiliary. When a datum is auxiliary, it is visible in the
   * chart but will not be used for calculating the data extent and will not be
   * interactable.
   */
  aux?: boolean;
}

export interface DataSeriesMetadataMap<
  Metadata extends DataSeriesMetadata = DataSeriesMetadata
> {
  [id: string]: Metadata;
}

export interface Point {
  x: number;
  y: number;
}

export interface DataSeries<T extends Point = Point> {
  id: string;
  points: T[];
}

/**
 * Flattened array of 2d coordinates: [x0, y0, x1, y1, ..., xn, yn].
 */
export type Polyline = Float32Array;

export interface DataInternalSeries {
  id: string;
  polyline: Polyline;
}
