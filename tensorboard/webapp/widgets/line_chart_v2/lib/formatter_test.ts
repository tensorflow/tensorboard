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
import {
  numberFormatter,
  relativeTimeFormatter,
  wallTimeFormatter,
  TEST_ONLY,
} from './formatter';

describe('line_chart_v2/lib/formatter test', () => {
  describe('#numberFormatter', () => {
    for (const {name, fn} of [
      {name: 'formatTick', fn: numberFormatter.formatTick},
      {name: 'formatShort', fn: numberFormatter.formatShort},
    ]) {
      describe(name, () => {
        it('formats small numbers without trailing decimals', () => {
          expect(fn(1)).toBe('1');
          expect(fn(5)).toBe('5');
          expect(fn(-100.4)).toBe('-100.4');
          expect(fn(3.01)).toBe('3.01');
          expect(fn(9999)).toBe('9999');
          expect(fn(0.09)).toBe('0.09');
        });

        it('formats larger/small numbers in exponential format', () => {
          expect(fn(1.004e6)).toBe('1e+6');
          expect(fn(-1.004e6)).toBe('-1e+6');
          expect(fn(0.00005)).toBe('5e-5');
        });

        it('fails to format large number with many decimals nicely', () => {
          // This causes TensorBoard to format axis in less than ideal when spread of a
          // viewBox is miniscule compared to the number. e.g., you see axis that says,
          // "1e9", "1e9", "1e9" which is quite meaningless. It will be addressed in the future.
          expect(fn(1e9 + 0.00000001)).toBe('1e+9');
        });
      });
    }

    describe('formatReadable', () => {
      it('formats with localization', () => {
        expect(numberFormatter.formatReadable(1)).toBe('1');
        expect(numberFormatter.formatReadable(5)).toBe('5');
        expect(numberFormatter.formatReadable(-100.4)).toBe('-100.4');
        expect(numberFormatter.formatReadable(3.01)).toBe('3.01');
        expect(numberFormatter.formatReadable(9999)).toBe('9,999');
        expect(numberFormatter.formatReadable(0.09)).toBe('0.09');
        expect(numberFormatter.formatReadable(1.004e6)).toBe('1,004,000');
        expect(numberFormatter.formatReadable(-1.004e6)).toBe('-1,004,000');
        expect(numberFormatter.formatReadable(0.00005)).toBe('0.00005');
        expect(numberFormatter.formatReadable(1e5 + 0.00005)).toBe(
          '100,000.00005'
        );
      });
    });
  });

  describe('#relativeTimeFormatter', () => {
    for (const {name, fn} of [
      {name: 'formatTick', fn: relativeTimeFormatter.formatTick},
      {name: 'formatShort', fn: relativeTimeFormatter.formatShort},
      {name: 'formatReadable', fn: relativeTimeFormatter.formatReadable},
    ]) {
      describe(name, () => {
        it('formats time difference in appropriate unit', () => {
          expect(fn(0)).toBe('0');
          expect(fn(100)).toBe('100ms');
          expect(fn(999)).toBe('999ms');
          expect(fn(1000)).toBe('1sec');
          expect(fn(4023)).toBe('4.023sec');
          expect(fn(60023)).toBe('1min');
          expect(fn(61523)).toBe('1.025min');
          expect(fn(3700000)).toBe('1.028hr');
          expect(fn(86400000 * 3)).toBe('3day');
          expect(fn(31536000000 * 5)).toBe('5yr');
        });

        it('formats negative time difference in appropriate unit', () => {
          expect(fn(-100)).toBe('-100ms');
          expect(fn(-999)).toBe('-999ms');
          expect(fn(-1000)).toBe('-1sec');
          expect(fn(-4023)).toBe('-4.023sec');
          expect(fn(-60023)).toBe('-1min');
          expect(fn(-61523)).toBe('-1.025min');
          expect(fn(-3700000)).toBe('-1.028hr');
          expect(fn(-86400000 * 3)).toBe('-3day');
          expect(fn(-31536000000 * 5)).toBe('-5yr');
        });
      });
    }
  });

  describe('#wallTimeFormatter', () => {
    beforeEach(() => {
      TEST_ONLY.setLocale('en-US');
    });

    describe('#formatTick', () => {
      it('returns tick format using d3', () => {
        expect(
          wallTimeFormatter.formatTick(new Date('2020-1-5 13:23').getTime())
        ).toBe('01:23');
        expect(
          wallTimeFormatter.formatTick(new Date('2020-1-5 5:00').getTime())
        ).toBe('05 AM');
        expect(
          wallTimeFormatter.formatTick(new Date('2020-1-5').getTime())
        ).toBe('Jan 05');
        expect(
          wallTimeFormatter.formatTick(new Date('2019-1-1').getTime())
        ).toBe('2019');
      });
    });

    describe('formatShort', () => {
      it('formats using localization', () => {
        expect(
          wallTimeFormatter.formatShort(new Date('2020-1-5 13:23').getTime())
        ).toBe('Jan 5, 2020, 1:23:00 PM');
      });
    });

    describe('formatReadable', () => {
      it('formats using localization', () => {
        // jasmine + Angular seems to mock out the timezone by default (to UTC).
        expect(
          wallTimeFormatter.formatReadable(new Date('2020-1-5 13:23').getTime())
        ).toBe('Jan 5, 2020, 1:23:00.000 PM UTC');
      });
    });
  });
});
