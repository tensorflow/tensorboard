/* Copyright 2019 The TensorFlow Authors. All Rights Reserved.

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

import {BaseTensorNumericSummary} from './health-pill-types';

export type Shape = ReadonlyArray<number>;

/** The basic specifications of a tensor. */
export interface TensorSpec {
  /** Data type of the underlying tensor. */
  dtype: string;

  /** Shape of the underlying tensor. */
  shape: Shape;
}

/**
 * The specs for deferred view into a tensor.
 *
 * A tensor is a typed, multi-dimensional array.
 * This interface abstracts away the backing storage of the tensor value.
 *
 * It allows *on-demand* retrieval of any element or sub-array of the tensor,
 * which is important for the cases in which the underlying tensor is held
 * at a backend process (e.g., a TensorFlow GPU training job) and is too
 * large to fit into JavaScript memory as a whole.
 */
export interface TensorView {
  /** The basic immutable aspects of the tensor: dtype and shape. */
  spec: TensorSpec;

  /**
   * Get a specific element.
   * @param indices Coordinates of the element. n indices (length-n array of
   * number) is required to specify an element in an n-dimensional tensor, n
   * being a non-negative integer.
   * @return The value of the element at the specified indices.
   */
  get: (...indices: number[]) => Promise<boolean | number | string>;

  /**
   * Get a view of the underlying tensor with the specified
   * slicing and viewing dimensions, as well as the ranges
   * within the viewing dimensions.
   */
  view: (slicingSpec: TensorViewSlicingSpec) => Promise<SlicedValues>;

  /** Get the numeric summary of the underlying tensor. */
  getNumericSummary: () => Promise<BaseTensorNumericSummary>;
}

/**
 * Represents the primitive values from slicing a multi-dimensional
 * tensor.
 */
export type SlicedValues =
  | boolean
  | boolean[]
  | boolean[][]
  | boolean[][][]
  | number
  | number[]
  | number[][]
  | number[][][]
  | string
  | string[]
  | string[][]
  | string[][][];

/**
 * A data structure that keeps track of how an n-dimensional array (tensor)
 * is sliced down to a smaller number of dimensions for visualization
 * in the tensor widget.
 *
 * For example, suppose there is a 4D tensor of shape [16, 128, 128, 3]
 * representing a NHWC image batch. If you'd like to get the 4-by-3 top-left
 * corner of the first image of the last color channel  displayed in the tensor
 * widget, this interface should have the following concrete value:
 *
 * ```
 * {
 *   slicingDimsAndIndices: [{
 *     dim: 0,
 *     index: 0
 *   }, {
 *     dim: 3,
 *     index: 2
 *   }],
 *   viewingDims: [1, 2],
 *   verticalRange: [0, 4],
 *   horizontalRange: [0, 3]
 * }
 * ```
 */
export interface TensorViewSlicingSpec {
  /**
   * Which dimensions of the tensor are sliced down to a slice of 1.
   *
   * - The `dim` field is the 0-based dimension index.
   * - The `index` is the 0-based index for the selected slice.
   *   The `null` option in `index` is for the case of 0 dimension size.
   */
  slicingDimsAndIndices: Array<{dim: number; index: number | null}>;

  /**
   * Which dimensions are used for viewing (i.e., rendered in the
   * tensor widget, as a table, by default.)
   *
   * Possible lengths of this array field:
   * - 0 for scalar tensors.
   * - 1 for 1D tensors.
   * - 2 for 2D+ tensors.
   */
  viewingDims: number[];

  /**
   * The indices from the first viewing dimension, which are shown as rows.
   *
   * The two numbers are beginning index (inclusive) and ending index
   * (exclusive).
   *
   * The `null` option at the value level is for rank < 1 (i.e., scalar),
   * where no row range selection is necessary.
   * The `null` in the 2nd element is for case in which the upper limit is not
   * determined.
   */
  verticalRange: [number, number | null] | null;

  /**
   * The indices from the second viewing dimension, which are shown as columns.
   *
   * The two numbers are beginning index (inclusive) and ending index
   * (exclusive).
   *
   * The `null` option at the value level is for rank < 2 (i.e., scalar or 1D
   * tensor), where no row range selection is necessary.
   * The `null` in the 2nd element is for case in which the upper limit is not
   * determined.
   */
  horizontalRange: [number, number | null] | null;

  /**
   * Optional dimension for depth.
   *
   * This supports visualization that requires a depth dimension, e.g.,
   * color channels.
   */
  depthDim?: number;
}

/** Options used during the creation of a single-tensor tensor widget. */
export interface TensorWidgetOptions {
  /** Name of the tensor (optional). */
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

  /**
   * Whether to use the Alt, Ctrl or Shift key with the mouse for zooming under
   * the image value-rendering mode.
   *
   * Defaults to Ctrl key ('ctrl').
   */
  wheelZoomKey?: 'alt' | 'ctrl' | 'shift';

  /** TODO(cais): Add support for custom tensor renderers. */
}

/**
 * A TensorWidget that interactively visualizes a single tensor.
 */
export interface TensorWidget {
  /**
   * Renders the GUI of the tensor widget.
   *
   * This method should be called only once after the tensor widget is
   * instantiated, or when the content of the underlying tensor has
   * changed.
   */
  render: () => Promise<void>;

  /**
   * Scroll along the horizontal dimension.
   *
   * I.e., whichever dimension that's selected as the horizontal viewing
   * dimension at the current time.
   *
   * The element at specified `index` will become the first element in the
   * horizontal dimension of the view, regardless of whether the element
   * is already in the view.
   *
   * @param index The index of the tensor view along the first
   *   dimensionas specified by the `viewingDims` of the tensor widget's
   *   current slicing spec.
   */
  scrollHorizontally: (index: number) => Promise<void>;

  /**
   * Scroll along the vertical dimension.
   *
   * I.e., whichever dimension that's selected as the vertical viewing
   * dimension at the current time.
   *
   * The element at specified `index` will become the first element in the
   * vertical dimension of the view, regardless of whether the element
   * is already in the view.
   *
   * @param index The index of the tensor view along the second
   *   dimensionas specified by the `viewingDims` of the tensor widget's
   *   current slicing spec.
   */
  scrollVertically: (index: number) => Promise<void>;

  /**
   * Navigate to specified indices.
   *
   * This is for the case in which the user wants to bring a specific
   * element of  given indices into the view, without the potentially tedious
   * process of selecting the slices and scrolling. Yes, this automatically
   * changes the scroll position and `slicingDimsAndIndices`.
   *
   * Throws Error if indices is out of bounds.
   */
  navigateToIndices: (indices: number[]) => Promise<void>;

  // TODO(cais): Add API for programmatically changing slicingSpec status.
  // TODO(cais): Add event listeners for slicingSpec change.
}

/**
 * Possible directions of movement.
 */
export enum MoveDirection {
  UP = 1,
  DOWN,
  LEFT,
  RIGHT,
}
