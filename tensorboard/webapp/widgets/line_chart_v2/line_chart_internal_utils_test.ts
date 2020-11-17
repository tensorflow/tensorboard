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
  computeDataSeriesExtent,
  getRendererType,
} from './line_chart_internal_utils';
import * as libUtils from './lib/utils';
import {RendererType} from './lib/public_types';
import {buildSeries, buildMetadata} from './lib/testing';

describe('line_chart_v2/line_chart_internal_utils test', () => {
  describe('#computeDataSeriesExtent', () => {
    it('returns min and max from all series', () => {
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
              {x: 0, y: -1},
              {x: -1000, y: 1},
            ],
          }),
        ],
        {
          foo: buildMetadata({id: 'foo', visible: true}),
          bar: buildMetadata({id: 'bar', visible: true}),
        }
      );

      expect(actual).toEqual({x: [-1000, 3], y: [-10, 100]});
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
        }
      );

      expect(actual).toEqual({x: [1, 1], y: [-1, -1]});
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
        }
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
        }
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
        }
      );

      expect(actual).toEqual({x: [-1000, -100], y: [0, 1]});
    });

    it('filters out NaN and keeps infinity', () => {
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
        }
      );

      expect(actual).toEqual({x: [1, 4], y: [-1, Infinity]});
    });

    it('returns infinities when nothing is visible', () => {
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
        }
      );

      expect(actual).toEqual({
        x: undefined,
        y: undefined,
      });
    });

    it('returns infinities when dataSeries is empty', () => {
      const actual = computeDataSeriesExtent([], {});

      expect(actual).toEqual({
        x: undefined,
        y: undefined,
      });
    });

    it('returns infinities when dataSeries is all NaN', () => {
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
        }
      );

      expect(actual).toEqual({
        x: undefined,
        y: undefined,
      });
    });
  });

  describe('#getRendererType', () => {
    it('returns svg when preferred svg', () => {
      expect(getRendererType(RendererType.SVG)).toBe(RendererType.SVG);
    });

    it('returns webgl if webgl2 is supported', () => {
      spyOn(libUtils, 'isWebGl2Supported').and.returnValue(true);
      expect(getRendererType(RendererType.WEBGL)).toBe(RendererType.WEBGL);
    });

    it('returns svg if webgl2 is not supported', () => {
      spyOn(libUtils, 'isWebGl2Supported').and.returnValue(false);
      expect(getRendererType(RendererType.WEBGL)).toBe(RendererType.SVG);
    });
  });
});
