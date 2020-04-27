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

export interface RawDebugTensorValue {
  tensorDebugMode: TensorDebugMode;
  array: null | number[];
}

export interface RawDebugTensorValueNoTensor extends RawDebugTensorValue {
  tensorDebugMode: TensorDebugMode.NO_TENSOR;
  array: null;
}

export interface RawDebugTensorValueCurtHealth extends RawDebugTensorValue {
  tensorDebugMode: TensorDebugMode.CURT_HEALTH;
  array: [
    number, // Tensor ID.
    number // 0-1 indicator for the presence of inf/nan.
  ];
}

export interface RawDebugTensorValueConciseHealth extends RawDebugTensorValue {
  tensorDebugMode: TensorDebugMode.CURT_HEALTH;
  array: [
    number, // Tensor ID.
    number, // Element count (size).
    number, // -inf count.
    number, // +inf count.
    number // nan count.
  ];
}

export interface RawDebugTensorValueShape extends RawDebugTensorValue {
  tensorDebugMode: TensorDebugMode.SHAPE;
  array: [
    number, // Tensor ID.
    number, // DType enum value.
    number, // Rank.
    number, // Size.
    number, // Shape truncated at head to a maximum length of 6.
    number,
    number,
    number,
    number,
    number
  ];
}

export interface RawDebugTensorValueFullHealth extends RawDebugTensorValue {
  tensorDebugMode: TensorDebugMode.FULL_HEALTH;
  array: [
    number, // Tensor ID.
    number, // Device ID.
    number, // DType enum value.
    number, // Rank.
    number, // Size.
    number, // -inf count.
    number, // +inf count.
    number, // nan count.
    number, // -finite count.
    number, // zero count.
    number // +finite count.
  ];
}

export interface RawDebugTensorValueFullTensor extends RawDebugTensorValue {
  tensorDebugMode: TensorDebugMode.FULL_HEALTH;
  array: null;
}

/**
 * Parse a number array that represents debugging summary of an instrumented
 * tensor value.
 *
 * @param tensorDebugMode and the array of number that represents various
 *   aspect of the instrumented tensor. The semantics of the numbers are
 *   determined by `tensorDebugMode`.
 * @returns A DebugTensorValue object with the same information as
 *   carried by `array`, but represented in a more explicit fashion.
 *   For numbers that represent breakdown of numeric values by type
 *   (e.g., counts of -inf, +inf and nan), the corresponding fields
 *   in the returned object will be defined only if the count is non-zero.
 */
export function parseDebugTensorValue(
  raw: RawDebugTensorValue
): DebugTensorValue {
  const {tensorDebugMode, array} = raw;
  switch (tensorDebugMode) {
    case TensorDebugMode.NO_TENSOR: {
      if (array !== null) {
        throw new Error(
          'Unexpectedly received non-null debug-tensor-value array ' +
            'under NO_TENSOR mode'
        );
      }
      return {};
    }
    case TensorDebugMode.CURT_HEALTH: {
      if (array === null || array.length !== 2) {
        throw new Error(
          `Under CURT_HEALTH mode, expected debug-tensor-value array ` +
            `to have length 2, but got ${JSON.stringify(array)}`
        );
      }
      return {
        hasInfOrNaN: Boolean(array[1]),
      };
    }
    case TensorDebugMode.CONCISE_HEALTH: {
      if (array === null || array.length !== 5) {
        throw new Error(
          `Under CONCISE_HEALTH mode, expected debug-tensor-value array ` +
            `to have length 5, but got ${JSON.stringify(array)}`
        );
      }
      const value: DebugTensorValue = {
        size: array[1],
      };
      if (array[2] > 0) {
        value.numNegativeInfs = array[2];
      }
      if (array[3] > 0) {
        value.numPositiveInfs = array[3];
      }
      if (array[4] > 0) {
        value.numNaNs = array[4];
      }
      return value;
    }
    case TensorDebugMode.SHAPE: {
      if (array === null || array.length !== 10) {
        throw new Error(
          `Under SHAPE mode, expected debug-tensor-value array ` +
            `to have length 10, but got ${JSON.stringify(array)}`
        );
      }
      const rank = array[2];
      let shape: number[] = array.slice(4, Math.min(4 + rank, array.length));
      if (shape.length < rank) {
        // The SHAPE mode truncates the shape at head.
        shape = new Array<number>(rank - shape.length).concat(shape);
      }
      return {
        dtype: DTYPE_ENUM_TO_NAME[array[1]],
        rank,
        size: array[3],
        shape,
      };
    }
    case TensorDebugMode.FULL_HEALTH: {
      if (array === null || array.length !== 11) {
        throw new Error(
          `Under FULL_HEALTH mode, expected debug-tensor-value array ` +
            `to have length 11, but got ${JSON.stringify(array)}`
        );
      }
      const rank = array[3];
      const value: DebugTensorValue = {
        dtype: DTYPE_ENUM_TO_NAME[array[2]],
        rank,
        size: array[4],
      };
      if (array[5] > 0) {
        value.numNegativeInfs = array[5];
      }
      if (array[6] > 0) {
        value.numPositiveInfs = array[6];
      }
      if (array[7] > 0) {
        value.numNaNs = array[7];
      }
      if (array[8] > 0) {
        value.numNegativeFinites = array[8];
      }
      if (array[9] > 0) {
        value.numZeros = array[9];
      }
      if (array[10] > 0) {
        value.numPositiveFinites = array[10];
      }
      return value;
    }
    case TensorDebugMode.FULL_TENSOR: {
      // Under FULL_TENSOR mode, the full tensor value is supplied via
      // separate means. No summary values are provided for the tensor value.
      if (array !== null) {
        throw new Error(
          'Unexpectedly received non-null debug-tensor-value array ' +
            'under FULL_TENSOR mode'
        );
      }
      return {};
    }
    default: {
      throw new Error(`Unrecognized tensorDebugMode: ${tensorDebugMode}`);
    }
  }
}
