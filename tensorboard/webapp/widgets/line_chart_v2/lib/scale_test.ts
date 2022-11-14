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

import {createScale} from './scale';
import {Scale, ScaleType} from './scale_types';

describe('line_chart_v2/lib/scale test', () => {
  describe('linear', () => {
    let scale: Scale;

    beforeEach(() => {
      scale = createScale(ScaleType.LINEAR);
    });

    describe('#forward and #reverse', () => {
      it('converts value from domain space to range space', () => {
        expect(scale.forward([0, 1], [-100, 100], 0)).toBe(-100);
        expect(scale.forward([0, 1], [-100, 100], 0.5)).toBe(0);
        expect(scale.forward([0, 1], [-100, 100], 1)).toBe(100);

        expect(scale.forward([0, 1], [-100, 100], -1)).toBe(-300);
        expect(scale.forward([0, 1], [-100, 100], 5)).toBe(900);
      });

      it('allows flipping order of the range', () => {
        expect(scale.forward([0, 1], [100, -100], 0)).toBe(100);
        expect(scale.forward([0, 1], [100, -100], 0.5)).toBe(0);
        expect(scale.forward([0, 1], [100, -100], 1)).toBe(-100);

        expect(scale.forward([0, 1], [100, -100], -1)).toBe(300);
        expect(scale.forward([0, 1], [100, -100], 5)).toBe(-900);
      });

      it('returns range min value when domain spread is 0', () => {
        expect(scale.forward([1, 1], [0, 100], 1)).toBe(0);
        expect(scale.forward([1, 1], [0, 100], 0)).toBe(0);
      });

      it('does not choke when range spread is 0', () => {
        expect(scale.forward([0, 1], [100, 100], 0)).toBe(100);
        expect(scale.forward([0, 1], [100, 100], 1)).toBe(100);
      });

      it('reverse the scale from range to domain', () => {
        expect(scale.reverse([0, 1], [-100, 100], 0)).toBe(0.5);
        expect(scale.reverse([0, 1], [-100, 100], -100)).toBe(0);
        expect(scale.reverse([0, 1], [-100, 100], 100)).toBe(1);

        expect(scale.reverse([0, 1], [-100, 100], -101)).toBe(-0.005);
        expect(scale.reverse([0, 1], [-100, 100], 500)).toBe(3);
      });
    });

    describe('#niceDomain', () => {
      it('puts "nice" (~5%) padding around and round value of min and max', () => {
        expect(scale.niceDomain([0, 100])).toEqual([-10, 110]);
        expect(scale.niceDomain([-0.011, 99.5])).toEqual([-10, 110]);
        expect(scale.niceDomain([5.44, 95.12])).toEqual([0, 100]);
      });

      it('returns about [0, 2c] min == max', () => {
        expect(scale.niceDomain([100, 100])).toEqual([0, 200]);
        expect(scale.niceDomain([1, 1])).toEqual([0, 2]);
        expect(scale.niceDomain([0, 0])).toEqual([-1, 1]);
        // https://github.com/tensorflow/tensorboard/issues/4362
        expect(scale.niceDomain([0.001, 0.001])).toEqual([0, 0.002]);
        expect(scale.niceDomain([-10000, -10000])).toEqual([-20000, 0]);
      });

      it('throws an error when min is larger than max', () => {
        expect(() => void scale.niceDomain([100, 0])).toThrowError(Error);
      });
    });

    // This is basically exercising d3.scale#ticks but it is good to test so we are not
    // surprised by any behavior changes.
    describe('#tick', () => {
      it('returns ticks in between min and max', () => {
        expect(scale.ticks([0, 100], 5)).toEqual([0, 20, 40, 60, 80, 100]);
        expect(scale.ticks([300, 1000], 5)).toEqual([
          300, 400, 500, 600, 700, 800, 900, 1000,
        ]);
        expect(scale.ticks([0.01, 0.05], 5)).toEqual([
          0.01, 0.02, 0.03, 0.04, 0.05,
        ]);
        // Another example of sizeGuidance not being exact.
        expect(scale.ticks([0.01, 0.05], 3)).toEqual([
          0.01, 0.02, 0.03, 0.04, 0.05,
        ]);
      });
    });

    describe('#isSafeNumber', () => {
      it('returns true for numbers', () => {
        expect(scale.isSafeNumber(0.1)).toBe(true);
        expect(scale.isSafeNumber(1)).toBe(true);
        expect(scale.isSafeNumber(1e100)).toBe(true);
        expect(scale.isSafeNumber(-1e100)).toBe(true);
        expect(scale.isSafeNumber(1e-100)).toBe(true);
      });

      it('returns false for infinities and NaN', () => {
        expect(scale.isSafeNumber(NaN)).toBe(false);
        expect(scale.isSafeNumber(Infinity)).toBe(false);
        expect(scale.isSafeNumber(-Infinity)).toBe(false);
      });
    });
  });

  describe('log10', () => {
    let scale: Scale;

    beforeEach(() => {
      scale = createScale(ScaleType.LOG10);
    });

    describe('#forward and #reverse', () => {
      it('converts value from domain space to range space', () => {
        expect(scale.forward([0, 1], [-100, 100], 0)).toBe(-100);
        expect(scale.forward([0, 1], [-100, 0], 0.5)).toBeCloseTo(-0.09, 2);
        expect(scale.forward([0, 1], [-100, 100], 1)).toBe(100);

        expect(scale.forward([0, 1], [-100, 100], -1)).toBe(-100);
        expect(scale.forward([0, 1], [-100, 100], 5)).toBeCloseTo(100, -1);

        expect(scale.forward([1, 1000], [0, 1], 100)).toBeCloseTo(0.666, 2);
        expect(scale.forward([0.00001, 1], [0, 5], 0.01)).toBeCloseTo(3);
      });

      // Kind of tentative behavior: it is more correct to return NaN and let
      // UI elements show the right treatment; we would also need to exclude it
      // when computed extents but it is out of scope for now.
      it('handles negative value by treating it min float value', () => {
        expect(scale.forward([1, 100], [0, 3], -3)).toBe(0);
      });

      it('permits negative value in domain by clipping it to min number', () => {
        // Because -100 is treated as min number, the domain is effectively
        // [Number.MIN_VALUE, 100] and log of MIN_VALUE is about -324. So, `1` is much
        // closer to the end of the range.
        expect(scale.forward([-100, 100], [0, 1], 1)).toBeCloseTo(1, 1);
      });

      it('allows flipping order of the range', () => {
        expect(scale.forward([0, 1], [100, -100], 0)).toBe(100);
        expect(scale.forward([0, 1], [100, -100], 0.5)).toBeCloseTo(-100, 0);
        expect(scale.forward([0, 1], [100, -100], 1)).toBe(-100);

        // -1 is illegal in especially log domain so it is clipped to min range.
        expect(scale.forward([0, 1], [100, -100], -1)).toBe(100);
        expect(scale.forward([0, 1], [100, -100], 5)).toBeCloseTo(-100, 0);
      });

      it('returns range min value when domain spread is 0', () => {
        expect(scale.forward([1, 1], [0, 100], 1)).toBe(0);
        expect(scale.forward([1, 1], [0, 100], 0)).toBe(0);
      });

      it('does not choke when range spread is 0', () => {
        expect(scale.forward([0, 1], [100, 100], 0)).toBe(100);
        expect(scale.forward([0, 1], [100, 100], 1)).toBe(100);
      });

      it('reverse the scale from range to domain', () => {
        expect(scale.reverse([1, 1000], [-100, 100], 0)).toBeCloseTo(31.6, 0);
        expect(scale.reverse([1, 1000], [-100, 100], -100)).toBe(1);
        expect(scale.reverse([1, 1000], [-100, 100], 100)).toBeCloseTo(1000, 0);

        expect(scale.reverse([1, 1000], [-100, 100], -101)).toBeCloseTo(
          0.966,
          1
        );
        expect(scale.reverse([1, 1000], [-100, 100], 300)).toBeCloseTo(
          1000000,
          0
        );
      });

      it('returns cyclic consistent value', () => {
        const initialX = 100;
        const forward = scale.forward([1, 1000], [-100, 100], initialX);
        const inverse = scale.reverse([1, 1000], [-100, 100], forward);
        expect(inverse).toBeCloseTo(initialX, 0);
      });
    });

    describe('#niceDomain', () => {
      // Carrying over the behavior from existing vz_line_chart
      it('puts padding around min and max by halving and doubling', () => {
        expect(scale.niceDomain([1, 100])).toEqual([0.5, 200]);
        expect(scale.niceDomain([0.001, 75])).toEqual([0.0005, 150]);
        expect(scale.niceDomain([100, 1e6])).toEqual([50, 2e6]);
      });

      it('returns [0.5c, 2c] when min == max', () => {
        // Unlike the linear case, [0, 2c] would result in very bottom heavy chart since,
        // first, log(0) = NaN and we would have to render log(Number.MIN_VALUE) which is
        // ~ -324. It is much better to halve and double the constant since double is
        // small log(2) in log scale (0.3 + log_10(c)).
        expect(scale.niceDomain([100, 100])).toEqual([50, 200]);
        expect(scale.niceDomain([1, 1])).toEqual([0.5, 2]);
        expect(scale.niceDomain([0.001, 0.001])).toEqual([0.0005, 0.002]);
      });

      it('clips at min value when domains are non-positive', () => {
        let low: number;
        let high: number;
        [low, high] = scale.niceDomain([-100, -1]);
        expect(low).toBe(Number.MIN_VALUE);
        expect(high).toBe(1);

        [low, high] = scale.niceDomain([0, 0]);
        expect(low).toBe(Number.MIN_VALUE);
        expect(high).toBe(1);

        [low, high] = scale.niceDomain([-1, 1]);
        expect(low).toBe(Number.MIN_VALUE);
        expect(high).toBe(2);
      });

      it('throws an error when min is larger than max', () => {
        expect(() => void scale.niceDomain([100, 0])).toThrowError(Error);
      });
    });

    describe('#tick', () => {
      it('returns ticks in between min and max', () => {
        expect(scale.ticks([1, 100], 5)).toEqual([
          1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100,
        ]);
        expect(scale.ticks([300, 1000], 5)).toEqual([
          300, 400, 500, 600, 700, 800, 900, 1000,
        ]);
        expect(scale.ticks([0.01, 0.05], 5)).toEqual([
          0.01, 0.02, 0.03, 0.04, 0.05,
        ]);
        // Another example of sizeGuidance not being exact.
        expect(scale.ticks([0.01, 0.05], 3)).toEqual([
          0.01, 0.02, 0.03, 0.04, 0.05,
        ]);
      });

      // This is less than ideal; with any zeros, we will be stuck on 1e-324.
      it('handles non-positive values correctly', () => {
        expect(scale.ticks([0, 0.01], 3)).toEqual([1e-300, 1e-200, 1e-100]);
        expect(scale.ticks([-100, 0.01], 3)).toEqual([1e-300, 1e-200, 1e-100]);
      });
    });

    describe('#isSafeNumber', () => {
      it('returns true for positive finite numbers', () => {
        expect(scale.isSafeNumber(Number.MIN_VALUE)).toBe(true);
        expect(scale.isSafeNumber(1e-100)).toBe(true);
        expect(scale.isSafeNumber(0.1)).toBe(true);
        expect(scale.isSafeNumber(1)).toBe(true);
        expect(scale.isSafeNumber(1e100)).toBe(true);
      });

      it('returns false for non-positive values', () => {
        expect(scale.isSafeNumber(Infinity)).toBe(false);
        expect(scale.isSafeNumber(-Infinity)).toBe(false);
        expect(scale.isSafeNumber(NaN)).toBe(false);
        expect(scale.isSafeNumber(0)).toBe(false);
        expect(scale.isSafeNumber(-0)).toBe(false);
        expect(scale.isSafeNumber(-0.001)).toBe(false);
        expect(scale.isSafeNumber(-1000)).toBe(false);
      });
    });
  });

  describe('time', () => {
    let scale: Scale;

    beforeEach(() => {
      scale = createScale(ScaleType.TIME);
    });

    describe('#forward and #reverse', () => {
      it('converts value from domain space to range space', () => {
        expect(scale.forward([0, 1], [-100, 100], 0)).toBe(-100);
        expect(scale.forward([0, 1], [-100, 100], 0.5)).toBe(0);
        expect(scale.forward([0, 1], [-100, 100], 1)).toBe(100);

        expect(scale.forward([0, 1], [-100, 100], -1)).toBe(-300);
        expect(scale.forward([0, 1], [-100, 100], 5)).toBe(900);

        expect(
          scale.forward(
            [
              new Date('2020-01-01 12:00:00').getTime(),
              new Date('2020-01:02 00:00:00').getTime(),
            ],
            [0, 100],
            new Date('2020-01-01 18:00:00').getTime()
          )
        ).toBe(50);
      });

      it('reverses the scale from range to domain', () => {
        expect(scale.reverse([1000, 2000], [-100, 100], 0)).toBe(1500);
        expect(scale.reverse([1000, 2000], [-100, 100], -100)).toBe(1000);
        expect(scale.reverse([1000, 2000], [-100, 100], 100)).toBe(2000);

        expect(scale.reverse([1000, 2000], [-100, 100], -102)).toBe(990);
        expect(scale.reverse([1000, 2000], [-100, 100], 500)).toBe(4000);

        expect(
          scale.reverse(
            [
              new Date('2020-01-01 12:00:00').getTime(),
              new Date('2020-01:02 00:00:00').getTime(),
            ],
            [0, 100],
            50
          )
        ).toBe(new Date('2020-01-01 18:00:00').getTime());
      });
    });

    describe('#niceDomain', () => {
      it('rounds domain', () => {
        expect(scale.niceDomain([0, 100])).toEqual([0, 100]);
        expect(scale.niceDomain([-0.011, 99.5])).toEqual([0, 100]);
        expect(scale.niceDomain([5.44, 95.12])).toEqual([0, 100]);
        expect(
          scale.niceDomain([
            new Date('2020-01-03 11:24:43').getTime(),
            new Date('2020-09-13 01:32:11').getTime(),
          ])
        ).toEqual([
          1577836800000, // 2020-01-01 00:00:00
          1601510400000, // 2020-10-01 00:00:00
        ]);
      });
    });

    // This is basically exercising d3.scale#ticks but it is good to test so we are not
    // surprised by any behavior changes.
    describe('#tick', () => {
      it('returns ticks in between min and max', () => {
        expect(
          scale.ticks(
            [
              new Date('2020-01-01').getTime(),
              new Date('2020-12-31').getTime(),
            ],
            5
          )
        ).toEqual([
          1577836800000, // 2020-01-01
          1585699200000, // 2020-04-01
          1593561600000, // 2020-07-01
          1601510400000, // 2020-10-01
        ]);

        expect(
          scale.ticks(
            [
              new Date('2020-01-01 05:00').getTime(),
              new Date('2020-01-01 17:00').getTime(),
            ],
            5
          )
        ).toEqual([
          1577858400000, // 2020-01-01 06:00
          1577869200000, // 2020-01-01 09:00
          1577880000000, // 2020-01-01 12:00
          1577890800000, // 2020-01-01 15:00
        ]);
      });
    });

    describe('#isSafeNumber', () => {
      it('returns true for numbers', () => {
        expect(scale.isSafeNumber(0.1)).toBe(true);
        expect(scale.isSafeNumber(1)).toBe(true);
        expect(scale.isSafeNumber(1e100)).toBe(true);
        expect(scale.isSafeNumber(-1e100)).toBe(true);
        expect(scale.isSafeNumber(1e-100)).toBe(true);
      });

      it('returns false for infinities and NaN', () => {
        expect(scale.isSafeNumber(NaN)).toBe(false);
        expect(scale.isSafeNumber(Infinity)).toBe(false);
        expect(scale.isSafeNumber(-Infinity)).toBe(false);
      });
    });
  });
});
