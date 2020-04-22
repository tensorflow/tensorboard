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

import {DTYPE_ENUM_TO_NAME} from '../tf_dtypes';
import {DebugTensorValue, TensorDebugMode} from './debugger_types';

/**
 * Parse a number array that represents debugging summary of an instrumented
 * tensor value.
 *
 * @param tensorDebugMode Tensor-debug mode.
 * @param array The array of number that represents various aspect of the
 *   instrumented tensor. The semantics of the numbers are determined by
 *   `tensorDebugModel`.
 * @returns A DebugTensorValue object with the same information as
 *   carried by `array`, but represented in a more explicit fashion.
 *   For numbers that represent breakdown of numeric values by type
 *   (e.g., counts of -inf, +inf and nan), the corresponding fields
 *   in the returned object will be defined only of the count is non-zero.
 */
export function parseDebugTensorValue(
  tensorDebugMode: TensorDebugMode,
  array: number[] | null
): DebugTensorValue {
  switch (tensorDebugMode) {
    case TensorDebugMode.NO_TENSOR: {
      return {};
    }
    case TensorDebugMode.CURT_HEALTH: {
      return {
        hasInfOrNaN: Boolean(array![1]),
      };
    }
    case TensorDebugMode.CONCISE_HEALTH: {
      const value: DebugTensorValue = {
        size: array![1],
      };
      if (array![2] > 0) {
        value.numNaNs = array![2];
      }
      if (array![3] > 0) {
        value.numNegativeInfs = array![3];
      }
      if (array![4] > 0) {
        value.numPositiveInfs = array![4];
      }
      return value;
    }
    case TensorDebugMode.SHAPE: {
      const rank = array![2];
      return {
        dtype: DTYPE_ENUM_TO_NAME[array![1]],
        rank,
        size: array![3],
        shape: array!.slice(4, 4 + rank),
      };
    }
    case TensorDebugMode.FULL_HEALTH: {
      const rank = array![3];
      const value: DebugTensorValue = {
        dtype: DTYPE_ENUM_TO_NAME[array![2]],
        rank,
        size: array![4],
      };
      if (array![5] > 0) {
        value.numNegativeInfs = array![5];
      }
      if (array![6] > 0) {
        value.numPositiveInfs = array![6];
      }
      if (array![7] > 0) {
        value.numNaNs = array![7];
      }
      if (array![8] > 0) {
        value.numNegativeFinites = array![8];
      }
      if (array![9] > 0) {
        value.numZeros = array![9];
      }
      if (array![10] > 0) {
        value.numPositiveFinites = array![10];
      }
      return value;
    }
    case TensorDebugMode.FULL_TENSOR: {
      // Under FULL_TENSOR mode, the full tensor value is supplied via
      // separate means. No summary values are provided for the tensor value.
      return {};
    }
    default: {
      throw new Error(`Unrecognized tensorDebugMode: ${tensorDebugMode}`);
    }
  }
}
