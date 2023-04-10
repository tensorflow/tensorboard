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
import {ChartUtils} from '../utils';
import {
  CirclePaintOption,
  LinePaintOption,
  ObjectRenderer,
  TrapezoidPaintOption,
  TrianglePaintOption,
} from './renderer_types';

function createOpacityAdjustedColor(
  baseColorHex: string,
  hex: string,
  opacity: number
): THREE.Color {
  if (opacity === 1) return new THREE.Color(hex);
  const newD3Color = hsl(hex);
  if (!newD3Color) {
    throw new Error(`d3 failed to recognize the color: ${hex}`);
  }
  return new THREE.Color(interpolateHsl(newD3Color, baseColorHex)(1 - opacity));
}

enum CacheType {
  CIRCLE,
  LINE,
  TRIANGLE,
  TRAPEZOID,
}

interface LineCacheValue {
  type: CacheType.LINE;
  obj3d: THREE.Mesh;
  data: Polyline;
  width: number;
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

interface TrapezoidCacheValue {
  type: CacheType.TRAPEZOID;
  obj3d: THREE.Mesh;
  data: [Point, Point];
}

type CacheValue =
  | LineCacheValue
  | TriangleCacheValue
  | CircleCacheValue
  | TrapezoidCacheValue;

/**
 * Updates BufferGeometry with Float32Array that denotes flattened array of Vec2
 * (<x, y>) representing points that form a connected set of line segments.
 */
function updatePolylineGeometry(
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
    geometry.setAttribute('position', positionAttributes);
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
 * Updates BufferGeometry with Float32Array that denotes flattened array of Vec2
 * (<x, y>) representing points that form a connected set of line segments.
 * Unlike the simpler `updatePolylineGeometry`, this variant constructs more
 * vertices to support line thickness.
 *
 * This custom logic handles line thickness, since the 'linewidth' property of
 * THREE.LineBasicMaterial is ignored [1]. Each line segment is a rectangle
 * that is split into 2 triangles [A->B->C] and [C->B->D]. Each triangle has
 * 3 coordinates (x, y, z).
 *
 * Assuming a line segment is as follows (thickness = distance from A to B):
 *              A             C
 *              |             |
 * (startPoint) |-------------| (endPoint)
 *              |             |
 *              B             D
 *
 * The renderer will draw 2 triangles:
 *
 *    ^   A----C
 *    |   |   /|
 * dy |   | /  |
 *    |   |/   |
 *    v   B----D
 *
 *        <---->
 *          dx
 *
 * [1] https://github.com/mrdoob/three.js/issues/14627
 */
function updateThickPolylineGeometry(
  geometry: THREE.BufferGeometry,
  flatVec2: Float32Array,
  thickness: number
) {
  const numSegments = Math.max(flatVec2.length / 2 - 1, 0);
  const numVertices = numSegments * 2 * 3;
  const numCoordinates = numVertices * 3;
  let positionAttributes = geometry.attributes[
    'position'
  ] as THREE.BufferAttribute;
  if (!positionAttributes || positionAttributes.count !== numVertices) {
    positionAttributes = new THREE.BufferAttribute(
      new Float32Array(numCoordinates),
      3
    );
    geometry.setAttribute('position', positionAttributes);
  }

  const values = positionAttributes.array as Float32Array;
  for (let i = 0; i < numSegments; i++) {
    const [x1, y1, x2, y2] = [
      flatVec2[2 * i],
      flatVec2[2 * i + 1],
      flatVec2[2 * i + 2],
      flatVec2[2 * i + 3],
    ];
    const startPointVec = new THREE.Vector2(x1, y1);
    const endPointVec = new THREE.Vector2(x2, y2);
    const segmentVec = new THREE.Vector2(x2 - x1, y2 - y1);
    // Take the normal that is 90 degrees counterclockwise of the segment.
    const normalVec = new THREE.Vector2(-segmentVec.y, segmentVec.x).setLength(
      thickness / 2
    );
    const A = startPointVec.clone().add(normalVec);
    const B = startPointVec.clone().sub(normalVec);
    const C = endPointVec.clone().add(normalVec);
    const D = endPointVec.clone().sub(normalVec);

    // Keep each face's vertices in counterclockwise order, to ensure normals
    // point outwards from the screen.
    const components = [
      // A->B->C triangle.
      A.x,
      A.y,
      0,
      B.x,
      B.y,
      0,
      C.x,
      C.y,
      0,
      // C->B->D triangle.
      C.x,
      C.y,
      0,
      B.x,
      B.y,
      0,
      D.x,
      D.y,
      0,
    ];
    values.set(components, i * components.length);
  }

  positionAttributes.needsUpdate = true;
  geometry.setDrawRange(0, numCoordinates);
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
  baseColorHex: string,
  object: THREE.Mesh,
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

  const newColor = createOpacityAdjustedColor(
    baseColorHex,
    color,
    opacity ?? 1
  );

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

const ThreeWrapper = {
  createScene: () => {
    return new THREE.Scene();
  },
};

export class ThreeRenderer implements ObjectRenderer<CacheValue> {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = ThreeWrapper.createScene();
  private backgroundColor: string = '#fff';

  constructor(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    private readonly coordinator: ThreeCoordinator,
    devicePixelRatio: number,
    onContextLost?: EventListener
  ) {
    if (
      ChartUtils.isWebGl2OffscreenCanvasSupported() &&
      canvas instanceof OffscreenCanvas
    ) {
      // THREE.js require the style object which Offscreen canvas lacks.
      (canvas as any).style = (canvas as any).style || {};
    }
    // WebGL contexts may be abandoned by the browser if too many contexts are
    // created on the same page.
    if (onContextLost) {
      canvas.addEventListener('webglcontextlost', onContextLost);
    }

    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas as HTMLCanvasElement,
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(devicePixelRatio);
  }

  onResize(rect: Rect) {
    this.renderer.setSize(rect.width, rect.height);
  }

  destroyObject(cacheValue: CacheValue): void {
    const obj3d = cacheValue.obj3d;
    this.scene.remove(obj3d);

    if (obj3d instanceof THREE.Mesh) {
      obj3d.geometry.dispose();
      const materials = Array.isArray(obj3d.material)
        ? obj3d.material
        : [obj3d.material];
      for (const material of materials) {
        material.dispose();
      }
    }
  }

  setUseDarkMode(useDarkMode: boolean): void {
    this.backgroundColor = useDarkMode ? '#303030' : '#fff';
    // Normally, we should invoke `setClearColor` but we are using
    // `alpha: false` mode in threejs (transparent) so it does not matter.
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
        this.backgroundColor,
        paintOpt.color,
        paintOpt.opacity ?? 1
      );
      const geometry = new THREE.BufferGeometry();
      const material = new THREE.LineBasicMaterial({color: newColor});
      const line = new THREE.Mesh(geometry, material);
      material.visible = visible;
      updateThickPolylineGeometry(geometry, polyline, width);
      this.scene.add(line);
      return {type: CacheType.LINE, data: polyline, obj3d: line, width};
    }

    const {data: prevPolyline, obj3d: line, width: prevWidth} = cachedLine;
    const geomUpdated = updateObject(
      this.backgroundColor,
      line,
      (geometry) => {
        if (
          width !== prevWidth ||
          !prevPolyline ||
          !ChartUtils.arePolylinesEqual(prevPolyline, polyline)
        ) {
          updateThickPolylineGeometry(geometry, polyline, width);
        }
        return geometry;
      },
      paintOpt
    );
    if (!geomUpdated) return cachedLine;

    return {
      type: CacheType.LINE,
      data: polyline,
      obj3d: line,
      width,
    };
  }

  private createMesh(
    geometry: THREE.BufferGeometry,
    materialOption: {visible: boolean; color: string; opacity?: number}
  ): THREE.Mesh | null {
    if (!materialOption.visible) return null;

    const {visible, color, opacity} = materialOption;
    const newColor = createOpacityAdjustedColor(
      this.backgroundColor,
      color,
      opacity ?? 1
    );
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
      updatePolylineGeometry(geom, vertices);
      const mesh = this.createMesh(geom, paintOpt);
      if (mesh === null) return null;
      this.scene.add(mesh);
      return {type: CacheType.TRIANGLE, data: loc, obj3d: mesh};
    }

    const geomUpdated = updateObject(
      this.backgroundColor,
      cached.obj3d,
      (geom) => {
        // Updating a geometry with three vertices is cheap enough. Update always.
        updatePolylineGeometry(geom, vertices);
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
    const geomUpdated = updateObject(
      this.backgroundColor,
      cached.obj3d,
      () => geom,
      paintOpt
    );
    if (!geomUpdated) return cached;
    cached.obj3d.position.set(loc.x, loc.y, 0);
    return {type: CacheType.CIRCLE, data: {loc, radius}, obj3d: cached.obj3d};
  }

  createOrUpdateTrapezoidObject(
    cached: TrapezoidCacheValue | null,
    start: Point,
    end: Point,
    paintOpt: TrapezoidPaintOption
  ): TrapezoidCacheValue | null {
    if (start.y !== end.y) {
      throw new RangeError('Input error: start.y != end.y.');
    }

    const {altitude} = paintOpt;
    const width = (2 / Math.sqrt(3)) * altitude;
    const shape = new THREE.Shape([
      new THREE.Vector2(start.x - width / 2, start.y - altitude / 2),
      new THREE.Vector2(start.x, start.y + altitude / 2),
      new THREE.Vector2(end.x, end.y + altitude / 2),
      new THREE.Vector2(end.x + width / 2, end.y - altitude / 2),
    ]);
    shape.autoClose = true;
    const geom = new THREE.ShapeBufferGeometry(shape);

    if (!cached) {
      const mesh = this.createMesh(geom, paintOpt);
      if (mesh === null) return null;
      this.scene.add(mesh);
      return {type: CacheType.TRAPEZOID, data: [start, end], obj3d: mesh};
    }

    const geomUpdated = updateObject(
      this.backgroundColor,
      cached.obj3d,
      () => geom,
      paintOpt
    );
    return geomUpdated
      ? {type: CacheType.TRAPEZOID, data: [start, end], obj3d: cached.obj3d}
      : cached;
  }

  flush() {
    this.renderer.render(this.scene, this.coordinator.getCamera());
  }

  dispose() {
    this.renderer.dispose();
  }
}

export const TEST_ONLY = {
  ThreeWrapper,
};
