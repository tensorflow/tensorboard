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
import {EvaluationPoint as VzEvaluationPoint} from './polymer_interop_types';

export {XAxisType, YAxisType} from './polymer_interop_types';

/**
 * The data associated with each point in a series.
 */
export type Point<T extends {} = {}> = T & {
  x: number;
  y: number;
};

/**
 * Data for a single series in a line chart. Extra point data can be
 * attached to inform TooltipColumnSpec's `evaluate()`.
 */
export interface SeriesData<Metadata extends {}, ExtraPointData extends {}> {
  seriesId: string;
  metadata: Metadata;
  points: Array<Point<ExtraPointData>>;
  visible: boolean;
}

/**
 * Tooltips appear as users hover the mouse over points on a line chart.
 */
export interface TooltipColumnSpec<
  Metadata extends {},
  ExtraPointData extends {}
> {
  /**
   * Column header text.
   */
  title: string;

  /**
   * Method used to produce a final text value displayed in a specific cell
   * in the tooltip table.
   */
  evaluate: (point: EvaluationPoint<Metadata, ExtraPointData>) => string;
}

export type EvaluationPoint<
  Metadata extends {},
  ExtraPointData extends {}
> = VzEvaluationPoint<Metadata, Point<ExtraPointData>>;
