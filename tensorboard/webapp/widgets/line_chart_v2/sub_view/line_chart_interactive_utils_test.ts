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

import {createScale, ScaleType} from '../lib/scale';
import {
  findClosestIndex,
  getProposedViewExtentOnZoom,
} from './line_chart_interactive_utils';

const linearScale = createScale(ScaleType.LINEAR);
const logScale = createScale(ScaleType.LOG10);

describe('line_chart_v2/sub_view/interactive_utils test', () => {
  describe('#findClosestIndex', () => {
    it('finds the closests point in the x dimension', () => {
      const index = findClosestIndex(
        [
          {x: 0, y: 0},
          {x: 10, y: 10},
          {x: 100, y: 100},
          {x: 1000, y: 1000},
        ],
        12
      );
      expect(index).toBe(1);
    });

    it('finds the last ind if x is larger than all points', () => {
      const index = findClosestIndex(
        [
          {x: 0, y: 0},
          {x: 10, y: 10},
          {x: 100, y: 100},
        ],
        200
      );
      expect(index).toBe(2);
    });

    it('finds the first ind if x is smaller than all points', () => {
      const index = findClosestIndex(
        [
          {x: 100, y: 0},
          {x: 101, y: 10},
          {x: 102, y: 100},
        ],
        95
      );
      expect(index).toBe(0);
    });

    it('returns ind of closer x', () => {
      const index = findClosestIndex(
        [
          {x: 100, y: 0},
          {x: 101, y: 10},
          {x: 102, y: 100},
        ],
        101.49999
      );
      expect(index).toBe(1);
    });

    it('returns ind of left when x is in between', () => {
      const index = findClosestIndex(
        [
          {x: 100, y: 0},
          {x: 101, y: 10},
          {x: 102, y: 100},
        ],
        100.5
      );
      expect(index).toBe(0);
    });

    it('returns the last ind when x is NaN', () => {
      const index = findClosestIndex(
        [
          {x: 100, y: 0},
          {x: 101, y: 10},
          {x: 102, y: 100},
        ],
        NaN
      );
      expect(index).toBe(2);
    });
  });

  describe('#getProposedViewExtentOnZoom', () => {
    function buildWheelEvent(
      wheelOption: Partial<WheelEventInit> = {},
      mouseOption: Partial<{offsetX: number; offsetY: number}> = {}
    ): WheelEvent {
      const wheelEventInit: WheelEventInit = {
        deltaMode: WheelEvent.DOM_DELTA_LINE,
        ...wheelOption,
      };
      if (mouseOption.offsetX !== undefined) {
        wheelEventInit.clientX = mouseOption.offsetX;
      }
      if (mouseOption.offsetY !== undefined) {
        wheelEventInit.clientY = mouseOption.offsetY;
      }
      const event = new WheelEvent('wheel', wheelEventInit);

      return event;
    }

    it('returns viewExtent if scroll did not move in y direction', () => {
      const actualExtent = getProposedViewExtentOnZoom(
        buildWheelEvent({deltaX: 10, deltaY: 0}),
        {x: [0, 100], y: [-100, 100]},
        {width: 1000, height: 500},
        1,
        linearScale,
        linearScale
      );
      expect(actualExtent).toEqual({x: [0, 100], y: [-100, 100]});
    });

    // Emulating existing vz_line_chart behavior
    it('zooms out when scroll wheels in positive y direction', () => {
      const actualExtent = getProposedViewExtentOnZoom(
        buildWheelEvent(
          {deltaMode: WheelEvent.DOM_DELTA_LINE, deltaY: 10},
          {offsetX: 500, offsetY: 250}
        ),
        {x: [0, 100], y: [-100, 100]},
        {width: 1000, height: 500},
        1,
        linearScale,
        linearScale
      );
      expect(actualExtent.x[0]).toBeLessThan(0);
      expect(actualExtent.x[1]).toBeGreaterThan(100);
      expect(actualExtent.y[0]).toBeLessThan(-100);
      expect(actualExtent.y[1]).toBeGreaterThan(100);
    });

    it('zooms in when scroll wheels in negative y direction', () => {
      const actualExtent = getProposedViewExtentOnZoom(
        buildWheelEvent(
          {deltaMode: WheelEvent.DOM_DELTA_LINE, deltaY: -10},
          {offsetX: 500, offsetY: 250}
        ),
        {x: [0, 100], y: [-100, 100]},
        {width: 1000, height: 500},
        1,
        linearScale,
        linearScale
      );
      expect(actualExtent.x[0]).toBeGreaterThan(0);
      expect(actualExtent.x[1]).toBeLessThan(100);
      expect(actualExtent.y[0]).toBeGreaterThan(-100);
      expect(actualExtent.y[1]).toBeLessThan(100);
    });

    it('clamps zoom-in so min extent never cross max when scrolled a lot', () => {
      // Scroll speed is 1e100. This is quite large that slight movement in deltaY
      // will zoom almost into the middle of the chart.
      const actualExtent = getProposedViewExtentOnZoom(
        buildWheelEvent(
          {deltaMode: WheelEvent.DOM_DELTA_LINE, deltaY: -1},
          {offsetX: 500, offsetY: 250}
        ),
        {x: [0, 100], y: [-100, 100]},
        {width: 1000, height: 500},
        1e100,
        linearScale,
        linearScale
      );
      expect(actualExtent.x[0]).toBeGreaterThan(0);
      expect(actualExtent.x[1]).toBeLessThan(100);
      expect(actualExtent.x[0]).toBeLessThanOrEqual(actualExtent.x[1]);
      expect(actualExtent.x[0]).toBeCloseTo(50, -1);
      // Should be right in between.
      expect(actualExtent.x[1]).toBeCloseTo(50, -1);
    });

    it('zooms in closer to cursor position', () => {
      const actualExtent = getProposedViewExtentOnZoom(
        buildWheelEvent(
          {deltaMode: WheelEvent.DOM_DELTA_LINE, deltaY: -1},
          {offsetX: 250, offsetY: 125}
        ),
        {x: [0, 100], y: [-100, 100]},
        {width: 1000, height: 500},
        1,
        linearScale,
        linearScale
      );
      expect(actualExtent.x[0]).toBeGreaterThan(0);
      expect(actualExtent.x[1]).toBeLessThan(100);
      expect(actualExtent.x[0] - 0).toBeLessThan(100 - actualExtent.x[1]);

      expect(actualExtent.y[0]).toBeGreaterThan(-100);
      expect(actualExtent.y[1]).toBeLessThan(100);
      expect(actualExtent.y[0] - 100).toBeLessThan(100 - actualExtent.y[1]);
    });

    it('zooms in correctly at edges of the interactive layer', () => {
      const actualExtent = getProposedViewExtentOnZoom(
        buildWheelEvent(
          {deltaMode: WheelEvent.DOM_DELTA_LINE, deltaY: -1},
          {offsetX: 1000, offsetY: 0}
        ),
        {x: [0, 100], y: [-100, 100]},
        {width: 1000, height: 500},
        1,
        linearScale,
        linearScale
      );
      expect(actualExtent.x[0]).toBeGreaterThan(0);
      expect(actualExtent.x[1]).toBe(100);

      // Note that our cursor at offsetY=0 which is top of the DOM. When scrolling at the
      // top of the chart, our y-max should not change.
      expect(actualExtent.y[0]).toBeGreaterThan(-100);
      expect(actualExtent.y[1]).toBe(100);
    });

    it('accounts for scale when zooming in', () => {
      const actualExtent = getProposedViewExtentOnZoom(
        buildWheelEvent(
          {deltaMode: WheelEvent.DOM_DELTA_LINE, deltaY: -1},
          {offsetX: 500, offsetY: 75}
        ),
        {x: [1, 1000], y: [0.01, 100]},
        {width: 1000, height: 100},
        0.01,
        logScale,
        logScale
      );
      // We zoomed right in the middle in X axis where extent is 1, 1000. Actual extent
      // should be zoomed in "equidistantly" in log10 scale.
      // log_10(1.318) = 0.1199, exp_10(log_10(1000) - 0.1199) ~ 758.75.
      expect(actualExtent.x[0]).toBeCloseTo(1.318, 1);
      expect(actualExtent.x[1]).toBeCloseTo(758.577, 1);

      expect(actualExtent.y[0]).toBeCloseTo(0.012, 2);
      expect(actualExtent.y[1]).toBeCloseTo(57.5, 0);
    });
  });
});
