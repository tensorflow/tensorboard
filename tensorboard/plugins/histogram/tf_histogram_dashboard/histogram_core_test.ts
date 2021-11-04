/* Copyright 2021 The TensorFlow Authors. All Rights Reserved.

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
  BackendHistogramBin,
  backendToIntermediate,
  backendToVz,
  intermediateToD3,
} from './histogramCore';

describe('histogram core', () => {
  describe('backendToIntermediate', () => {
    it('handles empty case', () => {
      expect(backendToIntermediate([0, 0, []])).toEqual({
        wall_time: 0,
        step: 0,
        min: undefined,
        max: undefined,
        buckets: [],
      });
    });

    it('converts backend histogram to intermediate', () => {
      const bins: BackendHistogramBin[] = [
        [1, 2, 2],
        [2, 3, 1],
        [3, 4, 1],
      ];
      expect(backendToIntermediate([1000, 2, bins])).toEqual({
        wall_time: 1000,
        step: 2,
        min: 1,
        max: 4,
        buckets: [
          {left: 1, right: 2, count: 2},
          {left: 2, right: 3, count: 1},
          {left: 3, right: 4, count: 1},
        ],
      });
    });
  });

  describe('intermediateToD3', () => {
    it('generates empty bins when input is empty', () => {
      const results = intermediateToD3(
        backendToIntermediate([0, 0, []]),
        0,
        10,
        20
      );
      let total_count: number = 0;
      for (let bin of results) {
        total_count += bin.y;
      }
      expect(results.length).toEqual(20);
      expect(total_count).toEqual(0);
    });

    it('handles data consisting of one single value', () => {
      const bins: BackendHistogramBin[] = [
        [1, 1, 0],
        [1, 1, 0],
        [1, 1, 10],
      ];
      const newMin = 1 / 1.1 - 1;
      const newMax = 1 * 1.1 + 1;
      const binWidth = (newMax - newMin) / 2;
      const results = intermediateToD3(
        backendToIntermediate([0, 0, bins]),
        1,
        1,
        2
      );
      expect(results.length).toEqual(2);
      expect(results[0].x).toBeCloseTo(newMin);
      expect(results[0].dx).toBeCloseTo(binWidth);
      expect(results[0].y).toEqual(10);
      expect(results[1].x).toBeCloseTo(newMin + binWidth);
      expect(results[1].dx).toBeCloseTo(binWidth);
      expect(results[1].y).toEqual(0);
    });

    it('converts intermediate histogram data to D3 format', () => {
      const bins: BackendHistogramBin[] = [
        [1, 5, 2],
        [5, 10, 4],
      ];
      expect(
        intermediateToD3(backendToIntermediate([0, 0, bins]), 1, 10, 2)
      ).toEqual([
        {x: 1, dx: 4.5, y: 2.4},
        {x: 5.5, dx: 4.5, y: 3.6},
      ]);
    });
  });

  describe('backendToVz', () => {
    it('handles empty case', () => {
      expect(backendToVz([])).toEqual([]);
    });

    it('handles data consisting of one single value', () => {
      const bins: BackendHistogramBin[] = [[11, 11, 100]];
      const results = backendToVz([[0, 0, bins]]);
      let total_count: number = 0;
      for (let result of results) {
        for (let bin of result.bins) {
          total_count += bin.y;
        }
      }
      expect(results.length).toEqual(1);
      expect(results[0].bins.length).toEqual(30);
      expect(total_count).toEqual(100);
      // Middle bin gets the count.
      expect(results[0].bins[14].y).toEqual(100);
    });

    it('converts backend histogram data to VzHistogram', () => {
      const bins: BackendHistogramBin[] = [
        [10, 20, 100],
        [20, 30, 300],
        [30, 40, 600],
      ];
      expect(backendToVz([[1000, 1, bins]])).toEqual([
        {
          wall_time: 1000,
          step: 1,
          bins: [
            {x: 10, dx: 1, y: 10},
            {x: 11, dx: 1, y: 10},
            {x: 12, dx: 1, y: 10},
            {x: 13, dx: 1, y: 10},
            {x: 14, dx: 1, y: 10},
            {x: 15, dx: 1, y: 10},
            {x: 16, dx: 1, y: 10},
            {x: 17, dx: 1, y: 10},
            {x: 18, dx: 1, y: 10},
            {x: 19, dx: 1, y: 10},
            {x: 20, dx: 1, y: 30},
            {x: 21, dx: 1, y: 30},
            {x: 22, dx: 1, y: 30},
            {x: 23, dx: 1, y: 30},
            {x: 24, dx: 1, y: 30},
            {x: 25, dx: 1, y: 30},
            {x: 26, dx: 1, y: 30},
            {x: 27, dx: 1, y: 30},
            {x: 28, dx: 1, y: 30},
            {x: 29, dx: 1, y: 30},
            {x: 30, dx: 1, y: 60},
            {x: 31, dx: 1, y: 60},
            {x: 32, dx: 1, y: 60},
            {x: 33, dx: 1, y: 60},
            {x: 34, dx: 1, y: 60},
            {x: 35, dx: 1, y: 60},
            {x: 36, dx: 1, y: 60},
            {x: 37, dx: 1, y: 60},
            {x: 38, dx: 1, y: 60},
            {x: 39, dx: 1, y: 60},
          ],
        },
      ]);
    });
  });
});
