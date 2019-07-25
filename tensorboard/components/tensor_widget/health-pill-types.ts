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
 * Health pill: A summary of a tensor's element values.
 *
 * It contains information such as
 * - the distribution of the tensor's values among different value categories
 *   such as zero, negative, positive, infinity and NaN.
 * - basic summary statistics of the values like arithmetic mean, standard
 *   deviation, minimum and maximum.
 *
 * This base health-pill interface is general enough for all tensor
 * data types, including boolean, integer, float and string.
 */
export interface BaseTensorHealthPill {
  /** Number of elements in the tensor. */
  elementCount: number;
}

/**
 * Health-pill data for an integer-type or float-type tensor.
 * (e.g., int32, uint64, float32, float64).
 */
export interface IntOrFloatTensorHealthPill extends BaseTensorHealthPill {
  /** Number of elements that are zero. */
  zeroCount?: number;

  /** Number of elements that are negative. */
  negativeCount?: number;

  /** Number of elements that are positive. */
  positiveCount?: number;

  /** Number of elements that are -Infinity. */
  negativeInfinityCount?: number;

  /** Number of elements that are +Infinity. */
  positiveInfinityCount?: number;

  /** Number of elements that are NaN. */
  nanCount?: number;

  /**
   * Arithmetic mean of the elements.
   *
   * If there are Infinity or NaN elements in the tensor, those are
   * excluded from the calculation of the mean.
   * In the case there are no finite (i.e., non-Infinity and non-NaN)
   * elements, `mean` will be `null`.
   */
  mean: number|null;

  /**
   * Standard deviation of the elements.
   *
   * If there are Infinity or NaN elements in the tensor, those are
   * excluded from the calculation of the standard deviatoin.
   * In the case there are less than 2 finite (i.e., non-Infinity and non-NaN)
   * elements, `stdDev` will be `null`.
   */
  stdDev: number|null;

  /**
   * Minimum value of all non-NaN elements.
   *
   * If there are no non-NaN elements, minimum will be `null`.
   */
  minimum: number|null;

  /**
   * Minimum value of all non-NaN elements.
   *
   * If there are no non-NaN elements, maximum will be `null`.
   */
  maximum: number|null;
}

// TODO(cais): Add sub-interfaces of `BaseTensorHealthPill` for other tensor
// dtypes including bool an string.
