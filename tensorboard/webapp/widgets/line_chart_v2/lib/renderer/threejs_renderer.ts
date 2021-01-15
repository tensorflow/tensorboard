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

import {hsl, interpolateHsl} from '../../../../third_party/d3';
import {Point, Polyline, Rect} from '../internal_types';
import {ThreeCoordinator} from '../threejs_coordinator';
import {arePolylinesEqual, isOffscreenCanvasSupported} from '../utils';
import {
  CirclePaintOption,
  LinePaintOption,
  ObjectRenderer,
  TrianglePaintOption,
} from './renderer_types';

function createOpacityAdjustedColor(hex: string, opacity: number): THREE.Color {
  if (opacity === 1) return new THREE.Color(hex);
  const newD3Color = hsl(hex);
  if (!newD3Color) {
    throw new Error(`d3 failed to recognize the color: ${hex}`);
  }
  return new THREE.Color(interpolateHsl(newD3Color, '#fff')(1 - opacity));
}

enum CacheType {
  CIRCLE,
  LINE,
  TRIANGLE,
}

interface LineCacheValue {
  type: CacheType.LINE;
  obj3d: THREE.Line;
  data: Polyline;
}

interface TriangleCacheValue {
  type: CacheType.TRIANGLE;
  obj3d: THREE.Mesh;
  data: Point;
}

interface CircleCacheValue {
  type: CacheType.CIRCLE;
  obj3d: THREE.Mesh;
  data: {loc: Point; radius: number};
}

type CacheValue = LineCacheValue | TriangleCacheValue | CircleCacheValue;

/**
 * Updates BufferGeometry with Float32Array that denotes flattened array of Vec2 (<x, y>).
 */
function updateGeometryWithVec2Array(
  geometry: THREE.BufferGeometry,
  flatVec2: Float32Array
) {
  const numVertices = flatVec2.length / 2;
  let positionAttributes = geometry.attributes[
    'position'
  ] as THREE.BufferAttribute;
  if (!positionAttributes || positionAttributes.count !== numVertices * 3) {
    positionAttributes = new THREE.BufferAttribute(
      new Float32Array(numVertices * 3),
      3
    );
    geometry.addAttribute('position', positionAttributes);
  }
  const values = positionAttributes.array as number[];
  for (let index = 0; index < numVertices; index++) {
    values[index * 3] = flatVec2[index * 2];
    values[index * 3 + 1] = flatVec2[index * 2 + 1];
    // z-value (index * 3 + 2) is implicitly 0 (they are set when initializing
    // Float32Array).
  }
  positionAttributes.needsUpdate = true;
  geometry.setDrawRange(0, numVertices * 3);
  // Need to update the bounding sphere so renderer does not skip rendering
  // this object because it is outside of the camera viewpoint (frustum).
  geometry.computeBoundingSphere();
}

/**
 * Updates an THREE.Object3D like object with geometry and material. Returns true if
 * geometry is updated (i.e., updateGeometry callback is invoked) and returns false
 * otherwise. It is possible that we minimally update the material without updating the
 * geometry.
 */
function updateObject(
  object: THREE.Mesh | THREE.Line,
  updateGeometry: (geometry: THREE.BufferGeometry) => THREE.BufferGeometry,
  materialOption: {visible: boolean; color: string; opacity?: number}
): boolean {
  const {visible, color, opacity} = materialOption;

  if (Array.isArray(object.material)) {
    throw new Error('Invariant error: only expect one material on an object');
  }

  const material = object.material as THREE.MeshBasicMaterial;
  if (material.visible !== visible) {
    material.visible = visible;
    material.needsUpdate = true;
  }

  if (!visible) return false;

  const newColor = createOpacityAdjustedColor(color, opacity ?? 1);

  const newGeom = updateGeometry(object.geometry as THREE.BufferGeometry);
  if (object.geometry !== newGeom) {
    object.geometry = newGeom;
  }

  const currentColor = material.color;
  if (!currentColor.equals(newColor)) {
    material.color.set(newColor);
    material.needsUpdate = true;
  }

  return true;
}

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
    cachedLine: LineCacheValue | null,
    polyline: Polyline,
    paintOpt: LinePaintOption
  ): LineCacheValue | null {
    // If a line is not cached and is not even visible, skip drawing line.
    if (!cachedLine && !paintOpt.visible) return null;

    const {visible, width} = paintOpt;

    if (!cachedLine) {
      const newColor = createOpacityAdjustedColor(
        paintOpt.color,
        paintOpt.opacity ?? 1
      );
      const geometry = new THREE.BufferGeometry();
      const material = new THREE.LineBasicMaterial({
        color: newColor,
        linewidth: width,
      });
      const line = new THREE.Line(geometry, material);
      material.visible = visible;
      updateGeometryWithVec2Array(geometry, polyline);
      this.scene.add(line);
      return {type: CacheType.LINE, data: polyline, obj3d: line};
    }

    const {data: prevPolyline, obj3d: line} = cachedLine;
    const geomUpdated = updateObject(
      line,
      (geometry) => {
        if (!prevPolyline || !arePolylinesEqual(prevPolyline, polyline)) {
          updateGeometryWithVec2Array(geometry, polyline);
        }
        return geometry;
      },
      paintOpt
    );
    if (!geomUpdated) return cachedLine;

    const material = line.material as THREE.LineBasicMaterial;
    if (material.linewidth !== width) {
      material.linewidth = width;
      material.needsUpdate = true;
    }

    return {
      type: CacheType.LINE,
      data: polyline,
      obj3d: line,
    };
  }

  private createMesh(
    geometry: THREE.BufferGeometry,
    materialOption: {visible: boolean; color: string; opacity?: number}
  ): THREE.Mesh | null {
    if (!materialOption.visible) return null;

    const {visible, color, opacity} = materialOption;
    const newColor = createOpacityAdjustedColor(color, opacity ?? 1);
    const material = new THREE.MeshBasicMaterial({color: newColor, visible});
    return new THREE.Mesh(geometry, material);
  }

  createOrUpdateTriangleObject(
    cached: TriangleCacheValue | null,
    loc: Point,
    paintOpt: TrianglePaintOption
  ): TriangleCacheValue | null {
    const {size} = paintOpt;
    const altitude = (size * Math.sqrt(3)) / 2;
    const vertices = new Float32Array([
      loc.x - size / 2,
      loc.y - altitude / 3,
      loc.x + size / 2,
      loc.y - altitude / 3,
      loc.x,
      loc.y + (altitude * 2) / 3,
    ]);

    if (!cached) {
      const geom = new THREE.BufferGeometry();
      updateGeometryWithVec2Array(geom, vertices);
      const mesh = this.createMesh(geom, paintOpt);
      if (mesh === null) return null;
      this.scene.add(mesh);
      return {type: CacheType.TRIANGLE, data: loc, obj3d: mesh};
    }

    const geomUpdated = updateObject(
      cached.obj3d,
      (geom) => {
        // Updating a geometry with three vertices is cheap enough. Update always.
        updateGeometryWithVec2Array(geom, vertices);
        return geom;
      },
      paintOpt
    );
    return geomUpdated
      ? {type: CacheType.TRIANGLE, data: loc, obj3d: cached.obj3d}
      : cached;
  }

  createOrUpdateCircleObject(
    cached: CircleCacheValue | null,
    loc: Point,
    paintOpt: CirclePaintOption
  ): CircleCacheValue | null {
    const {radius} = paintOpt;
    const geom = new THREE.CircleBufferGeometry(paintOpt.radius);

    if (!cached) {
      const mesh = this.createMesh(geom, paintOpt);
      if (mesh === null) return null;
      mesh.position.set(loc.x, loc.y, 0);
      this.scene.add(mesh);
      return {type: CacheType.CIRCLE, data: {loc, radius}, obj3d: mesh};
    }

    // geometry/vertices are created by CircleBufferGeometry and it is quite complex.
    // Since it has N vertices (N < 20), update always.
    const geomUpdated = updateObject(cached.obj3d, () => geom, paintOpt);
    if (!geomUpdated) return cached;
    cached.obj3d.position.set(loc.x, loc.y, 0);
    return {type: CacheType.CIRCLE, data: {loc, radius}, obj3d: cached.obj3d};
  }

  flush() {
    this.renderer.render(this.scene, this.coordinator.getCamera());
  }
}
