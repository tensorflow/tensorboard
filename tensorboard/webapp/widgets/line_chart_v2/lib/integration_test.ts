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
import {buildMetadata, createSeries} from './testing';

describe('line_chart_v2/lib/integration test', () => {
  let dom: SVGElement;
  let callbacks: ChartCallbacks;
  let chart: ChartImpl;
  let rafSpy: jasmine.Spy;

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
    };
    chart = new ChartImpl({
      type: RendererType.SVG,
      container: dom,
      callbacks,
      domDimension: {width: 200, height: 100},
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
  });
});
