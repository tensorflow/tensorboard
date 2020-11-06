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

      it('puts padding of 5% of value when min == max', () => {
        expect(scale.niceDomain([100, 100])).toEqual([95, 105]);
        expect(scale.niceDomain([1, 1])).toEqual([0.95, 1.05]);
        expect(scale.niceDomain([10000, 10000])).toEqual([9500, 10500]);
        expect(scale.niceDomain([0, 0])).toEqual([-0.01, 0.01]);
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
          300,
          400,
          500,
          600,
          700,
          800,
          900,
          1000,
        ]);
        expect(scale.ticks([0.01, 0.05], 5)).toEqual([
          0.01,
          0.02,
          0.03,
          0.04,
          0.05,
        ]);
        // Another example of sizeGuidance not being exact.
        expect(scale.ticks([0.01, 0.05], 3)).toEqual([
          0.01,
          0.02,
          0.03,
          0.04,
          0.05,
        ]);
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
      it('puts "nice" (~5%) padding around but does not round values', () => {
        let low: number;
        let high: number;

        [low, high] = scale.niceDomain([0, 100]);
        expect(low).toBe(Number.MIN_VALUE);
        expect(high).toBeCloseTo(100, 0);

        [low, high] = scale.niceDomain([0.001, 75]);
        // spread is about log_10(75) - log_10(0.001) = 4.875
        // We add 5% padding with that spread (~0.2438) before we convert it back with
        // exponential. low turns into -3.244, so we exp(-3.244 / log_10(E)) ~ 0.00057.
        expect(low).toBeCloseTo(0.00057, 4);
        expect(high).toBeCloseTo(131, 0);

        [low, high] = scale.niceDomain([100, 1e6]);
        expect(low).toBeCloseTo(63, 0);
        expect(high).toBeCloseTo(1.585e6, -4);
      });

      it('puts padding of 5% of value when min == max', () => {
        let low: number;
        let high: number;
        [low, high] = scale.niceDomain([100, 100]);
        expect(low).toBeCloseTo(79, 0);
        expect(high).toBeCloseTo(126, 0);

        [low, high] = scale.niceDomain([1, 1]);
        expect(low).toBeCloseTo(0.977, 2);
        expect(high).toBeCloseTo(1.023, 2);

        [low, high] = scale.niceDomain([10000, 10000]);
        expect(low).toBeCloseTo(6310, 0);
        expect(high).toBeCloseTo(15849, 0);
      });

      it('throws an error when min is larger than max', () => {
        expect(() => void scale.niceDomain([100, 0])).toThrowError(Error);
      });
    });

    describe('#tick', () => {
      it('returns ticks in between min and max', () => {
        expect(scale.ticks([1, 100], 5)).toEqual([
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          20,
          30,
          40,
          50,
          60,
          70,
          80,
          90,
          100,
        ]);
        expect(scale.ticks([300, 1000], 5)).toEqual([
          300,
          400,
          500,
          600,
          700,
          800,
          900,
          1000,
        ]);
        expect(scale.ticks([0.01, 0.05], 5)).toEqual([
          0.01,
          0.02,
          0.03,
          0.04,
          0.05,
        ]);
        // Another example of sizeGuidance not being exact.
        expect(scale.ticks([0.01, 0.05], 3)).toEqual([
          0.01,
          0.02,
          0.03,
          0.04,
          0.05,
        ]);
      });

      // This is less than ideal; with any zeros, we will be stuck on 1e-324.
      it('handles non-positive values correctly', () => {
        expect(scale.ticks([0, 0.01], 3)).toEqual([1e-300, 1e-200, 1e-100]);
        expect(scale.ticks([-100, 0.01], 3)).toEqual([1e-300, 1e-200, 1e-100]);
      });
    });
  });
});
