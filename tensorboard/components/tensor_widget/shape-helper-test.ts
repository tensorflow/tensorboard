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

import {getDefaultSlicingSpec} from './shape-helper';

describe('getDefaultSlicingSpec', () => {
  it('0D', () => {
    const shape: number[] = [];
    const slicingSpec = getDefaultSlicingSpec(shape);
    expect(slicingSpec.slicingDimsAndIndices).toEqual([]);
    expect(slicingSpec.viewingDims).toEqual([]);
  });

  it('1D non-empty', () => {
    const shape: number[] = [10];
    const slicingSpec = getDefaultSlicingSpec(shape);
    expect(slicingSpec.slicingDimsAndIndices).toEqual([]);
    expect(slicingSpec.viewingDims).toEqual([0]);
  });

  it('1D empty', () => {
    const shape: number[] = [0];
    const slicingSpec = getDefaultSlicingSpec(shape);
    expect(slicingSpec.slicingDimsAndIndices).toEqual([]);
    expect(slicingSpec.viewingDims).toEqual([0]);
  });

  it('2D non-empty', () => {
    const shape: number[] = [10, 20];
    const slicingSpec = getDefaultSlicingSpec(shape);
    expect(slicingSpec.slicingDimsAndIndices).toEqual([]);
    expect(slicingSpec.viewingDims).toEqual([0, 1]);
  });

  it('2D empty', () => {
    const shape: number[] = [0, 0];
    const slicingSpec = getDefaultSlicingSpec(shape);
    expect(slicingSpec.slicingDimsAndIndices).toEqual([]);
    expect(slicingSpec.viewingDims).toEqual([0, 1]);
  });

  it('3D non-empty', () => {
    const shape: number[] = [10, 20, 30];
    const slicingSpec = getDefaultSlicingSpec(shape);
    expect(slicingSpec.slicingDimsAndIndices).toEqual([{dim: 0, index: 0}]);
    expect(slicingSpec.viewingDims).toEqual([1, 2]);
  });

  it('3D empty', () => {
    const shape: number[] = [0, 20, 30];
    const slicingSpec = getDefaultSlicingSpec(shape);
    expect(slicingSpec.slicingDimsAndIndices).toEqual([{dim: 0, index: null}]);
    expect(slicingSpec.viewingDims).toEqual([1, 2]);
  });

  it('4D non-empty', () => {
    const shape: number[] = [10, 20, 30, 40];
    const slicingSpec = getDefaultSlicingSpec(shape);
    expect(slicingSpec.slicingDimsAndIndices).toEqual([
        {dim: 0, index: 0}, {dim: 1, index: 0}]);
    expect(slicingSpec.viewingDims).toEqual([2, 3]);
  });

  it('4D non-empty', () => {
    const shape: number[] = [10, 0, 30, 40];
    const slicingSpec = getDefaultSlicingSpec(shape);
    expect(slicingSpec.slicingDimsAndIndices).toEqual([
        {dim: 0, index: 0}, {dim: 1, index: null}]);
    expect(slicingSpec.viewingDims).toEqual([2, 3]);
  });

  it('5D non-empty', () => {
    const shape: number[] = [10, 20, 30, 40, 50];
    const slicingSpec = getDefaultSlicingSpec(shape);
    expect(slicingSpec.slicingDimsAndIndices).toEqual([
        {dim: 0, index: 0}, {dim: 1, index: 0}, {dim: 2, index: 0}]);
    expect(slicingSpec.viewingDims).toEqual([3, 4]);
  });
});
