/* Copyright 2019 The TensorFlow Authors. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the 'License');
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an 'AS IS' BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/

import {BaseTensorHealthPill} from "./health-pill-types";

/**
 * The specs for deferred view into a tensor.
 *
 * A tensor is a typed, multi-dimensional array.
 * This interface abstracts away the backing storage of the tensor value.
 * It allows on-demand retrieval into any element or sub-array of the tensor.
 */
export interface TensorView {
  /** Data type of the underlying tensor. */
  dtype: string;

  /** Rank of the underlying tensor. */
  rank: number;

  /** Shape of the underlying tensor. */
  shape: number[];

  /** Total number of elements in the underlying tensor. */
  size: number;

  /** Get a specific element. */
  get: (...indices: number[]) => Promise<boolean|number|string>;

  /**
   * Get a view of the underlying tensor with the specified
   * slicing and viewing dimensions, as well as the ranges
   * within the viewing dimensions.
   */
  view: (navigation: TensorViewNavigationStatus) =>
      Promise<SlicedValues>;

  /** Get the health pill of the underlying tensor. */
  getHealthPill: () => Promise<BaseTensorHealthPill>;
}

/**
 * Represents the primitive values from slicing a multi-dimensional
 * tensor.
 */
export type SlicedValues =
    boolean|boolean[]|boolean[][]|boolean[][][]|
    number|number[]|number[][]|number[][][]|
    string|string[]|string[][]|string[][][];

/**
 * A data structure that keeps track of how an n-dimensional array (tensor)
 * is sliced down to a smaller number of dimensions for visualization
 * in the tensor widget.
 */
export interface TensorViewNavigationStatus {
  /**
   * Which dimensions of the tensor are sliced down to a slice of 1.
   *
   * - The `dim` field is the 0-based dimension index.
   * - The `index` is the 0-based index for the selected slice.
   */
  slicingDimsAndIndices: Array<{dim: number, index: number}>;

  /**
   * Which dimensoins are used for viewing (i.e., rendered in the
   * tensor widget, as a table, by default.)
   */
  viewingDims: number[];

  /**
   * The indices from the first viewing dimension, which are shown as rows.
   *
   * The two numbers are beginning index (inclusive) and ending index
   * (exclusive).
   */
  verticalRange: [number, number];

  /**
   * The indices from the second viewing dimension, which are shown as columns.
   *
   * The two numbers are beginning index (inclusive) and ending index
   * (exclusive).
   */
  horizontalRange: [number, number];

  /**
   * Optional dimension for depth.
   *
   * This supports visualization that requires a depth dimension, e.g.,
   * color channels.
   */
  depthDim?: number;
}

/** Options used during the creation of a single-tensor tensor widget. */
export interface SingleTensorViewerOptions {
  /**
   * Name of the tenosr.
   *
   * Optional. If provided, it will be shown on the widget.
   * If not provided, no name will be shown.
   */
  name?: string;

  /**
   * Whether the health-pill portion of the tensor widget is to be
   * included
   *
   * Defaults to `true`.
   */
  includeHealthPill?: boolean;

  /** Defaults to `true`. */
  includeMenu?: boolean;

  /**
   * How many decimal places to display the values in.
   *
   * The values of the tensor may be displaced in the decimal notation, or
   * the engineering notation, depending automatically by the tensor-widget
   * library based on the maximum absolute value of the elements of the tensor.
   */
  decimalPlaces?: number;

  /** TODO(cais): Add support for custom tensor renderers. */
}
