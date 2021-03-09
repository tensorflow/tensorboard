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

import {LinearScale} from '../lib/scale';
import {getTicksForLinearScale} from './line_chart_axis_utils';

describe('line_chart_v2/sub_view/axis_utils test', () => {
  describe('#getTicksForLinearScale', () => {
    const scale = new LinearScale();

    it('returns no major ticks for extents in integers', () => {
      const {major, minor} = getTicksForLinearScale(
        scale,
        scale.defaultFormatter,
        5,
        [1, 10]
      );

      expect(major).toEqual([]);
      expect(minor).toEqual([
        {value: 2, tickFormattedString: '2'},
        {value: 4, tickFormattedString: '4'},
        {value: 6, tickFormattedString: '6'},
        {value: 8, tickFormattedString: '8'},
        {value: 10, tickFormattedString: '10'},
      ]);
    });

    it('returns no major ticks for numbers with less than three decimal digits', () => {
      const {major, minor} = getTicksForLinearScale(
        scale,
        scale.defaultFormatter,
        2,
        [1.015, 1.115]
      );

      expect(major).toEqual([]);
      expect(minor).toEqual([
        {value: 1.05, tickFormattedString: '1.05'},
        {value: 1.1, tickFormattedString: '1.1'},
      ]);
    });

    describe('very small differences', () => {
      it('creates a major tick since very long minor tick labels are not legible', () => {
        const {major, minor} = getTicksForLinearScale(
          scale,
          scale.defaultFormatter,
          2,
          [1.94515, 1.9452]
        );

        expect(major).toEqual([
          {start: 1.9451, tickFormattedString: '1.9451'},
          {start: 1.9452, tickFormattedString: '1.9452'},
        ]);
        expect(minor).toEqual([
          // Truncated by major tick, 1.9451.
          {value: 1.94516, tickFormattedString: '…6'},
          {value: 1.94518, tickFormattedString: '…8'},
          // Truncated by major tick, 1.9452.
          {value: 1.9452, tickFormattedString: '…0'},
        ]);
      });

      it('handles very minute differences in extent', () => {
        const {major, minor} = getTicksForLinearScale(
          scale,
          scale.defaultFormatter,
          2,
          [1.123456789012345, 1.123456789012392]
        );

        expect(major).toEqual([
          // Why is the formatted with trailing "23" stripped out? Fix it later.
          {start: 1.1234567890123, tickFormattedString: '1.12345678901'},
        ]);
        expect(minor).toEqual([
          {value: 1.12345678901236, tickFormattedString: '…6'},
          {value: 1.12345678901238, tickFormattedString: '…8'},
        ]);
      });

      it('breaks out to major axis when difference is small, not number', () => {
        const {major, minor} = getTicksForLinearScale(
          scale,
          scale.defaultFormatter,
          2,
          [1235000.123451, 1235000.123455]
        );

        expect(major).toEqual([
          // Why is the formatted with trailing "23" stripped out? Fix it later.
          {
            start: 1235000.12345,
            tickFormattedString: '1.24e+6',
          },
        ]);
        expect(minor).toEqual([
          {value: 1235000.123452, tickFormattedString: '…2'},
          {value: 1235000.123454, tickFormattedString: '…4'},
        ]);
      });

      it('handles flipped axis', () => {
        const {major, minor} = getTicksForLinearScale(
          scale,
          scale.defaultFormatter,
          2,
          [1.9452, 1.94515]
        );

        expect(major).toEqual([
          // Why is the formatted with trailing "23" stripped out? Fix it later.
          {start: 1.9452, tickFormattedString: '1.9452'},
          {start: 1.9451, tickFormattedString: '1.9451'},
        ]);
        expect(minor).toEqual([
          {value: 1.9452, tickFormattedString: '…0'},
          {value: 1.94518, tickFormattedString: '…8'},
          {value: 1.94516, tickFormattedString: '…6'},
        ]);
      });
    });
  });
});
