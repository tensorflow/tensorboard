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
import {color as d3Color} from '../../../../third_party/d3';
import * as THREE from 'three';

import {ThreeCoordinator} from '../threejs_coordinator';
import {Polyline, Rect} from '../internal_types';
import {arePolylinesEqual, isOffscreenCanvasSupported} from '../utils';
import {ObjectRenderer, LinePaintOption} from './renderer_types';

function createOpacityAdjustedColor(hex: string, opacity: number): THREE.Color {
  const newD3Color = d3Color(hex);
  if (!newD3Color) {
    throw new Error(`d3 failed to recognize the color: ${hex}`);
  }
  return new THREE.Color((newD3Color.brighter(1 - opacity) as any).hex());
}

interface LineCacheValue {
  type: 'line';
  obj3d: THREE.Object3D;
  data: Polyline;
}

type CacheValue = LineCacheValue;

export class ThreeRenderer implements ObjectRenderer<CacheValue> {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();

  constructor(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    private readonly coordinator: ThreeCoordinator,
    devicePixelRatio: number
  ) {
    if (isOffscreenCanvasSupported() && canvas instanceof OffscreenCanvas) {
      // THREE.js require the style object which Offscreen canvas lacks.
      (canvas as any).style = (canvas as any).style || {};
    }
    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas as HTMLCanvasElement,
      context: canvas.getContext('webgl2', {
        antialias: true,
        precision: 'highp',
        alpha: true,
      }) as WebGLRenderingContext,
    });
    this.renderer.setPixelRatio(devicePixelRatio);
  }

  onResize(rect: Rect) {
    this.renderer.setSize(rect.width, rect.height);
  }

  destroyObject(cacheValue: CacheValue): void {
    const obj3d = cacheValue.obj3d;
    this.scene.remove(obj3d);

    if (obj3d instanceof THREE.Mesh || obj3d instanceof THREE.Line) {
      obj3d.geometry.dispose();
      const materials = Array.isArray(obj3d.material)
        ? obj3d.material
        : [obj3d.material];
      for (const material of materials) {
        material.dispose();
      }
    }
  }

  createOrUpdateLineObject(
    cachedLine: CacheValue | null,
    polyline: Polyline,
    paintOpt: LinePaintOption
  ): CacheValue | null {
    let line: THREE.Line | null = null;
    let prevPolyline: Polyline | null = null;

    if (cachedLine) {
      if (cachedLine.obj3d instanceof THREE.Line) {
        line = cachedLine.obj3d;
      }

      prevPolyline = cachedLine.data;
    }

    // If a line is not cached and is not even visible, skip drawing line.
    if (!line && !paintOpt.visible) return null;

    const {visible, width} = paintOpt;
    const newColor = createOpacityAdjustedColor(
      paintOpt.color,
      paintOpt.opacity ?? 1
    );

    if (!line) {
      const geometry = new THREE.BufferGeometry();
      const material = new THREE.LineBasicMaterial({
        color: newColor,
        linewidth: width,
      });
      line = new THREE.Line(geometry, material);
      material.visible = visible;
      this.updatePoints(geometry, polyline);
      this.scene.add(line);
      return {type: 'line', data: polyline, obj3d: line};
    }

    // Update the cached THREE.Line.
    if (line && Array.isArray(line.material)) {
      throw new Error('Invariant error: only expect one material on a line');
    }

    const material = line.material as THREE.LineBasicMaterial;

    if (material.visible !== visible) {
      material.visible = visible;
      material.needsUpdate = true;
    }

    // No need to update geometry or material if it is not visible.
    if (!visible) {
      return cachedLine;
    }

    if (material.linewidth !== width) {
      material.linewidth = width;
      material.needsUpdate = true;
    }

    const currentColor = material.color;
    if (!currentColor.equals(newColor)) {
      material.color.set(newColor);
      material.needsUpdate = true;
    }

    if (!prevPolyline || !arePolylinesEqual(prevPolyline, polyline)) {
      this.updatePoints(line.geometry as THREE.BufferGeometry, polyline);
    }

    return {
      type: 'line',
      data: polyline,
      obj3d: line,
    };
  }

  private updatePoints(lineGeometry: THREE.BufferGeometry, paths: Polyline) {
    const length = paths.length / 2;
    const vectors = new Array<THREE.Vector2>(length);
    for (let index = 0; index < length * 2; index += 2) {
      vectors[index / 2] = new THREE.Vector2(paths[index], paths[index + 1]);
    }

    let index = 0;
    const positionAttributes = lineGeometry.attributes[
      'position'
    ] as THREE.BufferAttribute;
    if (
      !positionAttributes ||
      positionAttributes.count !== vectors.length * 3
    ) {
      lineGeometry.setFromPoints(vectors);
    } else {
      const values = positionAttributes.array as number[];
      for (const vector of vectors) {
        values[index++] = vector.x;
        values[index++] = vector.y;
        values[index++] = 0;
      }
      positionAttributes.needsUpdate = true;
    }
    lineGeometry.setDrawRange(0, vectors.length);
    // Need to update the bounding sphere so renderer does not skip rendering
    // this object because it is outside of the camera viewpoint (frustum).
    lineGeometry.computeBoundingSphere();
  }

  flush() {
    this.renderer.render(this.scene, this.coordinator.getCamera());
  }
}
