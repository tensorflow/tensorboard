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

import {compactDataSeries, decompactDataSeries} from './worker_chart_utils';

describe('line_chart_v2/lib/worker_chart_utils', () => {
  describe('data series compact & decompact', () => {
    it('compacts and decompacts to original DataSeries', () => {
      const dataSeries = [
        {
          id: 'foo',
          points: [
            {x: 1, y: 0},
            {x: 1, y: 3},
          ],
        },
      ];
      expect(decompactDataSeries(compactDataSeries(dataSeries))).toEqual(
        dataSeries
      );
    });

    it('handles differing length in the dataseries', () => {
      const dataSeries = [
        {
          id: 'foo',
          points: [
            {x: 1, y: 0},
            {x: 1, y: 3},
          ],
        },
        {
          id: 'bar',
          points: [
            {x: 1, y: 1},
            {x: 1, y: 3},
            {x: 1, y: 5},
          ],
        },
        {
          id: 'baz',
          points: [{x: 1, y: 0}],
        },
      ];
      expect(decompactDataSeries(compactDataSeries(dataSeries))).toEqual(
        dataSeries
      );
    });

    it('handles duplicate ids since compact/decompact does not care', () => {
      const dataSeries = [
        {
          id: 'foo',
          points: [
            {x: 1, y: 0},
            {x: 1, y: 3},
          ],
        },
        {
          id: 'foo',
          points: [
            {x: 1, y: 1},
            {x: 1, y: 3},
            {x: 1, y: 5},
          ],
        },
      ];

      expect(decompactDataSeries(compactDataSeries(dataSeries))).toEqual(
        dataSeries
      );
    });

    it('handles NaN and extremums', () => {
      const dataSeries = [
        {
          id: 'foo',
          points: [
            {x: 1, y: NaN},
            {x: 1, y: Infinity},
            {x: 1, y: -Infinity},
          ],
        },
      ];

      expect(decompactDataSeries(compactDataSeries(dataSeries))).toEqual(
        dataSeries
      );
    });

    it('rounds to float 32', () => {
      const dataSeries = [
        {
          id: 'foo',
          points: [{x: 1, y: Number.MIN_VALUE}],
        },
      ];

      const actual = decompactDataSeries(compactDataSeries(dataSeries));
      expect(actual).not.toEqual(dataSeries);
      expect(actual).toEqual([
        {
          id: 'foo',
          points: [{x: 1, y: 0}],
        },
      ]);
    });
  });
});
