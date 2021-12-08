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

import {
  areSlicingSpecsCompatible,
  formatShapeForDisplay,
  getDefaultSlicingSpec,
  numElements,
} from './shape-utils';
import {TensorViewSlicingSpec} from './types';

describe('size', () => {
  it('scalar', () => {
    expect(numElements([])).toBe(1);
  });

  it('1D', () => {
    expect(numElements([3])).toBe(3);
    expect(numElements([0])).toBe(0);
  });

  it('2D', () => {
    expect(numElements([3, 4])).toBe(12);
    expect(numElements([3, 0])).toBe(0);
    expect(numElements([0, 3])).toBe(0);
  });

  it('3D', () => {
    expect(numElements([3, 4, 5])).toBe(60);
    expect(numElements([3, 0, 5])).toBe(0);
    expect(numElements([0, 4, 5])).toBe(0);
  });

  it('4D', () => {
    expect(numElements([2, 3, 4, 5])).toBe(120);
    expect(numElements([2, 3, 0, 5])).toBe(0);
  });
});

describe('formatShapeForDisplay', () => {
  it('returns string scalar for []', () => {
    expect(formatShapeForDisplay([])).toBe('scalar');
  });

  it('returns array strings for non-scalar shapes', () => {
    expect(formatShapeForDisplay([0])).toBe('[0]');
    expect(formatShapeForDisplay([12])).toBe('[12]');
    expect(formatShapeForDisplay([4, 8])).toBe('[4,8]');
    expect(formatShapeForDisplay([1, 32, 8])).toBe('[1,32,8]');
    expect(formatShapeForDisplay([8, 32, 32, 128])).toBe('[8,32,32,128]');
    expect(formatShapeForDisplay([0, 8, 32, 32, 128])).toBe('[0,8,32,32,128]');
  });
});

describe('getDefaultSlicingSpec', () => {
  it('returns correct result for scalar shape', () => {
    expect(getDefaultSlicingSpec([])).toEqual({
      slicingDimsAndIndices: [],
      viewingDims: [],
      verticalRange: null,
      horizontalRange: null,
    });
  });

  it('returns correct result for 1D shape', () => {
    expect(getDefaultSlicingSpec([10])).toEqual({
      slicingDimsAndIndices: [],
      viewingDims: [0],
      verticalRange: null,
      horizontalRange: null,
    });
  });

  it('returns correct result for 2D shape', () => {
    expect(getDefaultSlicingSpec([4, 5])).toEqual({
      slicingDimsAndIndices: [],
      viewingDims: [0, 1],
      verticalRange: null,
      horizontalRange: null,
    });
  });

  it('returns correct result for 3D shape', () => {
    expect(getDefaultSlicingSpec([4, 5, 6])).toEqual({
      slicingDimsAndIndices: [
        {
          dim: 0,
          index: 0,
        },
      ],
      viewingDims: [1, 2],
      verticalRange: null,
      horizontalRange: null,
    });
  });

  it('returns correct result for 4D shape', () => {
    expect(getDefaultSlicingSpec([4, 5, 6, 7])).toEqual({
      slicingDimsAndIndices: [
        {
          dim: 0,
          index: 0,
        },
        {
          dim: 1,
          index: 0,
        },
      ],
      viewingDims: [2, 3],
      verticalRange: null,
      horizontalRange: null,
    });
  });

  it('returns correct result for 5D shape', () => {
    expect(getDefaultSlicingSpec([4, 5, 6, 7, 8])).toEqual({
      slicingDimsAndIndices: [
        {
          dim: 0,
          index: 0,
        },
        {
          dim: 1,
          index: 0,
        },
        {
          dim: 2,
          index: 0,
        },
      ],
      viewingDims: [3, 4],
      verticalRange: null,
      horizontalRange: null,
    });
  });
});

describe('dimensionsDiffer', () => {
  it('Different orders in slicing dimensions are ignored', () => {
    const spec0: TensorViewSlicingSpec = {
      slicingDimsAndIndices: [
        {
          dim: 0,
          index: 0,
        },
        {
          dim: 1,
          index: 0,
        },
      ],
      viewingDims: [2, 3],
      verticalRange: null,
      horizontalRange: null,
    };
    const spec1: TensorViewSlicingSpec = {
      slicingDimsAndIndices: [
        {
          dim: 1,
          index: 0,
        },
        {
          dim: 0,
          index: 0,
        },
      ],
      viewingDims: [2, 3],
      verticalRange: null,
      horizontalRange: null,
    };
    expect(areSlicingSpecsCompatible(spec0, spec1)).toBe(true);
  });

  it('Different slicing indices are ignored', () => {
    const spec0: TensorViewSlicingSpec = {
      slicingDimsAndIndices: [
        {
          dim: 0,
          index: 8,
        },
        {
          dim: 1,
          index: 0,
        },
      ],
      viewingDims: [2, 3],
      verticalRange: null,
      horizontalRange: null,
    };
    const spec1: TensorViewSlicingSpec = {
      slicingDimsAndIndices: [
        {
          dim: 0,
          index: 0,
        },
        {
          dim: 1,
          index: 9,
        },
      ],
      viewingDims: [2, 3],
      verticalRange: null,
      horizontalRange: null,
    };
    expect(areSlicingSpecsCompatible(spec0, spec1)).toBe(true);
  });

  it('Different slicing and viewing dimensions are captured', () => {
    const spec0: TensorViewSlicingSpec = {
      slicingDimsAndIndices: [
        {
          dim: 0,
          index: 0,
        },
        {
          dim: 3,
          index: 0,
        },
      ],
      viewingDims: [1, 2],
      verticalRange: null,
      horizontalRange: null,
    };
    const spec1: TensorViewSlicingSpec = {
      slicingDimsAndIndices: [
        {
          dim: 0,
          index: 0,
        },
        {
          dim: 1,
          index: 0,
        },
      ],
      viewingDims: [2, 3],
      verticalRange: null,
      horizontalRange: null,
    };
    expect(areSlicingSpecsCompatible(spec0, spec1)).toBe(false);
  });
});
