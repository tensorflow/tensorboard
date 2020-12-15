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
  CompactDataSeries,
  compactDataSeries,
  decompactDataSeries,
} from './compact_data_series';

describe('line_chart_v2/lib/compact_data_series', () => {
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

    it('transfers without losing precision', () => {
      const dataSeries = [
        {
          id: 'foo',
          points: [
            {x: 1, y: Number.MIN_VALUE},
            {x: 1, y: 0.3},
            {x: 1, y: 1e-10},
          ],
        },
      ];

      const actual = decompactDataSeries(compactDataSeries(dataSeries));
      expect(actual).toEqual(dataSeries);
    });

    it('transfers date', () => {
      const time = new Date('2020-01-01').getTime();
      const dataSeries = [
        {
          id: 'foo',
          points: [{x: 1, y: time}],
        },
      ];

      const actual = decompactDataSeries(compactDataSeries(dataSeries));
      expect(actual).toEqual(dataSeries);
    });

    it('fails when decompacting wrong message (odd number of data points', () => {
      const compactDataSeries: CompactDataSeries = {
        idsAndLengths: [
          {
            id: 'foo',
            length: 2,
          },
        ],
        flattenedSeries: new Float32Array([1, 2, 3]),
      };

      expect(() => decompactDataSeries(compactDataSeries)).toThrow();
    });
  });
});
