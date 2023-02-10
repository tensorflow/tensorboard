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

import {RendererType, ScaleType} from './lib/public_types';
import {createScale} from './lib/scale';
import {buildMetadata, buildSeries} from './lib/testing';
import {ChartUtils} from './lib/utils';
import {
  computeDataSeriesExtent,
  getRendererType,
} from './line_chart_internal_utils';

function isFinite(x: number): boolean {
  return Number.isFinite(x);
}

describe('line_chart_v2/line_chart_internal_utils test', () => {
  describe('#computeDataSeriesExtent', () => {
    it('returns min and max from all series', () => {
      const actual = computeDataSeriesExtent(
        [
          buildSeries({
            id: 'foo',
            points: [
              {x: 1, y: 100},
              {x: 2, y: -10},
              {x: 3, y: -100},
            ],
          }),
          buildSeries({
            id: 'bar',
            points: [
              {x: -100, y: 0},
              {x: 0, y: -1},
              {x: -1000, y: 1},
            ],
          }),
        ],
        {
          foo: buildMetadata({id: 'foo', visible: true}),
          bar: buildMetadata({id: 'bar', visible: true}),
        },
        false,
        isFinite,
        isFinite
      );

      expect(actual).toEqual({x: [-1000, 3], y: [-100, 100]});
    });

    it('handles single dataSeries point', () => {
      const actual = computeDataSeriesExtent(
        [
          buildSeries({
            id: 'foo',
            points: [{x: 1, y: -1}],
          }),
        ],
        {
          foo: buildMetadata({id: 'foo', visible: true}),
        },
        false,
        isFinite,
        isFinite
      );

      expect(actual).toEqual({x: [1, 1], y: [-1, -1]});
    });

    it('handles two dataSeries point', () => {
      const actual = computeDataSeriesExtent(
        [
          buildSeries({
            id: 'foo',
            points: [{x: 1, y: -1}],
          }),
          buildSeries({
            id: 'bar',
            points: [{x: -10, y: 10}],
          }),
        ],
        {
          foo: buildMetadata({id: 'foo', visible: true}),
          bar: buildMetadata({id: 'bar', visible: true}),
        },
        false,
        isFinite,
        isFinite
      );

      expect(actual).toEqual({x: [-10, 1], y: [-1, 10]});
    });

    it('ignores dataseries that is visibility=false', () => {
      const actual = computeDataSeriesExtent(
        [
          buildSeries({
            id: 'foo',
            points: [
              {x: 1, y: -1},
              {x: 2, y: -10},
              {x: 3, y: 100},
            ],
          }),
          buildSeries({
            id: 'bar',
            points: [
              {x: -100, y: 0},
              {x: -1000, y: 1},
            ],
          }),
        ],
        {
          foo: buildMetadata({id: 'foo', visible: true}),
          bar: buildMetadata({id: 'bar', visible: false}),
        },
        false,
        isFinite,
        isFinite
      );

      expect(actual).toEqual({x: [1, 3], y: [-10, 100]});
    });

    it('ignores dataseries that is aux', () => {
      const actual = computeDataSeriesExtent(
        [
          buildSeries({
            id: 'foo',
            points: [
              {x: 1, y: -1},
              {x: 2, y: -10},
              {x: 3, y: 100},
            ],
          }),
          buildSeries({
            id: 'bar',
            points: [
              {x: -100, y: 0},
              {x: -1000, y: 1},
            ],
          }),
        ],
        {
          foo: buildMetadata({id: 'foo', visible: true, aux: true}),
          bar: buildMetadata({id: 'bar'}),
        },
        false,
        isFinite,
        isFinite
      );

      expect(actual).toEqual({x: [-1000, -100], y: [0, 1]});
    });

    it('ignores dataseries without metadata', () => {
      const actual = computeDataSeriesExtent(
        [
          buildSeries({id: 'foo', points: [{x: 1, y: -1}]}),
          buildSeries({
            id: 'bar',
            points: [
              {x: -100, y: 0},
              {x: -1000, y: 1},
            ],
          }),
        ],
        {
          bar: buildMetadata({id: 'bar'}),
        },
        false,
        isFinite,
        isFinite
      );

      expect(actual).toEqual({x: [-1000, -100], y: [0, 1]});
    });

    it('filters out NaN and infinity', () => {
      const actual = computeDataSeriesExtent(
        [
          buildSeries({
            id: 'foo',
            points: [
              {x: 1, y: -1},
              {x: 2, y: Infinity},
              {x: 3, y: NaN},
              {x: 4, y: -1},
            ],
          }),
        ],
        {
          foo: buildMetadata({id: 'foo'}),
        },
        false,
        isFinite,
        isFinite
      );

      expect(actual).toEqual({x: [1, 4], y: [-1, -1]});
    });

    it('returns undefined when nothing is visible', () => {
      const actual = computeDataSeriesExtent(
        [
          buildSeries({
            id: 'foo',
            points: [
              {x: 1, y: -1},
              {x: 2, y: -10},
              {x: 3, y: 100},
            ],
          }),
          buildSeries({
            id: 'bar',
            points: [
              {x: -100, y: 0},
              {x: -1000, y: 1},
            ],
          }),
        ],
        {
          foo: buildMetadata({id: 'foo', visible: false}),
          bar: buildMetadata({id: 'bar', visible: false}),
        },
        false,
        isFinite,
        isFinite
      );

      expect(actual).toEqual({
        x: undefined,
        y: undefined,
      });
    });

    it('returns undefined when dataSeries is empty', () => {
      const actual = computeDataSeriesExtent([], {}, false, isFinite, isFinite);

      expect(actual).toEqual({
        x: undefined,
        y: undefined,
      });
    });

    it('returns undefined when dataSeries is all NaN', () => {
      const actual = computeDataSeriesExtent(
        [
          buildSeries({
            id: 'foo',
            points: [
              {x: NaN, y: NaN},
              {x: NaN, y: NaN},
            ],
          }),
        ],
        {
          foo: buildMetadata({id: 'foo', visible: true}),
        },
        false,
        isFinite,
        isFinite
      );

      expect(actual).toEqual({
        x: undefined,
        y: undefined,
      });
    });

    describe('ignoreOutlier', () => {
      it('filters out outliers in y-extent', () => {
        const actual = computeDataSeriesExtent(
          [
            buildSeries({
              id: 'bar',
              points: [
                {x: 1, y: -100},
                {x: 2, y: 100},
                {x: 3, y: -5},
              ],
            }),
            buildSeries({
              id: 'foo',
              points: [
                {x: 3, y: -5},
                {x: 4, y: 0},
                {x: 5, y: 5},
              ],
            }),
          ],
          {
            foo: buildMetadata({id: 'foo', visible: true}),
            bar: buildMetadata({id: 'bar', visible: true}),
          },
          true,
          isFinite,
          isFinite
        );

        expect(actual).toEqual({
          x: [1, 5],
          y: [-5, 5],
        });
      });

      it('does not filter out values when we have two values', () => {
        const actual = computeDataSeriesExtent(
          [
            buildSeries({
              id: 'foo',
              points: [
                {x: 0, y: NaN},
                {x: 1, y: -100},
                {x: 2, y: 100},
              ],
            }),
          ],
          {
            foo: buildMetadata({id: 'foo', visible: true}),
          },
          true,
          isFinite,
          isFinite
        );

        expect(actual).toEqual({
          x: [0, 2],
          y: [-100, 100],
        });
      });

      it('does not filter out values when they are constant', () => {
        const actual = computeDataSeriesExtent(
          [
            buildSeries({
              id: 'foo',
              points: [
                {x: 0, y: 1},
                {x: 1, y: 1},
                {x: 2, y: 1},
              ],
            }),
          ],
          {
            foo: buildMetadata({id: 'foo', visible: true}),
          },
          true,
          isFinite,
          isFinite
        );

        expect(actual).toEqual({
          x: [0, 2],
          y: [1, 1],
        });
      });

      it('filter out single outlier in values of constant', () => {
        const actual = computeDataSeriesExtent(
          [
            buildSeries({
              id: 'foo',
              points: [
                {x: -1, y: 0},
                {x: 0, y: 1},
                {x: 1, y: 1},
                {x: 2, y: 1},
              ],
            }),
          ],
          {
            foo: buildMetadata({id: 'foo', visible: true}),
          },
          true,
          isFinite,
          isFinite
        );

        expect(actual).toEqual({
          x: [-1, 2],
          y: [1, 1],
        });
      });
    });

    describe('filter for safe value', () => {
      it('calculates extent after filtering based on safeValue predicate', () => {
        const actual = computeDataSeriesExtent(
          [
            buildSeries({
              id: 'foo',
              points: [
                {x: -1, y: 0},
                {x: 0, y: 1},
                {x: 1, y: 2},
                {x: 2, y: 3},
              ],
            }),
          ],
          {
            foo: buildMetadata({id: 'foo', visible: true}),
          },
          true,
          (x: number) => x > 0,
          (y: number) => y < 1
        );

        expect(actual).toEqual({
          x: [1, 2],
          y: [0, 0],
        });
      });

      it('supports usages with line chart scale', () => {
        const xScale = createScale(ScaleType.LOG10);
        const yScale = createScale(ScaleType.LINEAR);

        const actual = computeDataSeriesExtent(
          [
            buildSeries({
              id: 'foo',
              points: [
                {x: -Infinity, y: -100},
                {x: -100, y: NaN},
                {x: 0, y: Infinity},
                {x: 1, y: 2},
                {x: 2, y: 3},
              ],
            }),
          ],
          {
            foo: buildMetadata({id: 'foo', visible: true}),
          },
          false,
          xScale.isSafeNumber,
          yScale.isSafeNumber
        );

        expect(actual).toEqual({
          // Filtered out non-positive values when calculating the extent
          x: [1, 2],
          // Filtered out NaN and non-finite values.
          y: [-100, 3],
        });
      });
    });
  });

  describe('#getRendererType', () => {
    it('returns svg when preferred svg', () => {
      expect(getRendererType(RendererType.SVG)).toBe(RendererType.SVG);
    });

    it('returns webgl if webgl2 is supported', () => {
      spyOn(ChartUtils, 'isWebGl2Supported').and.returnValue(true);
      expect(getRendererType(RendererType.WEBGL)).toBe(RendererType.WEBGL);
    });

    it('returns svg if webgl2 is not supported', () => {
      spyOn(ChartUtils, 'isWebGl2Supported').and.returnValue(false);
      expect(getRendererType(RendererType.WEBGL)).toBe(RendererType.SVG);
    });
  });
});
