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
import * as THREE from 'three';

import {ThreeCoordinator} from '../threejs_coordinator';
import {Polyline} from '../internal_types';
import {SvgRenderer} from './svg_renderer';
import {ThreeRenderer} from './threejs_renderer';

describe('line_chart_v2/lib/renderer test', () => {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const DEFAULT_LINE_OPTIONS = {visible: true, color: '#f00', width: 6};

  describe('svg renderer', () => {
    let renderer: SvgRenderer;
    let el: SVGElement;

    beforeEach(() => {
      el = document.createElementNS(SVG_NS, 'svg');
      renderer = new SvgRenderer(el);
    });

    it('creates a line', () => {
      expect(el.children.length).toBe(0);

      renderer.createOrUpdateLineObject(
        null,
        new Float32Array([0, 10, 10, 100]),
        {visible: true, color: '#f00', width: 6}
      );

      expect(el.children.length).toBe(1);
      const path = el.children[0] as SVGPathElement;
      expect(path.tagName).toBe('path');
      expect(path.getAttribute('d')).toBe('M0,10L10,100');
      expect(path.style.stroke).toBe('rgb(255, 0, 0)');
      expect(path.style.strokeWidth).toBe('6');
      expect(path.style.display).toBe('');
    });

    it('updates a cached path and styles', () => {
      const cacheObject = renderer.createOrUpdateLineObject(
        null,
        new Float32Array([0, 10, 10, 100]),
        {visible: true, color: '#f00', width: 6}
      );

      renderer.createOrUpdateLineObject(
        cacheObject,
        new Float32Array([0, 5, 5, 50]),
        {visible: true, color: '#0f0', width: 3}
      );

      expect(el.children.length).toBe(1);
      const path = el.children[0] as SVGPathElement;
      expect(path.tagName).toBe('path');
      expect(path.getAttribute('d')).toBe('M0,5L5,50');
      expect(path.style.stroke).toBe('rgb(0, 255, 0)');
      expect(path.style.strokeWidth).toBe('3');
      expect(path.style.display).toBe('');
    });

    it('updates a cached path to an empty polyline', () => {
      const cacheObject = renderer.createOrUpdateLineObject(
        null,
        new Float32Array([0, 10, 10, 100]),
        {visible: true, color: '#f00', width: 6}
      );

      renderer.createOrUpdateLineObject(cacheObject, new Float32Array(0), {
        visible: true,
        color: '#0f0',
        width: 3,
      });

      expect(el.children.length).toBe(1);
      const path = el.children[0] as SVGPathElement;
      expect(path.tagName).toBe('path');
      expect(path.getAttribute('d')).toBe('');
      // While it is possible to update minimally and only change the path or visibility,
      // such optimization is a bit too premature without a clear benefit.
      expect(path.style.stroke).toBe('rgb(0, 255, 0)');
      expect(path.style.strokeWidth).toBe('3');
      expect(path.style.display).toBe('');
    });

    it('skips updating path and color if visibility goes from true to false', () => {
      const cacheObject = renderer.createOrUpdateLineObject(
        null,
        new Float32Array([0, 10, 10, 100]),
        {visible: true, color: '#f00', width: 6}
      );

      renderer.createOrUpdateLineObject(
        cacheObject,
        new Float32Array([0, 5, 5, 50]),
        {visible: false, color: '#0f0', width: 3}
      );

      expect(el.children.length).toBe(1);
      const path = el.children[0] as SVGPathElement;
      expect(path.tagName).toBe('path');
      expect(path.style.display).toBe('none');
      expect(path.getAttribute('d')).toBe('M0,10L10,100');
      expect(path.style.stroke).toBe('rgb(255, 0, 0)');
      expect(path.style.strokeWidth).toBe('6');
    });

    it('skips rendering DOM when a new cacheId starts with visible=false', () => {
      renderer.createOrUpdateLineObject(
        null,
        new Float32Array([0, 10, 10, 100]),
        {visible: false, color: '#f00', width: 6}
      );

      expect(el.children.length).toBe(0);
    });
  });

  describe('threejs renderer', () => {
    let renderer: ThreeRenderer;
    let scene: THREE.Scene;

    function assertLine(line: THREE.Line, polyline: Polyline) {
      const geometry = line.geometry as THREE.BufferGeometry;
      const positions = geometry.getAttribute(
        'position'
      ) as THREE.BufferAttribute;
      let positionIndex = 0;
      for (
        let polylineIndex = 0;
        polylineIndex < polyline.length;
        polylineIndex += 2
      ) {
        const expectedX = polyline[polylineIndex];
        const expectedY = polyline[polylineIndex + 1];
        const actualX = positions.array[positionIndex++];
        const actualY = positions.array[positionIndex++];
        const actualZ = positions.array[positionIndex++];
        expect(actualX).toBe(expectedX);
        expect(actualY).toBe(expectedY);
        expect(actualZ).toBe(0);
      }
    }

    function assertMaterial(
      line: THREE.Line,
      longHexString: string,
      visibility: boolean
    ) {
      const material = line.material as THREE.LineBasicMaterial;
      expect(material.visible).toBe(visibility);
      expect(material.color.getHexString()).toBe(longHexString.slice(1));
    }

    beforeEach(() => {
      scene = new THREE.Scene();
      spyOn(THREE, 'Scene').and.returnValue(scene);

      const canvas = document.createElement('canvas');
      const coordinator = new ThreeCoordinator();
      renderer = new ThreeRenderer(canvas, coordinator, 2);
    });

    it('creates a line', () => {
      renderer.createOrUpdateLineObject(
        null,
        new Float32Array([0, 10, 10, 100]),
        {visible: true, color: '#f00', width: 6}
      );

      expect(scene.children.length).toBe(1);
      const lineObject = scene.children[0] as THREE.Line;
      expect(lineObject).toBeInstanceOf(THREE.Line);
      assertLine(lineObject, new Float32Array([0, 10, 10, 100]));
      assertMaterial(lineObject, '#ff0000', true);
    });

    it('updates cached path and styles', () => {
      const cacheObject = renderer.createOrUpdateLineObject(
        null,
        new Float32Array([0, 10, 10, 100]),
        {visible: true, color: '#f00', width: 6}
      );

      renderer.createOrUpdateLineObject(
        cacheObject,
        new Float32Array([0, 5, 5, 50, 10, 100]),
        {visible: true, color: '#0f0', width: 3}
      );

      const lineObject = scene.children[0] as THREE.Line;
      assertLine(lineObject, new Float32Array([0, 5, 5, 50, 10, 100]));
      assertMaterial(lineObject, '#00ff00', true);
    });

    it('updates object when going from non-emtpy polyline to an empty one', () => {
      const cacheObject = renderer.createOrUpdateLineObject(
        null,
        new Float32Array([0, 10, 10, 100]),
        {visible: true, color: '#f00', width: 6}
      );

      renderer.createOrUpdateLineObject(cacheObject, new Float32Array(0), {
        visible: true,
        color: '#0f0',
        width: 3,
      });

      const lineObject = scene.children[0] as THREE.Line;
      assertLine(lineObject, new Float32Array(0));
      assertMaterial(lineObject, '#00ff00', true);
    });

    it('does not update color and paths when visibility go from true to false', () => {
      const cachedObject = renderer.createOrUpdateLineObject(
        null,
        new Float32Array([0, 10, 10, 100]),
        {visible: true, color: '#f00', width: 6}
      );

      renderer.createOrUpdateLineObject(
        cachedObject,
        new Float32Array([0, 5, 5, 50, 10, 100]),
        {visible: false, color: '#0f0', width: 3}
      );

      const lineObject = scene.children[0] as THREE.Line;
      assertLine(lineObject, new Float32Array([0, 10, 10, 100]));
      assertMaterial(lineObject, '#ff0000', false);
    });

    it('skips rendering if render starts with visibility=false ', () => {
      renderer.createOrUpdateLineObject(null, new Float32Array([0, 1, 0, 1]), {
        ...DEFAULT_LINE_OPTIONS,
        visible: false,
      });

      expect(scene.children.length).toBe(0);
    });
  });
});
