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
 * @fileoverview Types used to interop with Polymer's VzLineChart2 custom
 * element.
 *
 * 1) This file should not depend on any other file, nor be aware of Angular,
 * NgRx.
 *
 * 2) Do not make breaking changes to types in this file unless something in the
 * Polymer side changes, likely:
 * - tensorboard/components/vz_chart_helpers/
 * - tensorboard/components/vz_line_chart2/
 */

/**
 * Note: several properties and methods are ignored by the Polymer component
 * until the chart is completely loaded and fires 'chart-attached'.
 * These include:
 * `redraw`, `resetDomain`, `setSeriesData`, `setSeriesMetadata`,
 * `smoothingEnabled`, `smoothingWeight`, `ignoreOutliers`,
 * `tooltipSortingMethod`
 */
export interface VzLineChart2<
  SeriesMetadata extends {},
  PointData extends {} = {}
> extends HTMLElement {
  colorScale: ColorScale;
  defaultXRange?: AxisRange;
  defaultYRange?: AxisRange;
  ignoreYOutliers: boolean;
  smoothingEnabled: boolean;
  smoothingWeight: number;
  tooltipColumns: Array<TooltipColumnSpec<SeriesMetadata, PointData>>;
  tooltipPosition: TooltipPosition;
  tooltipSortingMethod: TooltipSortingMethod;
  xType: string;
  yScaleType: string;
  getExporter: () => {
    exportAsString: () => string;
  };
  isDataFitToDomain: () => boolean;
  redraw: () => void;
  resetDomain: () => void;
  setSeriesData: (seriesName: string, data: PointData[]) => void;
  setSeriesMetadata: (seriesName: string, metadata: SeriesMetadata) => void;
  setVisibleSeries: (seriesNames: string[]) => void;
  commitChanges: () => void;
  yValueAccessor: (d: PointData) => number;
}

/**
 * On the Polymer side, LineChart may internally override some fields on the
 * datum provided.
 * See tensorboard/components/vz_line_chart2/line-chart.ts
 */
export interface NoReservedPointFields extends Object {
  name?: never;
  displayY?: never;
  relative?: never;
  smoothed?: never;
}

export interface ColorScale {
  scale: (runName: string) => string;
}

export enum TooltipPosition {
  BOTTOM = 'bottom',
  RIGHT = 'right',
  AUTO = 'auto',
}

export enum TooltipSortingMethod {
  DEFAULT = 'default',
  ASCENDING = 'ascending',
  DESCENDING = 'descending',
  NEAREST = 'nearest',
}

export enum XAxisType {
  /** Linear scale using the "step" property of the datum. */
  STEP = 'step',

  /**
   * Temporal scale using the earliest datum's "wall_time" as a baseline.
   */
  RELATIVE = 'relative',

  /** Temporal scale using the "wall_time" property of the datum. */
  WALL_TIME = 'wall_time',
}

export enum YAxisType {
  LINEAR = 'linear',
  LOG = 'log',
}

export type AxisRange = [number, number];

export interface EvaluationPoint<
  SeriesMetadata extends {},
  PointData extends {}
> {
  dataset: {
    data: () => PointData[];
    metadata: () => {
      meta: SeriesMetadata;
    };
  };
  datum: PointData;
}

export interface TooltipColumnSpec<
  SeriesMetadata extends {},
  PointData extends {} = {}
> {
  title: string;
  evaluate: (point: EvaluationPoint<SeriesMetadata, PointData>) => string;
}
