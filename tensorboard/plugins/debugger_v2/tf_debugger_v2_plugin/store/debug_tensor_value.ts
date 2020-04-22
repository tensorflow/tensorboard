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

export function parseDebugTensorValue(
  tensorDebugMode: TensorDebugMode,
  vector: number[]
): DebugTensorValue {
  switch (tensorDebugMode) {
    case TensorDebugMode.NO_TENSOR: {
      return {};
    }
    case TensorDebugMode.CURT_HEALTH: {
      return {
        hasInfOrNaN: Boolean(vector[1]),
      };
    }
    case TensorDebugMode.CONCISE_HEALTH: {
      const value: DebugTensorValue = {
        size: vector[1],
      };
      if (vector[2] > 0) {
        value.numNaNs = vector[2];
      }
      if (vector[3] > 0) {
        value.numNegativeInfs = vector[3];
      }
      if (vector[4] > 0) {
        value.numPositiveInfs = vector[4];
      }
      return value;
    }
    case TensorDebugMode.SHAPE: {
      const rank = vector[2];
      return {
        dtype: DTYPE_ENUM_TO_NAME[vector[1]],
        rank,
        size: vector[3],
        shape: vector.slice(4, 4 + rank),
      };
    }
    default: {
      throw new Error(`Unrecognized tensorDebugMode: ${tensorDebugMode}`);
    }
  }
}
