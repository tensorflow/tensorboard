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
import {formatTickNumber} from './formatter';

describe('histogram/formatter test', () => {
  describe('formatTickNumber', () => {
    it('formats small numbers with 4 sig. digits', () => {
      expect(formatTickNumber(0)).toBe('0');
      expect(formatTickNumber(1)).toBe('1');
      expect(formatTickNumber(1.000000000001)).toBe('1');
      expect(formatTickNumber(5)).toBe('5');
      expect(formatTickNumber(-100.4)).toBe('-100.4');
      expect(formatTickNumber(3.01)).toBe('3.01');
      expect(formatTickNumber(9999)).toBe('9999');
      expect(formatTickNumber(0.09)).toBe('0.09');
    });

    it('formats small numbers in exponential format with 2 sig. digits', () => {
      expect(formatTickNumber(-0.000050000001)).toBe('-5e-5');
      expect(formatTickNumber(0.00005)).toBe('5e-5');
      expect(formatTickNumber(2.3411e-14)).toBe('2.34e-14');
      expect(formatTickNumber(-2.3411e-14)).toBe('-2.34e-14');
    });

    it('formats large numbers in SI format with 2 sig. digits', () => {
      expect(formatTickNumber(1.004e6)).toBe('1M');
      expect(formatTickNumber(-1.004e6)).toBe('-1M');
      expect(formatTickNumber(1.004e13)).toBe('10T');
      expect(formatTickNumber(-1.004e13)).toBe('-10T');
    });

    it('fails to format large number with many decimals nicely', () => {
      // This causes TensorBoard to format axis in less than ideal when spread of a
      // viewBox is miniscule compared to the number. e.g., you see axis that says,
      // "1G", "1G", "1G" which is quite meaningless. It will be addressed in the future.
      expect(formatTickNumber(1e9 + 0.00000001)).toBe('1G');
      expect(formatTickNumber(1e9 - 0.00000001)).toBe('1G');
    });
  });
});
