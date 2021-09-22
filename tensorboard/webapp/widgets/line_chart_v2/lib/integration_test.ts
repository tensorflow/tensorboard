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

import {ChartImpl, TEST_ONLY} from './chart';
import {ChartCallbacks, RendererType, ScaleType} from './public_types';
import {
  assertSvgPathD,
  buildMetadata,
  buildSeries,
  createSeries,
} from './testing';

describe('line_chart_v2/lib/integration test', () => {
  let dom: SVGElement;
  let callbacks: ChartCallbacks;
  let chart: ChartImpl;
  let rafSpy: jasmine.Spy;

  function getDomChildren(): ReadonlyArray<SVGElement> {
    return dom.children as unknown as ReadonlyArray<SVGElement>;
  }

  beforeEach(() => {
    rafSpy = spyOn(TEST_ONLY.util, 'requestAnimationFrame').and.callFake(
      (cb: FrameRequestCallback) => {
        cb(0);
        return 0;
      }
    );
    dom = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    callbacks = {
      onDrawEnd: jasmine.createSpy(),
      onContextLost: jasmine.createSpy(),
    };
    chart = new ChartImpl({
      type: RendererType.SVG,
      container: dom,
      callbacks,
      domDimension: {width: 200, height: 100},
      useDarkMode: false,
    });
    chart.setXScaleType(ScaleType.LINEAR);
    chart.setYScaleType(ScaleType.LINEAR);
  });

  describe('render', () => {
    it('renders data', () => {
      chart.setMetadata({
        line: buildMetadata({id: 'line', visible: true}),
      });
      chart.setViewBox({x: [0, 10], y: [0, 10]});

      expect(dom.children.length).toBe(0);

      chart.setData([createSeries('line', (index) => index)]);

      expect(dom.children.length).toBe(1);
      const path = dom.children[0] as SVGPathElement;
      expect(path.tagName).toBe('path');
      expect(path.getAttribute('d')).toBe(
        'M0,100L20,90L40,80L60,70L80,60L100,50L120,40L140,30L160,20L180,10'
      );
    });

    it('handles data without metadata', () => {
      chart.setMetadata({});
      chart.setViewBox({x: [0, 10], y: [0, 10]});

      chart.setData([createSeries('line', (index) => index)]);

      expect(dom.children.length).toBe(0);
    });

    it('handles metadata without data', () => {
      chart.setMetadata({
        line1: buildMetadata({id: 'line1', visible: true}),
        line2: buildMetadata({id: 'line2', visible: true}),
      });
      chart.setViewBox({x: [0, 10], y: [0, 10]});
      chart.setData([createSeries('line1', (index) => index)]);

      expect(dom.children.length).toBe(1);
    });
  });

  describe('chart update', () => {
    it('updates lines on data and metadata changes', () => {
      chart.setMetadata({
        line1: buildMetadata({id: 'line1', visible: true}),
        line2: buildMetadata({id: 'line2', visible: true}),
      });
      chart.setViewBox({x: [0, 10], y: [0, 20]});
      chart.setData([createSeries('line1', (index) => index)]);

      expect(dom.children.length).toBe(1);
      const path1 = dom.children[0] as SVGPathElement;
      expect(path1.getAttribute('d')).toBe(
        'M0,100L20,95L40,90L60,85L80,80L100,75L120,70L140,65L160,60L180,55'
      );
      expect(path1.style.display).toBe('');

      chart.setData([
        createSeries('line1', (index) => index),
        createSeries('line2', (index) => index * 2),
      ]);
      expect(dom.children.length).toBe(2);
      const path2 = dom.children[1] as SVGPathElement;
      expect(path2.getAttribute('d')).toBe(
        (
          'M0,100 L20,90 L40,80 L60,70 L80,60 L100,50 L120,40 L140,30 L160,20 ' +
          'L180,10'
        ).replace(/ /g, '')
      );

      chart.setMetadata({
        line1: buildMetadata({id: 'line1', visible: false}),
        line2: buildMetadata({id: 'line2', visible: true}),
      });

      expect(dom.children.length).toBe(2);
      const path1After = dom.children[0] as SVGPathElement;
      expect(path1After.style.display).toBe('none');
    });

    it('updates on viewBox changes', () => {
      chart.setMetadata({
        line: buildMetadata({id: 'line', visible: true}),
      });
      chart.setViewBox({x: [0, 10], y: [0, 20]});
      chart.setData([createSeries('line', (index) => index)]);

      const path = dom.children[0] as SVGPathElement;
      expect(path.getAttribute('d')).toBe(
        (
          'M0,100 L20,95 L40,90 L60,85 L80,80 L100,75 L120,70 L140,65 L160,60 ' +
          'L180,55'
        ).replace(/ /g, '')
      );

      chart.setViewBox({x: [0, 10], y: [0, 10]});
      expect(path.getAttribute('d')).toBe(
        (
          'M0,100 L20,90 L40,80 L60,70 L80,60 L100,50 L120,40 L140,30 L160,20 ' +
          'L180,10'
        ).replace(/ /g, '')
      );
    });

    it('updates once a requestAnimationFrame', () => {
      chart.setMetadata({
        line: buildMetadata({id: 'line', visible: true}),
      });
      chart.setViewBox({x: [0, 10], y: [0, 100]});
      chart.setData([createSeries('line', (index) => index)]);

      const path = dom.children[0] as SVGPathElement;
      const pathDBefore = path.getAttribute('d');

      const rafCallbacks: FrameRequestCallback[] = [];
      rafSpy.and.callFake((cb: FrameRequestCallback) => {
        return rafCallbacks.push(cb);
      });

      chart.setViewBox({x: [0, 10], y: [0, 1]});

      expect(rafCallbacks.length).toBe(1);
      expect(path.getAttribute('d')).toBe(pathDBefore);

      rafCallbacks.shift()!(1);

      expect(path.getAttribute('d')).not.toBe(pathDBefore);

      chart.setViewBox({x: [0, 10], y: [0, 20]});
      chart.setViewBox({x: [0, 10], y: [0, 10]});
      expect(rafCallbacks.length).toBe(1);
    });

    it('invokes onDrawEnd after a repaint', () => {
      // Could have been called in beforeEach. Reset.
      (callbacks.onDrawEnd as jasmine.Spy).calls.reset();
      const rafCallbacks: FrameRequestCallback[] = [];
      rafSpy.and.callFake((cb: FrameRequestCallback) => {
        return rafCallbacks.push(cb);
      });

      chart.setMetadata({
        line: buildMetadata({id: 'line', visible: true}),
      });
      chart.setData([createSeries('line', (index) => index)]);
      chart.setViewBox({x: [0, 10], y: [0, 1]});

      rafCallbacks.shift()!(0);

      expect(callbacks.onDrawEnd).toHaveBeenCalledTimes(1);
    });

    it('updates line when axis changes', () => {
      chart.resize({width: 100, height: 100});
      chart.setMetadata({
        line: buildMetadata({id: 'line', visible: true}),
      });
      chart.setViewBox({x: [1, 100], y: [0, 10]});
      chart.setData([
        {
          id: 'line',
          points: [
            {x: 1, y: 10},
            {x: 10, y: 5},
            {x: 100, y: 6},
          ],
        },
      ]);

      expect(dom.children.length).toBe(1);
      const before = dom.children[0] as SVGPathElement;
      expect(before.tagName).toBe('path');
      expect(before.getAttribute('d')).toBe('M0,0L9.090909004211426,50L100,40');

      chart.setXScaleType(ScaleType.LOG10);
      expect(dom.children.length).toBe(1);
      const after = dom.children[0] as SVGPathElement;
      expect(after.tagName).toBe('path');
      expect(after.getAttribute('d')).toBe('M0,0L50,50L100,40');
    });
  });

  describe('null handling', () => {
    function isTriangle(el: Element): boolean {
      return el.classList.contains('triangle');
    }

    it('renders all NaNs as triangles at 0s (with size of 12)', () => {
      chart.resize({width: 100, height: 100});
      chart.setViewBox({x: [0, 100], y: [0, 100]});
      chart.setMetadata({line: buildMetadata({id: 'line', visible: true})});
      chart.setData([
        buildSeries({
          id: 'line',
          points: [
            {x: 0, y: NaN},
            {x: 50, y: NaN},
            {x: 100, y: NaN},
          ],
        }),
      ]);

      const children = getDomChildren();
      expect(children.length).toBe(3);
      const [triangle1, triangle2, triangle3] = children;
      expect(isTriangle(triangle1)).toBe(true);
      assertSvgPathD(triangle1, [
        [-6, 103],
        [6, 103],
        [0, 93],
      ]);

      expect(isTriangle(triangle2)).toBe(true);
      assertSvgPathD(triangle2, [
        [44, 103],
        [56, 103],
        [50, 93],
      ]);

      expect(isTriangle(triangle3)).toBe(true);
      assertSvgPathD(triangle3, [
        [94, 103],
        [106, 103],
        [100, 93],
      ]);
    });

    it('breaks line into parts when NaN appears in the middle', () => {
      chart.resize({width: 10, height: 10});
      chart.setViewBox({x: [0, 10], y: [0, 10]});
      chart.setMetadata({line: buildMetadata({id: 'line', visible: true})});
      chart.setData([
        buildSeries({
          id: 'line',
          points: [
            {x: 1, y: 1},
            {x: 3, y: 5},
            {x: 5, y: NaN},
            {x: 7, y: 1},
            {x: 9, y: 10},
          ],
        }),
      ]);

      const children = getDomChildren();
      expect(children.length).toBe(3);
      const [line1, triangle, line2] = children;

      expect(isTriangle(line1)).toBe(false);
      assertSvgPathD(line1, [
        [1, 9],
        [3, 5],
      ]);
      expect(isTriangle(triangle)).toBe(true);
      assertSvgPathD(triangle, [
        [-1, 8],
        [11, 8],
        [5, -2],
      ]);
      expect(isTriangle(line2)).toBe(false);
      assertSvgPathD(line2, [
        [7, 9],
        [9, 0],
      ]);
    });

    it('puts first NaN value in place of NaN when starts with NaN', () => {
      chart.resize({width: 10, height: 10});
      chart.setViewBox({x: [0, 10], y: [0, 10]});
      chart.setMetadata({line: buildMetadata({id: 'line', visible: true})});
      chart.setData([
        buildSeries({
          id: 'line',
          points: [
            {x: 1, y: NaN},
            {x: 3, y: NaN},
            {x: 5, y: 5},
            {x: 7, y: 1},
            {x: 9, y: 10},
          ],
        }),
      ]);

      const children = getDomChildren();
      expect(children.length).toBe(3);
      const [triangle1, triangle2, line] = children;

      expect(isTriangle(triangle1)).toBe(true);
      assertSvgPathD(triangle1, [
        [-5, 8],
        [7, 8],
        [1, -2],
      ]);
      expect(isTriangle(triangle2)).toBe(true);
      assertSvgPathD(triangle2, [
        [-3, 8],
        [9, 8],
        [3, -2],
      ]);
      expect(isTriangle(line)).toBe(false);
      assertSvgPathD(line, [
        [5, 5],
        [7, 9],
        [9, 0],
      ]);
    });

    it('renders triangle for trailing NaNs', () => {
      chart.resize({width: 10, height: 10});
      chart.setViewBox({x: [0, 10], y: [0, 10]});
      chart.setMetadata({line: buildMetadata({id: 'line', visible: true})});
      chart.setData([
        buildSeries({
          id: 'line',
          points: [
            {x: 1, y: 10},
            {x: 3, y: 0},
            {x: 7, y: NaN},
            {x: 9, y: NaN},
          ],
        }),
      ]);

      const children = getDomChildren();
      expect(children.length).toBe(3);
      const [line, triangle1, triangle2] = children;

      expect(isTriangle(line)).toBe(false);
      assertSvgPathD(line, [
        [1, 0],
        [3, 10],
      ]);

      expect(isTriangle(triangle1)).toBe(true);
      assertSvgPathD(triangle1, [
        [1, 13],
        [13, 13],
        [7, 3],
      ]);
      expect(isTriangle(triangle2)).toBe(true);
      assertSvgPathD(triangle2, [
        [3, 13],
        [15, 13],
        [9, 3],
      ]);
    });

    it('renders circle for single non-NaN point in between NaNs', () => {
      chart.resize({width: 10, height: 10});
      chart.setViewBox({x: [0, 10], y: [0, 10]});
      chart.setMetadata({line: buildMetadata({id: 'line', visible: true})});
      chart.setData([
        buildSeries({
          id: 'line',
          points: [
            {x: 1, y: NaN},
            {x: 2, y: 5},
            {x: 3, y: NaN},
          ],
        }),
      ]);

      const children = getDomChildren();
      expect(children.length).toBe(3);
      const [triangle1, circle, triangle2] = children;

      expect(isTriangle(triangle1)).toBe(true);
      expect(isTriangle(triangle2)).toBe(true);
      expect(circle.nodeName).toBe('circle');
      expect(circle.getAttribute('cx')).toBe('2');
      expect(circle.getAttribute('cy')).toBe('5');
    });

    it('renders circle for aux but not NaNs', () => {
      chart.resize({width: 10, height: 10});
      chart.setViewBox({x: [0, 10], y: [0, 10]});
      chart.setMetadata({
        aux: buildMetadata({id: 'aux', visible: true, aux: true}),
      });
      chart.setData([
        buildSeries({
          id: 'aux',
          points: [
            {x: -1, y: 5},
            {x: 0, y: 5},
            {x: 1, y: NaN},
            {x: 2, y: 5},
            {x: 3, y: NaN},
          ],
        }),
      ]);

      const children = getDomChildren();
      expect(children.length).toBe(2);
      const [line, circle] = children;

      expect(isTriangle(line)).toBe(false);
      expect(isTriangle(circle)).toBe(false);
      assertSvgPathD(line, [
        [-1, 5],
        [0, 5],
      ]);
      expect(circle.nodeName).toBe('circle');
      expect(circle.getAttribute('cx')).toBe('2');
      expect(circle.getAttribute('cy')).toBe('5');
    });
  });

  describe('webgl', () => {
    it('invokes onContextLost after losing webgl context', async () => {
      const canvas = document.createElement('canvas');
      chart = new ChartImpl({
        type: RendererType.WEBGL,
        container: canvas,
        callbacks,
        domDimension: {width: 200, height: 100},
        useDarkMode: false,
        devicePixelRatio: 1,
      });
      chart.setXScaleType(ScaleType.LINEAR);
      chart.setYScaleType(ScaleType.LINEAR);

      expect(callbacks.onContextLost).not.toHaveBeenCalled();

      // For more info about forcing context loss, see
      // https://developer.mozilla.org/en-US/docs/Web/API/WEBGL_lose_context/loseContext
      const glExtension = canvas
        .getContext('webgl2')
        ?.getExtension('WEBGL_lose_context');
      if (!glExtension) {
        console.log(
          'The browser used for testing does not ' +
            'support WebGL or extensions needed for testing.'
        );
        return;
      }

      // The `loseContext` triggers the event asynchronously, which.
      const contextLostPromise = new Promise((resolve) => {
        canvas.addEventListener('webglcontextlost', resolve);
      });
      glExtension.loseContext();

      await contextLostPromise;
      expect(callbacks.onContextLost).toHaveBeenCalledTimes(1);
    });
  });
});
