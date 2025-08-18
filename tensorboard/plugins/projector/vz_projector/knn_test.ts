/* Copyright 2021 The TensorFlow Authors. All Rights Reserved.

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
import {findKNN, findKNNGPUCosDistNorm, NearestEntry} from './knn';
import {cosDistNorm, unit} from './vector';

describe('projector knn test', () => {
  function getIndices(nearest: NearestEntry[][]): number[][] {
    return nearest.map((nNearest) => {
      return nNearest.map(({index}) => index);
    });
  }

  function unitVector(vector: Float32Array): Float32Array {
    // `unit` method replaces the vector in-place.
    unit(vector);
    return vector;
  }

  describe('#findKNNGPUCosDistNorm', () => {
    it('finds n-nearest neighbor for each item', async () => {
      const values = await findKNNGPUCosDistNorm(
        [
          {a: unitVector(new Float32Array([1, 2, 0]))},
          {a: unitVector(new Float32Array([1, 1, 3]))},
          {a: unitVector(new Float32Array([100, 30, 0]))},
          {a: unitVector(new Float32Array([95, 23, 3]))},
          {a: unitVector(new Float32Array([100, 10, 0]))},
          {a: unitVector(new Float32Array([95, 23, 100]))},
        ],
        4,
        (data) => data.a
      );

      expect(getIndices(values)).toEqual([
        [2, 3, 4, 5],
        [5, 0, 3, 2],
        [3, 4, 5, 0],
        [2, 4, 5, 0],
        [3, 2, 5, 0],
        [1, 3, 2, 4],
      ]);
    });

    it('returns less than N when number of item is lower', async () => {
      const values = await findKNNGPUCosDistNorm(
        [
          unitVector(new Float32Array([1, 2, 0])),
          unitVector(new Float32Array([1, 1, 3])),
        ],
        4,
        (a) => a
      );

      expect(getIndices(values)).toEqual([[1], [0]]);
    });
  });

  describe('#findKNN', () => {
    // Covered by equality tests below (#findKNNGPUCosDistNorm == #findKNN).
  });

  describe('#findKNNGPUCosDistNorm and #findKNN', () => {
    it('returns same value when dist metrics are cosine', async () => {
      const data = [
        unitVector(new Float32Array([1, 2, 0])),
        unitVector(new Float32Array([1, 1, 3])),
        unitVector(new Float32Array([100, 30, 0])),
        unitVector(new Float32Array([95, 23, 3])),
        unitVector(new Float32Array([100, 10, 0])),
        unitVector(new Float32Array([95, 23, 100])),
      ];
      const findKnnGpuCosVal = await findKNNGPUCosDistNorm(data, 2, (a) => a);
      const findKnnVal = await findKNN(
        data,
        2,
        (a) => a,
        (a, b, limit) => cosDistNorm(a, b)
      );

      // Floating point precision makes it hard to test. Just assert indices.
      expect(getIndices(findKnnGpuCosVal)).toEqual(getIndices(findKnnVal));
    });
  });
});
