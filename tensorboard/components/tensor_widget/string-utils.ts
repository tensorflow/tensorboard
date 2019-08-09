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

/**
 * String utilities for TensorWidget.
 */

export const TENSOR_NAME_LENGTH_CUTOFF = 20;
export const ELLIPSES = '...';

/**
 * Format the name of a tensor for display.
 *
 * If the name is longer than `TENSOR_NAME_LENGTH_CUTOFF`. The middle part
 * of it will be replaced with ellipses.
 *
 * @param tensorName
 * @returns Formated tensor name.
 */
export function formatTensorName(tensorName: string): string {
  if (tensorName.length <= TENSOR_NAME_LENGTH_CUTOFF) {
    return tensorName;
  } else {
    const leadLength = Math.floor(TENSOR_NAME_LENGTH_CUTOFF / 2);
    const tailLength = TENSOR_NAME_LENGTH_CUTOFF - ELLIPSES.length - leadLength;
    return (
      tensorName.slice(0, leadLength) +
      ELLIPSES +
      tensorName.slice(tensorName.length - tailLength, tensorName.length)
    );
  }
}
