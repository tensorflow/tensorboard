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

import {Coordinator} from './coordinator';
import {SvgRenderer} from './renderer/svg_renderer';
import {DataDrawable, DrawableConfig} from './drawable';
import {DataSeries} from './types';

class TestableDataDrawable extends DataDrawable {
  redraw(): void {
    const metadataMap = this.getMetadataMap();
    for (const data of this.series) {
      const metadata = metadataMap[data.id];
      this.paintBrush.setLine(data.id, data.polyline, {
        width: 1,
        color: metadata.color,
        visible: metadata.visible,
      });
    }
  }
  getSeriesData() {
    return this.series;
  }
}

function buildSeries(override: Partial<DataSeries>): DataSeries {
  return {
    id: 'foo',
    points: [
      {x: 0, y: -1},
      {x: 1, y: -0.5},
      {x: 2, y: 0},
      {x: 3, y: 0.5},
      {x: 4, y: 1},
    ],
    ...override,
  };
}

describe('line_chart_v2/lib/drawable test', () => {
  let options: DrawableConfig;
  let root: TestableDataDrawable;
  let redrawSpy: jasmine.Spy;
  let svg: SVGElement;
  let getMetadataMap: jasmine.Spy;

  beforeEach(() => {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

    getMetadataMap = jasmine.createSpy().and.returnValue({
      foo: {
        color: '#f00',
        visible: true,
      },
    });

    options = {
      coordinator: new Coordinator(),
      renderer: new SvgRenderer(svg),
      getMetadataMap,
    };
    root = new TestableDataDrawable(options);
    root.setData([buildSeries({id: 'foo'})]);
    options.coordinator.setViewBoxRect({x: 0, y: -1, width: 5, height: 1});
    root.setLayoutRect({x: 0, y: 0, width: 100, height: 100});
    redrawSpy = spyOn(root, 'redraw');
  });

  describe('draw frame', () => {
    it('invokes redraw on empty data', () => {
      root.internalOnlyDrawFrame();

      expect(redrawSpy).toHaveBeenCalledTimes(1);
    });

    it('does not re-render if paint is not dirty', () => {
      root.internalOnlyDrawFrame();

      expect(redrawSpy).toHaveBeenCalledTimes(1);

      // Nothing changed for paint to be dirty.
      root.internalOnlyDrawFrame();
      expect(redrawSpy).toHaveBeenCalledTimes(1);
    });

    it('re-renders if explictly marked as dirty', () => {
      root.internalOnlyDrawFrame();
      root.markAsPaintDirty();
      root.internalOnlyDrawFrame();

      expect(redrawSpy).toHaveBeenCalledTimes(2);
    });

    // If the dimension of the DOM changes, even if the data has not changed, we need to
    // repaint.
    it('re-renders if layout has changed', () => {
      root.internalOnlyDrawFrame();
      root.setLayoutRect({x: 0, y: 0, width: 200, height: 200});

      expect(redrawSpy).toHaveBeenCalledTimes(1);

      root.internalOnlyDrawFrame();

      expect(redrawSpy).toHaveBeenCalledTimes(2);
    });

    it('manages the DOM cache', () => {
      // Use the real redraw and update SVG.
      redrawSpy.and.callThrough();
      getMetadataMap = getMetadataMap.and.returnValue({
        foo: {
          color: '#f00',
          visible: true,
        },
        bar: {
          color: '#0f0',
          visible: true,
        },
      });

      root.setData([buildSeries({id: 'foo', points: [{x: 0, y: 1}]})]);
      root.internalOnlyDrawFrame();

      expect(svg.children.length).toBe(1);
      const path1 = svg.children[0];
      // Sanity check; real test is in renderer_test.
      expect(path1.tagName).toBe('path');
      const pathD1 = path1.getAttribute('d')!;

      root.setData([
        buildSeries({
          id: 'foo',
          points: [
            {x: 0, y: 1},
            {x: 0, y: 0},
          ],
        }),
      ]);
      root.internalOnlyDrawFrame();
      expect(svg.children.length).toBe(1);
      const path2 = svg.children[0];
      const pathD2 = path2.getAttribute('d')!;
      // Same DOM node
      expect(path2).toBe(path1);
      expect(pathD2).not.toBe(pathD1);
      expect(pathD2.length).toBeGreaterThan(pathD1.length);

      root.setData([
        buildSeries({
          id: 'bar',
          points: [{x: 0, y: 0}],
        }),
      ]);
      root.internalOnlyDrawFrame();
      expect(svg.children.length).toBe(1);
      const path3 = svg.children[0];
      expect(path3).not.toEqual(path2);
    });
  });

  describe('data coordinate transformation', () => {
    beforeEach(() => {
      const domRect = {x: 0, y: 0, width: 100, height: 100};
      root.setLayoutRect(domRect);

      const dataSeries = [
        buildSeries({
          id: 'foo',
          points: [
            {x: 0, y: 0},
            {x: 1, y: 1},
            {x: 2, y: -1},
          ],
        }),
        buildSeries({
          id: 'bar',
          points: [
            {x: 0, y: 0},
            {x: 1, y: -10},
            {x: 2, y: 10},
          ],
        }),
      ];
      root.setData(dataSeries);
      options.coordinator.setViewBoxRect({x: 0, y: -50, width: 2, height: 100});
      options.coordinator.setDomContainerRect(domRect);
    });

    it('updates the data coordinate on redraw', () => {
      root.internalOnlyDrawFrame();

      expect(root.getSeriesData()).toEqual([
        {id: 'foo', polyline: new Float32Array([0, 50, 50, 49, 100, 51])},
        {id: 'bar', polyline: new Float32Array([0, 50, 50, 60, 100, 40])},
      ]);
    });

    it('updates and redraws when the data changes', () => {
      root.internalOnlyDrawFrame();

      root.setData([
        {
          id: 'foo',
          points: [
            {x: 0, y: 0},
            {x: 1, y: 10},
            {x: 2, y: -10},
          ],
        },
        {
          id: 'bar',
          points: [
            {x: 0, y: 0},
            {x: 1, y: 50},
            {x: 2, y: -50},
          ],
        },
      ]);
      expect(redrawSpy).toHaveBeenCalledTimes(1);
      root.setData([
        {
          id: 'foo',
          points: [
            {x: 0, y: 0},
            {x: 1, y: 50},
            {x: 2, y: -50},
          ],
        },
        {
          id: 'bar',
          points: [
            {x: 0, y: 0},
            {x: 1, y: 0},
            {x: 2, y: 0},
          ],
        },
      ]);

      root.internalOnlyDrawFrame();
      expect(root.getSeriesData()).toEqual([
        {id: 'foo', polyline: new Float32Array([0, 50, 50, 0, 100, 100])},
        {id: 'bar', polyline: new Float32Array([0, 50, 50, 50, 100, 50])},
      ]);
      expect(redrawSpy).toHaveBeenCalledTimes(2);
    });
  });
});
