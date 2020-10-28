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
import {formatAxisNumber} from './axis_formatter';

describe('line_chart_v2/sub_view/axis_formatter test', () => {
  describe('#formatAxisNumber', () => {
    it('formats small numbers without trailing decimals', () => {
      expect(formatAxisNumber(1)).toBe('1');
      expect(formatAxisNumber(5)).toBe('5');
      expect(formatAxisNumber(-100.4)).toBe('-100.4');
      expect(formatAxisNumber(3.01)).toBe('3.01');
      expect(formatAxisNumber(9999)).toBe('9999');
      expect(formatAxisNumber(0.09)).toBe('0.09');
    });

    it('formats larger/small numbers in exponential format', () => {
      expect(formatAxisNumber(1.004e6)).toBe('1e+6');
      expect(formatAxisNumber(-1.004e6)).toBe('-1e+6');
      expect(formatAxisNumber(0.00005)).toBe('5e-5');
    });

    it('fails to format large number with many decimals nicely', () => {
      // This causes
      expect(formatAxisNumber(1e9 + 0.00000001)).toBe('1e+9');
    });
  });
});
