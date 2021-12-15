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
import {Point, Polyline, Rect} from '../internal_types';

export enum RendererType {
  SVG,
  WEBGL,
}

/**
 * Responsible for rendering shapes (e.g., line).
 *
 * Two renderers we want to support are rendering based on objects (SVG*Element and
 * Three.Object3D for SVGRenderer and ThreeRenderer, respectively).
 */
export interface ObjectRenderer<CacheValue = {}> {
  /**
   * Certain renderer requires DOM dimensions for correct density and operations. The
   * method is invoked when container is resized.
   *
   * @param domRect Container dimensions
   */
  onResize(domRect: Rect): void;

  /**
   * Draws or enqueues line drawing operations depending on a renderer. If the
   * `cachedLine` is null, it will create a new line object. Otherwise, it will
   * the object.
   *
   * @param cachedLine Previously created object. Can be a recycled instance to reduce
   *    memory operations.
   * @param polyline A polyline to draw.
   * @param paintOpt A paint option for drawing the line.
   */
  createOrUpdateLineObject(
    cachedLine: CacheValue | null,
    polyline: Polyline,
    paintOpt: LinePaintOption
  ): CacheValue | null;

  /**
   * Draws or enqueues triangle drawing operations depending on a renderer. If the `cached` is
   * null, it will create a new triangle object. Otherwise, it will update the object.
   */
  createOrUpdateTriangleObject(
    cached: CacheValue | null,
    loc: Point,
    paintOpt: TrianglePaintOption
  ): CacheValue | null;

  /**
   * Draws or enqueues circle drawing operations depending on a renderer.
   */
  createOrUpdateCircleObject(
    cached: CacheValue | null,
    loc: Point,
    paintOpt: CirclePaintOption
  ): CacheValue | null;

  /**
   * Draws or enqueues trapezoid drawing operations depending on a renderer.
   */
  createOrUpdateTrapezoidObject(
    cached: CacheValue | null,
    start: Point,
    end: Point,
    paintOpt: TrapezoidPaintOption
  ): CacheValue | null;

  flush(): void;

  destroyObject(cachedValue: CacheValue): void;

  setUseDarkMode(useDarkMode: boolean): void;

  /**
   * Disposes rendering context. After invocation, renderer should never be
   * used.
   */
  dispose(): void;
}

interface PaintOption {
  visible: boolean;
  color: string;
  opacity?: number;
}

export interface LinePaintOption extends PaintOption {
  width: number;
}

export interface TrianglePaintOption extends PaintOption {
  size: number;
}

export interface TrapezoidPaintOption extends PaintOption {
  altitude: number;
}

export interface CirclePaintOption extends PaintOption {
  radius: number;
}
