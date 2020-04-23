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
    it('has no inf or nan', () => {
      const debugValue = parseDebugTensorValue(TensorDebugMode.CURT_HEALTH, [
        123, // tensor ID
        0, // has inf or nan?
      ]);
      expect(debugValue).toEqual({
        hasInfOrNaN: false,
      });
    });

    it('has inf or nan', () => {
      const debugValue = parseDebugTensorValue(TensorDebugMode.CURT_HEALTH, [
        123, // tensor ID
        1, // has inf or nan?
      ]);
      expect(debugValue).toEqual({
        hasInfOrNaN: true,
      });
    });
  });

  describe('CONCISE_HEALTH', () => {
    it('all healthy', () => {
      const debugValue = parseDebugTensorValue(TensorDebugMode.CONCISE_HEALTH, [
        123,
        1000, // size
        0,
        0,
        0,
      ]);
      expect(debugValue).toEqual({
        size: 1000,
      });
    });

    it('has nan', () => {
      const debugValue = parseDebugTensorValue(TensorDebugMode.CONCISE_HEALTH, [
        123,
        1000, // size
        1,
        0,
        0,
      ]);
      expect(debugValue).toEqual({
        size: 1000,
        numNaNs: 1,
      });
    });

    it('has neg inf', () => {
      const debugValue = parseDebugTensorValue(TensorDebugMode.CONCISE_HEALTH, [
        123,
        1000,
        0,
        2,
        0,
      ]);
      expect(debugValue).toEqual({
        size: 1000,
        numNegativeInfs: 2,
      });
    });

    it('has pos inf', () => {
      const debugValue = parseDebugTensorValue(TensorDebugMode.CONCISE_HEALTH, [
        123,
        1000, // size
        0,
        0,
        22,
      ]);
      expect(debugValue).toEqual({
        size: 1000,
        numPositiveInfs: 22,
      });
    });

    it('full house', () => {
      const debugValue = parseDebugTensorValue(TensorDebugMode.CONCISE_HEALTH, [
        123,
        1000, // size
        10,
        20,
        30,
      ]);
      expect(debugValue).toEqual({
        size: 1000,
        numNaNs: 10,
        numNegativeInfs: 20,
        numPositiveInfs: 30,
      });
    });
  });

  describe('SHAPE', () => {
    it('0D bool', () => {
      const debugValue = parseDebugTensorValue(TensorDebugMode.SHAPE, [
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
      ]);
      expect(debugValue).toEqual({
        dtype: 'bool',
        rank: 0,
        size: 1,
        shape: [],
      });
    });

    it('1D int32', () => {
      const debugValue = parseDebugTensorValue(TensorDebugMode.SHAPE, [
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
      ]);
      expect(debugValue).toEqual({
        dtype: 'int32',
        rank: 1,
        size: 46,
        shape: [46],
      });
    });

    it('2D float32', () => {
      const debugValue = parseDebugTensorValue(TensorDebugMode.SHAPE, [
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
      ]);
      expect(debugValue).toEqual({
        dtype: 'float32',
        rank: 2,
        size: 1200,
        shape: [30, 40],
      });
    });

    it('6D float64', () => {
      const debugValue = parseDebugTensorValue(TensorDebugMode.SHAPE, [
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
      ]);
      expect(debugValue).toEqual({
        dtype: 'float64',
        rank: 6,
        size: 1200,
        shape: [1, 2, 3, 4, 5, 10],
      });
    });

    it('truncated shape: 7D', () => {
      const debugValue = parseDebugTensorValue(TensorDebugMode.SHAPE, [
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
      ]);
      expect(debugValue).toEqual({
        dtype: 'int16',
        rank: 7,
        size: 1200,
        // Truncated dimensions are filled with `undefined`s.
        shape: [undefined, 3, 4, 1, 2, 1, 5],
      });
    });

    it('truncated shape: 8D', () => {
      const debugValue = parseDebugTensorValue(TensorDebugMode.SHAPE, [
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
      ]);
      expect(debugValue).toEqual({
        dtype: 'float32',
        rank: 8,
        size: 1200,
        // Truncated dimensions are filled with `undefined`s.
        shape: [undefined, undefined, 3, 4, 1, 2, 1, 5],
      });
    });
  });

  describe('FULL_HEALTH', () => {
    it('float32 2D with no inf or nan', () => {
      const debugValue = parseDebugTensorValue(TensorDebugMode.FULL_HEALTH, [
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
      ]);
      expect(debugValue).toEqual({
        dtype: 'float32',
        rank: 2,
        size: 600,
        numNegativeFinites: 100,
        numZeros: 200,
        numPositiveFinites: 300,
      });
    });

    it('float64 scalar nan', () => {
      const debugValue = parseDebugTensorValue(TensorDebugMode.FULL_HEALTH, [
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
      ]);
      expect(debugValue).toEqual({
        dtype: 'float64',
        rank: 0,
        size: 1,
        numNaNs: 1,
      });
    });

    it('bfloat16 1D with -inf and +inf', () => {
      const debugValue = parseDebugTensorValue(TensorDebugMode.FULL_HEALTH, [
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
      ]);
      expect(debugValue).toEqual({
        dtype: 'bfloat16',
        rank: 1,
        size: 10,
        numNegativeInfs: 3,
        numPositiveInfs: 7,
      });
    });
  });

  describe('NO_TENSOR', () => {
    it('returns empty object', () => {
      expect(parseDebugTensorValue(TensorDebugMode.NO_TENSOR, null)).toEqual(
        {}
      );
    });
  });

  describe('FULL_TENSOR', () => {
    it('returns empty object', () => {
      expect(parseDebugTensorValue(TensorDebugMode.FULL_TENSOR, null)).toEqual(
        {}
      );
    });
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
          parseDebugTensorValue(debugMode as TensorDebugMode, null)
        ).toThrowError();
      });
    }
  });
});
