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

import {TensorDebugMode} from './debugger_types';
import {parseDebugTensorValue} from './debug_tensor_value';

describe('parseDebugTensorValue', () => {
  describe('CURT_HEALTH', () => {
    it('returns correct value if tensor has no inf or nan', () => {
      const debugValue = parseDebugTensorValue({
        tensorDebugMode: TensorDebugMode.CURT_HEALTH,
        array: [
          123, // tensor ID
          0, // has inf or nan?
        ],
      });
      expect(debugValue).toEqual({
        hasInfOrNaN: false,
      });
    });

    it('returns correct value if tensor has inf or nan', () => {
      const debugValue = parseDebugTensorValue({
        tensorDebugMode: TensorDebugMode.CURT_HEALTH,
        array: [
          123, // tensor ID
          1, // has inf or nan?
        ],
      });
      expect(debugValue).toEqual({
        hasInfOrNaN: true,
      });
    });

    for (const array of [null, [0], [0, 1, 1]]) {
      it(`throws error for null or wrong array arg: ${JSON.stringify(
        array
      )}`, () => {
        expect(() =>
          parseDebugTensorValue({
            tensorDebugMode: TensorDebugMode.CURT_HEALTH,
            array,
          })
        ).toThrowError(/CURT_HEALTH.*expect.*length 2/);
      });
    }
  });

  describe('CONCISE_HEALTH', () => {
    it('returns correct value if tensor is all healthy', () => {
      const debugValue = parseDebugTensorValue({
        tensorDebugMode: TensorDebugMode.CONCISE_HEALTH,
        array: [
          123,
          1000, // size
          0,
          0,
          0,
        ],
      });
      expect(debugValue).toEqual({
        size: 1000,
      });
    });

    it('returns correct value if tensor has nan', () => {
      const debugValue = parseDebugTensorValue({
        tensorDebugMode: TensorDebugMode.CONCISE_HEALTH,
        array: [
          123,
          1000, // size
          0,
          0,
          1,
        ],
      });
      expect(debugValue).toEqual({
        size: 1000,
        numNaNs: 1,
      });
    });

    it('returns correct value if tensor has neg inf', () => {
      const debugValue = parseDebugTensorValue({
        tensorDebugMode: TensorDebugMode.CONCISE_HEALTH,
        array: [123, 1000, 2, 0, 0],
      });
      expect(debugValue).toEqual({
        size: 1000,
        numNegativeInfs: 2,
      });
    });

    it('returns correct value if tensor has pos inf', () => {
      const debugValue = parseDebugTensorValue({
        tensorDebugMode: TensorDebugMode.CONCISE_HEALTH,
        array: [
          123,
          1000, // size
          0,
          22,
          0,
        ],
      });
      expect(debugValue).toEqual({
        size: 1000,
        numPositiveInfs: 22,
      });
    });

    it('returns correct value if tensor has nan, -inf and inf', () => {
      const debugValue = parseDebugTensorValue({
        tensorDebugMode: TensorDebugMode.CONCISE_HEALTH,
        array: [
          123,
          1000, // size
          10,
          20,
          30,
        ],
      });
      expect(debugValue).toEqual({
        size: 1000,
        numNegativeInfs: 10,
        numPositiveInfs: 20,
        numNaNs: 30,
      });
    });

    for (const array of [null, [0, 10, 0, 0], [0, 10, 0, 0, 0, 0]]) {
      it(`throws error for null or wrong array arg: ${JSON.stringify(
        array
      )}`, () => {
        expect(() =>
          parseDebugTensorValue({
            tensorDebugMode: TensorDebugMode.CONCISE_HEALTH,
            array,
          })
        ).toThrowError(/CONCISE_HEALTH.*expect.*length 5/);
      });
    }
  });

  describe('SHAPE', () => {
    it('returns correct value for 0D bool', () => {
      const debugValue = parseDebugTensorValue({
        tensorDebugMode: TensorDebugMode.SHAPE,
        array: [
          123,
          10, // bool
          0, // rank
          1, // size
          0,
          0,
          0,
          0,
          0,
          0,
        ],
      });
      expect(debugValue).toEqual({
        dtype: 'bool',
        rank: 0,
        size: 1,
        shape: [],
      });
    });

    it('returns correct value for 1D int32', () => {
      const debugValue = parseDebugTensorValue({
        tensorDebugMode: TensorDebugMode.SHAPE,
        array: [
          123,
          3, // int32
          1, // rank
          46, // size
          46,
          0,
          0,
          0,
          0,
          0,
        ],
      });
      expect(debugValue).toEqual({
        dtype: 'int32',
        rank: 1,
        size: 46,
        shape: [46],
      });
    });

    it('returns correct value for 2D float32', () => {
      const debugValue = parseDebugTensorValue({
        tensorDebugMode: TensorDebugMode.SHAPE,
        array: [
          123,
          1, // float32
          2, // rank
          1200,
          30,
          40,
          0,
          0,
          0,
          0,
        ],
      });
      expect(debugValue).toEqual({
        dtype: 'float32',
        rank: 2,
        size: 1200,
        shape: [30, 40],
      });
    });

    it('returns correct value for 6D float64', () => {
      const debugValue = parseDebugTensorValue({
        tensorDebugMode: TensorDebugMode.SHAPE,
        array: [
          123,
          2, // float64
          6, // rank
          1200,
          1,
          2,
          3,
          4,
          5,
          10,
        ],
      });
      expect(debugValue).toEqual({
        dtype: 'float64',
        rank: 6,
        size: 1200,
        shape: [1, 2, 3, 4, 5, 10],
      });
    });

    it('returns correct value for truncated shape: 7D', () => {
      const debugValue = parseDebugTensorValue({
        tensorDebugMode: TensorDebugMode.SHAPE,
        array: [
          123,
          5, // int16
          7, // rank 7
          1200,
          3,
          4,
          1,
          2,
          1,
          5,
        ],
      });
      expect(debugValue).toEqual({
        dtype: 'int16',
        rank: 7,
        size: 1200,
        // Truncated dimensions are filled with `undefined`s.
        shape: [undefined, 3, 4, 1, 2, 1, 5],
      });
    });

    it('returns correct value for truncated shape: 8D', () => {
      const debugValue = parseDebugTensorValue({
        tensorDebugMode: TensorDebugMode.SHAPE,
        array: [
          123,
          1, // float32
          8, // rank 8
          1200,
          3,
          4,
          1,
          2,
          1,
          5,
        ],
      });
      expect(debugValue).toEqual({
        dtype: 'float32',
        rank: 8,
        size: 1200,
        // Truncated dimensions are filled with `undefined`s.
        shape: [undefined, undefined, 3, 4, 1, 2, 1, 5],
      });
    });

    for (const array of [
      null,
      [123, 1, 8, 1200, 3, 4, 1, 2, 1],
      [123, 1, 8, 1200, 3, 4, 1, 2, 1, 5, 6],
    ]) {
      it(`throws error for null or wrong array arg: ${JSON.stringify(
        array
      )}`, () => {
        expect(() =>
          parseDebugTensorValue({tensorDebugMode: TensorDebugMode.SHAPE, array})
        ).toThrowError(/SHAPE.*expect.*length 10/);
      });
    }
  });

  describe('FULL_HEALTH', () => {
    it('returns correct value for float32 2D with no inf or nan', () => {
      const debugValue = parseDebugTensorValue({
        tensorDebugMode: TensorDebugMode.FULL_HEALTH,
        array: [
          123,
          0,
          1, // float32
          2, // rank
          600, // size
          0,
          0,
          0,
          100,
          200,
          300,
        ],
      });
      expect(debugValue).toEqual({
        dtype: 'float32',
        rank: 2,
        size: 600,
        numNegativeFinites: 100,
        numZeros: 200,
        numPositiveFinites: 300,
      });
    });

    it('returns correct value for float64 scalar nan', () => {
      const debugValue = parseDebugTensorValue({
        tensorDebugMode: TensorDebugMode.FULL_HEALTH,
        array: [
          123,
          0,
          2, // float64
          0, // rank
          1, // size
          0,
          0,
          1,
          0,
          0,
          0,
        ],
      });
      expect(debugValue).toEqual({
        dtype: 'float64',
        rank: 0,
        size: 1,
        numNaNs: 1,
      });
    });

    it('returns correct value for bfloat16 1D with -inf and +inf', () => {
      const debugValue = parseDebugTensorValue({
        tensorDebugMode: TensorDebugMode.FULL_HEALTH,
        array: [
          123,
          0,
          14, // bfloat16
          1, // rank
          10, // size
          3,
          7,
          0,
          0,
          0,
          0,
        ],
      });
      expect(debugValue).toEqual({
        dtype: 'bfloat16',
        rank: 1,
        size: 10,
        numNegativeInfs: 3,
        numPositiveInfs: 7,
      });
    });

    for (const array of [
      null,
      [123, 0, 14, 1, 10, 3, 7, 0, 0, 0],
      [123, 0, 14, 1, 10, 3, 7, 0, 0, 0, 0, 0],
    ]) {
      it(`throws error for null or wrong array arg: ${JSON.stringify(
        array
      )}`, () => {
        expect(() =>
          parseDebugTensorValue({
            tensorDebugMode: TensorDebugMode.FULL_HEALTH,
            array,
          })
        ).toThrowError(/FULL_HEALTH.*expect.*length 11/);
      });
    }
  });

  describe('NO_TENSOR', () => {
    it('returns empty object', () => {
      expect(
        parseDebugTensorValue({
          tensorDebugMode: TensorDebugMode.NO_TENSOR,
          array: null,
        })
      ).toEqual({});
    });

    for (const array of [[], [0]]) {
      it(`throws error for non-null array arg: ${JSON.stringify(
        array
      )}`, () => {
        expect(() =>
          parseDebugTensorValue({
            tensorDebugMode: TensorDebugMode.NO_TENSOR,
            array,
          })
        ).toThrowError(/non-null.*NO_TENSOR/);
      });
    }
  });

  describe('FULL_TENSOR', () => {
    it('returns empty object', () => {
      expect(
        parseDebugTensorValue({
          tensorDebugMode: TensorDebugMode.FULL_TENSOR,
          array: null,
        })
      ).toEqual({});
    });

    for (const array of [[], [0]]) {
      it(`throws error for non-null array arg: ${JSON.stringify(
        array
      )}`, () => {
        expect(() =>
          parseDebugTensorValue({
            tensorDebugMode: TensorDebugMode.FULL_TENSOR,
            array,
          })
        ).toThrowError(/non-null.*FULL_TENSOR/);
      });
    }
  });

  describe('Invalid TensorDebugMode', () => {
    for (const debugMode of [
      null,
      undefined,
      NaN,
      TensorDebugMode.UNSPECIFIED,
    ]) {
      it('throws error', () => {
        expect(() =>
          parseDebugTensorValue({
            tensorDebugMode: debugMode as TensorDebugMode,
            array: null,
          })
        ).toThrowError();
      });
    }
  });
});
