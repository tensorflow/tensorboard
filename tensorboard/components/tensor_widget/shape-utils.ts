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

import {Shape, TensorViewSlicingSpec} from './types';

/**
 * Tensor shape utilities for tensor widget.
 */

/** Compute total element count based on shape. */
export function numElements(shape: Shape): number {
  let output = 1;
  shape.forEach((dimSize) => {
    output *= dimSize;
  });
  return output;
}

/**
 * Format tensor shape as a string for display.
 *
 * The special case of empty shape ([]) is formatted as the more human-readable
 * name "scalar".
 *
 * @param shape
 * @returns A human-understandable string that describes tensor shape.
 */
export function formatShapeForDisplay(shape: Shape): string {
  if (shape.length === 0) {
    return 'scalar';
  } else {
    return `[${shape}]`;
  }
}

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
export function getDefaultSlicingSpec(shape: Shape): TensorViewSlicingSpec {
  const slicingSpec: TensorViewSlicingSpec = {
    slicingDimsAndIndices: [],
    viewingDims: [],
    // The vertical and horizontal ranges are left undetermined. They will
    // be determined by the widget during rendering.
    verticalRange: null,
    horizontalRange: null,
  };

  const rank = shape.length;
  if (rank === 1) {
    // A 1D tensor: no slicing is applied.
    slicingSpec.viewingDims = [0];
  } else if (rank > 1) {
    // Slicing dimensions.
    if (rank > 2) {
      // A tensor >2D: slice along the first (rank - 2) dimensions and view
      // along the last 2 dimensions.
      for (let i = 0; i < rank - 2; ++i) {
        slicingSpec.slicingDimsAndIndices.push({
          dim: i,
          index: shape[i] === 0 ? null : 0,
        });
      }
    }

    // Viewing dimensions for tensors 2D or up.
    for (let i = shape.length - 2; i < shape.length; ++i) {
      slicingSpec.viewingDims.push(i);
    }
  }
  return slicingSpec;
}

/**
 * Check if two slicing specs involve the compatible dimension arrangements.
 *
 * "Compatible dimension arrangement" means the same dimensions are used
 * for viewing and the same dimensions are used for slicing.
 *
 * Note that the slicing indicies in the slicing dimensions are ignored.
 * So are the ordering of the slicing dimensions.
 *
 * @param spec0
 * @param spec1
 * @return `true` if and only if the slicing dimensions and the viewing
 *   dimensions are compatible between `spec0` and `spec1`.
 */
export function areSlicingSpecsCompatible(
  spec0: TensorViewSlicingSpec,
  spec1: TensorViewSlicingSpec
): boolean {
  if (spec0.viewingDims[0] !== spec1.viewingDims[0]) {
    return false;
  } else if (spec0.viewingDims[1] !== spec1.viewingDims[1]) {
    return false;
  } else {
    // Check the slicing dimension.
    const slicingDims0 = spec0.slicingDimsAndIndices.map(
      (dimAndIndex) => dimAndIndex.dim
    );
    slicingDims0.sort();
    const slicingDims1 = spec0.slicingDimsAndIndices.map(
      (dimAndIndex) => dimAndIndex.dim
    );
    slicingDims1.sort();
    return JSON.stringify(slicingDims0) === JSON.stringify(slicingDims1);
  }
}
