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

import {createScale, LinearScale, ScaleType, TemporalScale} from '../lib/scale';
import {AxisUtils, TEST_ONLY} from './line_chart_axis_utils';

describe('line_chart_v2/sub_view/axis_utils test', () => {
  describe('#getStandardTicks', () => {
    const scale = createScale(ScaleType.LOG10);

    it('returns no major ticks', () => {
      const {major, minor} = AxisUtils.getStandardTicks(
        scale,
        scale.defaultFormatter,
        5,
        [1, 10]
      );

      expect(major).toEqual([]);
      expect(minor).toEqual([
        {value: 1, tickFormattedString: '1'},
        {value: 2, tickFormattedString: '2'},
        {value: 3, tickFormattedString: '3'},
        {value: 4, tickFormattedString: '4'},
        {value: 5, tickFormattedString: '5'},
        {value: 6, tickFormattedString: '6'},
        {value: 7, tickFormattedString: '7'},
        {value: 8, tickFormattedString: '8'},
        {value: 9, tickFormattedString: '9'},
        {value: 10, tickFormattedString: '10'},
      ]);
    });
  });

  describe('#getTicksForTemporalScale', () => {
    const scale = new TemporalScale();

    it('returns temporal ticks', () => {
      const {major, minor} = AxisUtils.getTicksForTemporalScale(
        scale,
        scale.defaultFormatter,
        5,
        [
          new Date('2000/01/01 5:00').getTime(),
          new Date('2000/01/01 10:00').getTime(),
        ]
      );

      expect(major).toEqual([
        {
          start: new Date('2000/01/01 6:00').getTime(),
          tickFormattedString: 'Jan 1, 2000, 6:00:00 AM',
        },
        {
          start: new Date('2000/01/01 9:00').getTime(),
          tickFormattedString: 'Jan 1, 2000, 9:00:00 AM',
        },
      ]);
      expect(minor).toEqual([
        {
          value: new Date('2000/01/01 5:00').getTime(),
          tickFormattedString: '05 AM',
        },
        {
          value: new Date('2000/01/01 6:00').getTime(),
          tickFormattedString: '06 AM',
        },
        {
          value: new Date('2000/01/01 7:00').getTime(),
          tickFormattedString: '07 AM',
        },
        {
          value: new Date('2000/01/01 8:00').getTime(),
          tickFormattedString: '08 AM',
        },
        {
          value: new Date('2000/01/01 9:00').getTime(),
          tickFormattedString: '09 AM',
        },
        {
          value: new Date('2000/01/01 10:00').getTime(),
          tickFormattedString: '10 AM',
        },
      ]);
    });

    it('returns only minor when d3 ticks return less than 2 major axes', () => {
      const {major, minor} = AxisUtils.getTicksForTemporalScale(
        scale,
        scale.defaultFormatter,
        5,
        [
          new Date('2000/01/01 1:00').getTime(),
          new Date('2000/01/01 2:00').getTime(),
        ]
      );
      expect(major).toEqual([]);
      expect(minor).toEqual([
        {
          value: new Date('2000/01/01 1:00').getTime(),
          tickFormattedString: '01 AM',
        },
        {
          value: new Date('2000/01/01 1:15').getTime(),
          tickFormattedString: '01:15',
        },
        {
          value: new Date('2000/01/01 1:30').getTime(),
          tickFormattedString: '01:30',
        },
        {
          value: new Date('2000/01/01 1:45').getTime(),
          tickFormattedString: '01:45',
        },
        {
          value: new Date('2000/01/01 2:00').getTime(),
          tickFormattedString: '02 AM',
        },
      ]);
    });

    it('does not return major when diff in time is greater than or equal to 1d', () => {
      const {major, minor} = AxisUtils.getTicksForTemporalScale(
        scale,
        scale.defaultFormatter,
        5,
        [
          new Date('2000/01/01 00:00').getTime(),
          new Date('2000/01/05 00:00').getTime(),
        ]
      );

      expect(major).toEqual([]);
      expect(minor).toEqual([
        {
          value: new Date('2000/01/01 0:00').getTime(),
          tickFormattedString: '2000',
        },
        {
          value: new Date('2000/01/02 0:00').getTime(),
          tickFormattedString: 'Jan 02',
        },
        {
          value: new Date('2000/01/03 0:00').getTime(),
          tickFormattedString: 'Mon 03',
        },
        {
          value: new Date('2000/01/04 0:00').getTime(),
          tickFormattedString: 'Tue 04',
        },
        {
          value: new Date('2000/01/05 0:00').getTime(),
          tickFormattedString: 'Wed 05',
        },
      ]);
    });
  });

  describe('#getTicksForLinearScale', () => {
    const scale = new LinearScale();

    it('returns no major ticks for extents in integers', () => {
      const {major, minor} = AxisUtils.getTicksForLinearScale(
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
      const {major, minor} = AxisUtils.getTicksForLinearScale(
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

    it('handles extents with 0 and larger number', () => {
      const {major, minor} = AxisUtils.getTicksForLinearScale(
        scale,
        scale.defaultFormatter,
        2,
        [0, 3.2105]
      );
      expect(major).toEqual([]);
      expect(minor).toEqual([
        {value: 0, tickFormattedString: '0'},
        {value: 2, tickFormattedString: '2'},
      ]);
    });

    describe('very small differences', () => {
      it('creates a major tick since very long minor tick labels are not legible', () => {
        const {major, minor} = AxisUtils.getTicksForLinearScale(
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
        const {major, minor} = AxisUtils.getTicksForLinearScale(
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
        const {major, minor} = AxisUtils.getTicksForLinearScale(
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
        const {major, minor} = AxisUtils.getTicksForLinearScale(
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

      it('handles 0 and small number close to 0 well', () => {
        const {major, minor} = AxisUtils.getTicksForLinearScale(
          scale,
          scale.defaultFormatter,
          2,
          [0, 0.0001999]
        );
        expect(major).toEqual([
          {start: 0, tickFormattedString: '—'},
          {start: 0.0001, tickFormattedString: '1e-4'},
        ]);
        expect(minor).toEqual([
          {value: 0, tickFormattedString: '0'},
          {value: 0.0001, tickFormattedString: '…0'},
        ]);
      });

      it('handles 0 and small number close to 0 well (more minor ticks)', () => {
        const {major, minor} = AxisUtils.getTicksForLinearScale(
          scale,
          scale.defaultFormatter,
          4,
          [0, 0.00019999999495]
        );
        expect(major).toEqual([
          {start: 0, tickFormattedString: '—'},
          {start: 0.0001, tickFormattedString: '1e-4'},
        ]);
        expect(minor).toEqual([
          {value: 0, tickFormattedString: '0'},
          {value: 0.00005, tickFormattedString: '5e-5'},
          {value: 0.0001, tickFormattedString: '…0'},
          {value: 0.00015, tickFormattedString: '…5'},
        ]);
      });

      it('handles extent close to 0s well', () => {
        const {major, minor} = AxisUtils.getTicksForLinearScale(
          scale,
          scale.defaultFormatter,
          2,
          [0.000001, 0.0001999]
        );
        expect(major).toEqual([{start: 0.0001, tickFormattedString: '1e-4'}]);
        expect(minor).toEqual([{value: 0.0001, tickFormattedString: '…0'}]);
      });

      it('handles negative extent close to 0s well', () => {
        const {major, minor} = AxisUtils.getTicksForLinearScale(
          scale,
          scale.defaultFormatter,
          2,
          [-0.000001999, -0.00001]
        );

        expect(major).toEqual([
          {start: -0.000005, tickFormattedString: '-5e-6'},
          {start: -0.00001, tickFormattedString: '-1e-5'},
        ]);
        expect(minor).toEqual([
          {value: -0.000005, tickFormattedString: '…5'},
          {value: -0.00001, tickFormattedString: '…0'},
        ]);
      });
      it('returns no major ticks for numbers which are transated to scientific notation', () => {
        const {major, minor} = AxisUtils.getTicksForLinearScale(
          scale,
          scale.defaultFormatter,
          5,
          [0.0000000004, 0.000000009]
        );

        expect(major).toEqual([]);
        expect(minor).toEqual([
          {value: 2e-9, tickFormattedString: '2e-9'},
          {value: 4e-9, tickFormattedString: '4e-9'},
          {value: 6e-9, tickFormattedString: '6e-9'},
          {value: 8e-9, tickFormattedString: '8e-9'},
        ]);
      });
    });
  });

  describe('#containsScientificNotation', () => {
    it('returns true if the array contains scientific notation', () => {
      expect(TEST_ONLY.containsScientificNotation([1, 2e-9, 2])).toBe(true);
    });

    it('returns false if the array does not contain scientific notation', () => {
      expect(TEST_ONLY.containsScientificNotation([1, 4, 2])).toBe(false);
    });
  });

  describe('#filterTicksByVisibility', () => {
    // 10px monospace has about below dimensions.
    const CHAR_HEIGHT = 9;
    const CHAR_WIDTH = 6.021;

    describe('x axis', () => {
      it('filters ticks if it overlaps', () => {
        const ticks = AxisUtils.filterTicksByVisibility(
          [
            {value: 0, tickFormattedString: 'ABC'},
            {value: 0, tickFormattedString: 'XYZ'},
            {value: 18, tickFormattedString: 'A'},
            {value: CHAR_WIDTH * 3, tickFormattedString: 'B'},
            {value: CHAR_WIDTH * 5, tickFormattedString: 'C'},
          ],
          (tick) => tick.value,
          'x',
          '10px monospace',
          0
        );

        expect(ticks).toEqual([
          {value: 0, tickFormattedString: 'ABC'},
          {value: CHAR_WIDTH * 3, tickFormattedString: 'B'},
          {value: CHAR_WIDTH * 5, tickFormattedString: 'C'},
        ]);
      });

      it('filters everything out of nothing is visible', () => {
        const ticks = AxisUtils.filterTicksByVisibility(
          [
            {value: -100, tickFormattedString: 'A'},
            {value: -50, tickFormattedString: 'B'},
          ],
          (tick) => tick.value,
          'x',
          '10px monospace',
          0
        );

        expect(ticks).toEqual([]);
      });

      it('honors the padding', () => {
        const ticks = AxisUtils.filterTicksByVisibility(
          [
            {value: 0, tickFormattedString: 'ABC'},
            {value: CHAR_WIDTH * 3, tickFormattedString: 'B'},
            {value: CHAR_WIDTH * 3 + 10, tickFormattedString: 'C'},
          ],
          (tick) => tick.value,
          'x',
          '10px monospace',
          10
        );

        expect(ticks).toEqual([
          {value: 0, tickFormattedString: 'ABC'},
          {value: CHAR_WIDTH * 3 + 10, tickFormattedString: 'C'},
        ]);
      });
    });

    describe('y axis', () => {
      it('filters ticks if it overlaps', () => {
        const ticks = AxisUtils.filterTicksByVisibility(
          [
            {value: 200, tickFormattedString: 'A'},
            {value: 200, tickFormattedString: 'B'},
            {value: 195, tickFormattedString: 'C'},
            {value: 200 - CHAR_HEIGHT, tickFormattedString: 'D'},
            {value: 200 - CHAR_HEIGHT * 5, tickFormattedString: 'E'},
          ],
          (tick) => tick.value,
          'y',
          '10px monospace',
          0
        );

        expect(ticks).toEqual([
          {value: 200, tickFormattedString: 'A'},
          {value: 200 - CHAR_HEIGHT, tickFormattedString: 'D'},
          {value: 200 - CHAR_HEIGHT * 5, tickFormattedString: 'E'},
        ]);
      });

      it('honors the padding', () => {
        const ticks = AxisUtils.filterTicksByVisibility(
          [
            {value: 200, tickFormattedString: 'A'},
            {value: 200 - CHAR_HEIGHT, tickFormattedString: 'B'},
            {value: 200 - CHAR_HEIGHT - 10, tickFormattedString: 'C'},
          ],
          (tick) => tick.value,
          'y',
          '10px monospace',
          10
        );

        expect(ticks).toEqual([
          {value: 200, tickFormattedString: 'A'},
          {value: 200 - CHAR_HEIGHT - 10, tickFormattedString: 'C'},
        ]);
      });
    });
  });
});
