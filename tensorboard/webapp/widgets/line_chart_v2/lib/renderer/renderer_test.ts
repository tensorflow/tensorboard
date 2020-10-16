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
import {Paths} from '../types';
import {IRenderer} from './renderer_types';
import {SvgRenderer} from './svg_renderer';
import {ThreeRenderer} from './threejs_renderer';

describe('line_chart_v2/lib/renderer test', () => {
  let renderer: IRenderer;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const DEFAULT_LINE_OPTIONS = {visible: true, color: '#f00', width: 6};

  function render(draw: () => void) {
    renderer.renderGroup('test', () => {
      draw();
    });
    renderer.flush();
  }

  describe('basic operations', () => {
    let el: SVGElement;

    beforeEach(() => {
      el = document.createElementNS(SVG_NS, 'svg');
      renderer = new SvgRenderer(el);
    });

    it('renders when invoked `drawLine` in a renderGroup', () => {
      expect(el.children.length).toBe(0);

      render(() => {
        renderer.drawLine(
          'line',
          new Float32Array([0, 10, 10, 100]),
          DEFAULT_LINE_OPTIONS
        );
      });

      // Assertion of the correctness of svg renderer is in svg renderer.
      expect(el.children.length).toBe(1);
    });

    it('reuses DOM when updated', () => {
      render(() => {
        renderer.drawLine('line', new Float32Array([0, 10, 10, 100]), {
          ...DEFAULT_LINE_OPTIONS,
          visible: true,
        });
      });
      const pathLineBefore = el.children[0] as SVGPathElement;

      render(() => {
        renderer.drawLine('line', new Float32Array([0, 10, 10, 100]), {
          ...DEFAULT_LINE_OPTIONS,
          visible: false,
        });
      });
      const pathLineAfter = el.children[0] as SVGPathElement;

      expect(pathLineBefore).toBe(pathLineAfter);
      // visibility changed.
      expect(pathLineAfter.style.display).toBe('none');
    });

    it('removes, automatically, items that are not rendered after an update', () => {
      render(() => {
        renderer.drawLine(
          'line',
          new Float32Array([0, 10, 10, 100]),
          DEFAULT_LINE_OPTIONS
        );
      });

      render(() => {});

      expect(el.children.length).toBe(0);
    });

    it('does not recycle DOM for a different cache id', () => {
      render(() => {
        renderer.drawLine('line1', new Float32Array([0, 10, 10, 100]), {
          visible: true,
          color: '#f00',
          width: 6,
        });
      });

      const [pathLine1] = el.children;

      render(() => {
        renderer.drawLine('line2', new Float32Array([5, 10, 5, 10]), {
          visible: true,
          color: '#00f',
          width: 1,
        });
      });

      const [pathLine2] = el.children;
      expect(el.children.length).toBe(1);
      expect(pathLine1).not.toBe(pathLine2);
    });

    it('throws when rendered without using renderGroup', () => {
      expect(() => {
        renderer.drawLine(
          'line2',
          new Float32Array([5, 10]),
          DEFAULT_LINE_OPTIONS
        );
      }).toThrowError(RangeError);
    });
  });

  describe('svg renderer', () => {
    let el: SVGElement;

    beforeEach(() => {
      el = document.createElementNS(SVG_NS, 'svg');
      renderer = new SvgRenderer(el);
    });

    it('renders a line', () => {
      expect(el.children.length).toBe(0);

      render(() => {
        renderer.drawLine('line', new Float32Array([0, 10, 10, 100]), {
          visible: true,
          color: '#f00',
          width: 6,
        });
      });

      expect(el.children.length).toBe(1);
      const path = el.children[0] as SVGPathElement;
      expect(path.tagName).toBe('path');
      expect(path.getAttribute('d')).toBe('M0,10L10,100');
      expect(path.style.stroke).toBe('rgb(255, 0, 0)');
      expect(path.style.strokeWidth).toBe('6');
      expect(path.style.display).toBe('');
    });

    it('updates path and styles', () => {
      render(() => {
        renderer.drawLine('line', new Float32Array([0, 10, 10, 100]), {
          visible: true,
          color: '#f00',
          width: 6,
        });
      });

      render(() => {
        renderer.drawLine('line', new Float32Array([0, 5, 5, 50]), {
          visible: true,
          color: '#0f0',
          width: 3,
        });
      });

      expect(el.children.length).toBe(1);
      const path = el.children[0] as SVGPathElement;
      expect(path.tagName).toBe('path');
      expect(path.getAttribute('d')).toBe('M0,5L5,50');
      expect(path.style.stroke).toBe('rgb(0, 255, 0)');
      expect(path.style.strokeWidth).toBe('3');
      expect(path.style.display).toBe('');
    });

    it('skips updating path and color if visibility goes from true to false', () => {
      render(() => {
        renderer.drawLine('line', new Float32Array([0, 10, 10, 100]), {
          visible: true,
          color: '#f00',
          width: 6,
        });
      });

      render(() => {
        renderer.drawLine('line', new Float32Array([0, 5, 5, 50]), {
          visible: false,
          color: '#0f0',
          width: 3,
        });
      });

      expect(el.children.length).toBe(1);
      const path = el.children[0] as SVGPathElement;
      expect(path.tagName).toBe('path');
      expect(path.style.display).toBe('none');
      expect(path.getAttribute('d')).toBe('M0,10L10,100');
      expect(path.style.stroke).toBe('rgb(255, 0, 0)');
      expect(path.style.strokeWidth).toBe('6');
    });

    it('skips rendering DOM when a new cacheId starts with visible=false', () => {
      render(() => {
        renderer.drawLine('line', new Float32Array([0, 10, 10, 100]), {
          visible: false,
          color: '#f00',
          width: 6,
        });
      });

      expect(el.children.length).toBe(0);
    });
  });

  describe('threejs renderer', () => {
    let scene: THREE.Scene;

    function assertPaths(line: THREE.Line, paths: Paths) {
      const geometry = line.geometry as THREE.BufferGeometry;
      const positions = geometry.getAttribute(
        'position'
      ) as THREE.BufferAttribute;
      let positionIndex = 0;
      for (let index = 0; index < paths.length; index += 2) {
        const expectedX = paths[index];
        const expectedY = paths[index + 1];
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

    it('renders a line', () => {
      render(() => {
        renderer.drawLine('line', new Float32Array([0, 10, 10, 100]), {
          visible: true,
          color: '#f00',
          width: 6,
        });
      });

      expect(scene.children.length).toBe(1);
      const lineObject = scene.children[0] as THREE.Line;
      expect(lineObject).toBeInstanceOf(THREE.Line);
      assertPaths(lineObject, new Float32Array([0, 10, 10, 100]));
      assertMaterial(lineObject, '#ff0000', true);
    });

    it('updates path and styles', () => {
      render(() => {
        renderer.drawLine('line', new Float32Array([0, 10, 10, 100]), {
          visible: true,
          color: '#f00',
          width: 6,
        });
      });

      render(() => {
        renderer.drawLine('line', new Float32Array([0, 5, 5, 50, 10, 100]), {
          visible: true,
          color: '#0f0',
          width: 3,
        });
      });

      const lineObject = scene.children[0] as THREE.Line;
      assertPaths(lineObject, new Float32Array([0, 5, 5, 50, 10, 100]));
      assertMaterial(lineObject, '#00ff00', true);
    });

    it('does not update color and paths when visibility go from true to false', () => {
      render(() => {
        renderer.drawLine('line', new Float32Array([0, 10, 10, 100]), {
          visible: true,
          color: '#f00',
          width: 6,
        });
      });

      render(() => {
        renderer.drawLine('line', new Float32Array([0, 5, 5, 50, 10, 100]), {
          visible: false,
          color: '#0f0',
          width: 3,
        });
      });

      const lineObject = scene.children[0] as THREE.Line;
      assertPaths(lineObject, new Float32Array([0, 10, 10, 100]));
      assertMaterial(lineObject, '#ff0000', false);
    });

    it('creates separate instance per cacheId', () => {
      render(() => {
        renderer.drawLine(
          'line1',
          new Float32Array([0, 10, 10, 100]),
          DEFAULT_LINE_OPTIONS
        );
      });

      render(() => {
        renderer.drawLine(
          'line2',
          new Float32Array([0, 1, 0, 1]),
          DEFAULT_LINE_OPTIONS
        );
      });

      expect(scene.children.length).toBe(1);
      const lineAfter = scene.children[0] as THREE.Line;
      assertPaths(lineAfter, new Float32Array([0, 1, 0, 1]));
    });

    it('skips renderering if render starts with visibility=false ', () => {
      render(() => {
        renderer.drawLine('line1', new Float32Array([0, 1, 0, 1]), {
          ...DEFAULT_LINE_OPTIONS,
          visible: false,
        });
      });

      expect(scene.children.length).toBe(0);
    });
  });
});
