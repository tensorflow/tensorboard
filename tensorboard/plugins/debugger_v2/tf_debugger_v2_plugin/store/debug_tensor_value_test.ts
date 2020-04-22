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
        123,
        0,
      ]);
      expect(debugValue).toEqual({
        hasInfOrNaN: false,
      });
    });

    it('has inf or nan', () => {
      const debugValue = parseDebugTensorValue(TensorDebugMode.CURT_HEALTH, [
        123,
        1,
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
        1000,
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
        1000,
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
        1000,
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
        1000,
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
        10,
        0,
        1,
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
        3,
        1,
        46,
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
        1,
        2,
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
  });
});
