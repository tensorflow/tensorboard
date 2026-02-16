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
 * A summary of a tensor's element values.
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
export interface BaseTensorNumericSummary {
  /** Number of elements in the tensor. */
  elementCount: number;
}

export interface BooleanOrNumericTensorNumericSummary
  extends BaseTensorNumericSummary {
  /** Minimum of all finite values. */
  minimum: number | boolean;

  /** Maximum of all finite values. */
  maximum: number | boolean;
}

// TODO(cais): Add sub-interfaces of `BaseTensorNumericSummary` for other tensor
// dtypes.
