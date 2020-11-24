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

import {classicSmoothing} from './data_transformer';
import {buildSeries} from './lib/testing';

describe('line_chart_v2/data_transformer test', () => {
  describe('#classicSmoothing', () => {
    it('smoothes data series', async () => {
      const dataSeries = [
        buildSeries({
          id: 's1',
          points: [
            {x: 0, y: 1},
            {x: 1, y: 0.5},
            {x: 2, y: 0},
          ],
        }),
        buildSeries({
          id: 's2',
          points: [
            {x: 0, y: 0},
            {x: 1, y: 0.5},
            {x: 2, y: 1},
          ],
        }),
        buildSeries({
          id: 's3',
          points: [],
        }),
      ];
      const actual = await classicSmoothing(dataSeries, 0.6);
      expect(actual).toEqual([
        {
          id: 's1',
          points: [
            // 0.4 * 1 / (1 - 0.6^1) = 1
            {x: 0, y: 1},
            // (0.5 * 0.4 + 0.4 * 1 * 0.6) / (1 - 0.6^2) = 0.6875
            {x: 1, y: 0.6875},
            // ~ 0.33673
            {
              x: 2,
              y:
                ((0.5 * 0.4 + 0.4 * 1 * 0.6) * 0.6 + 0) /
                (1 - Math.pow(0.6, 3)),
            },
          ],
        },
        {
          id: 's2',
          points: [
            {x: 0, y: 0},
            // (0.5 * 0.4) / (1 - 0.6^2) = 0.3125
            {x: 1, y: 0.3125},
            // ~0.6633
            {x: 2, y: (1 * 0.4 + 0.5 * 0.4 * 0.6) / (1 - Math.pow(0.6, 3))},
          ],
        },
        {
          id: 's3',
          points: [],
        },
      ]);
    });

    it('does not smooth at all when weight is 0', async () => {
      const dataSeries = [
        buildSeries({
          id: 's1',
          points: [
            {x: 0, y: 1},
            {x: 1, y: 0.5},
            {x: 2, y: 0},
          ],
        }),
        buildSeries({
          id: 's2',
          points: [
            {x: 0, y: 0},
            {x: 1, y: 0.5},
            {x: 2, y: 1},
          ],
        }),
      ];
      const actual = await classicSmoothing(dataSeries, 0.0);
      expect(actual).toEqual([
        {
          id: 's1',
          points: [
            {x: 0, y: 1},
            {x: 1, y: 0.5},
            {x: 2, y: 0},
          ],
        },
        {
          id: 's2',
          points: [
            {x: 0, y: 0},
            {x: 1, y: 0.5},
            {x: 2, y: 1},
          ],
        },
      ]);
    });

    it('omits not finite values in smoothing', async () => {
      const actual = await classicSmoothing(
        [
          buildSeries({
            id: 's1',
            points: [
              {x: 0, y: -Infinity},
              {x: 0, y: 1},
              {x: 0.5, y: NaN},
              {x: 0.75, y: Infinity},
              {x: 1, y: 0.5},
            ],
          }),
        ],
        0.6
      );
      expect(actual).toEqual([
        {
          id: 's1',
          points: [
            {x: 0, y: -Infinity},
            {x: 0, y: 1},
            {x: 0.5, y: NaN},
            {x: 0.75, y: Infinity},
            // Please refer to the "smoothes data series" spec for details of this value.
            {x: 1, y: 0.6875},
          ],
        },
      ]);
    });

    it('returns 0 when smoothing weight is 1', async () => {
      const actual = await classicSmoothing(
        [
          buildSeries({
            id: 's1',
            points: [
              {x: 0, y: 1},
              {x: 1, y: 0.5},
              {x: 2, y: 0},
            ],
          }),
        ],
        1
      );
      expect(actual).toEqual([
        {
          id: 's1',
          points: [
            {x: 0, y: 0},
            {x: 1, y: 0},
            {x: 2, y: 0},
          ],
        },
      ]);
    });

    it('does not inject floating point noise when numbers are constant', async () => {
      const actual = await classicSmoothing(
        [
          buildSeries({
            id: 's1',
            points: [
              {x: 0, y: 0.3},
              {x: 1, y: 0.3},
              {x: 2, y: 0.3},
            ],
          }),
        ],
        0.1
      );
      expect(actual).toEqual([
        {
          id: 's1',
          points: [
            {x: 0, y: 0.3},
            {x: 1, y: 0.3},
            {x: 2, y: 0.3},
          ],
        },
      ]);
    });

    describe('smoothing weight clipping', () => {
      for (const smoothingWeight of [NaN, -1, -Infinity, Infinity]) {
        it(`clips smoothing weight=${smoothingWeight} to 0`, async () => {
          const actual = await classicSmoothing(
            [
              buildSeries({
                id: 's1',
                points: [
                  {x: 0, y: 1},
                  {x: 1, y: 0.5},
                ],
              }),
            ],
            smoothingWeight
          );
          expect(actual).toEqual([
            {
              id: 's1',
              points: [
                {x: 0, y: 1},
                {x: 1, y: 0.5},
              ],
            },
          ]);
        });
      }

      it('clips smoothing weight larger than 1 to 1', async () => {
        const actual = await classicSmoothing(
          [
            buildSeries({
              id: 's1',
              points: [
                {x: 0, y: 1},
                {x: 1, y: 0.5},
              ],
            }),
          ],
          2
        );
        expect(actual).toEqual([
          {
            id: 's1',
            points: [
              {x: 0, y: 0},
              {x: 1, y: 0},
            ],
          },
        ]);
      });
    });
  });
});
