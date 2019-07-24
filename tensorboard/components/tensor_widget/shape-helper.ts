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

import {TensorViewSlicingSpec} from './types';

/**
 * Get the default slicing spec given a tensor shape.
 *
 * For an N-dimensional tensor, where N > 2, the first N - 2 dimensions
 * are each sliced down to a size of one, while the remaining 2 dimensions
 * are used for viewing.
 *
 * @param shape Shape of the tensor in question.
 * @return The default slicing spec.
 */
export function getDefaultSlicingSpec(shape: ReadonlyArray<number>):
    TensorViewSlicingSpec {
  const slicingSpec: TensorViewSlicingSpec = {
    slicingDimsAndIndices: [],
    viewingDims: [],
    // The vertical and horizontal ranges are left undetermined. They will
    // be determined by the widget during rendering.
    verticalRange: null,
    horizontalRange: null
  };

  if (shape.length === 1) {
    slicingSpec.viewingDims = [0];
  } else if (shape.length > 1) {
    // Slicing dimensions.
    if (shape.length > 2) {
      for (let i = 0; i < shape.length - 2; ++i) {
        slicingSpec.slicingDimsAndIndices.push({
          dim: i,
          index: shape[i] === 0 ? null : 0
        });
      }
    }

    // Viewing dimensions.
    for (let i = shape.length - 2; i < shape.length; ++i) {
      slicingSpec.viewingDims.push(i);
    }
  }
  return slicingSpec;
}