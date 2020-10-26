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
import {Polyline, Rect} from '../types';

/**
 * Responsible for rendering shapes (e.g., line).
 *
 * Assumption:
 * - Two renderers we want to support are rendering based on objects (SVG*Element and
 *   Three.Object3D for SVGRenderer and ThreeRenderer, respectively).
 * - Do not want consumers to manage the lifecycle of objects and optimize render
 *   operations.
 *
 * Design choice:
 * The renderer holds and manages cache. With cache closer to the renderer, depending on a
 * renderer, we can optimize render operations on cache. With the knowledge of objects
 * rendered at given time, a cache id that is rendered at t_(n-1) but is not at t_n will
 * be removed from DOM/scene.
 *
 * Requirement:
 * `cacheId`: within a renderGroup block, a cacheId needs to be unique. When the same
 * `cacheId` appear more than once, it will either override previous ones if the same
 * shape or will throw an invariant error due to an unexpected cached object.
 */
export interface Renderer {
  /**
   * Certain renderer requires DOM dimensions for correct density and operations. The
   * method is invoked when container is resized.
   *
   * @param domRect Container dimensions
   */
  onResize(domRect: Rect): void;

  drawLine(
    cacheId: string,
    polyline: Polyline,
    paintOpt: LinePaintOption
  ): void;

  flush(): void;

  /**
   * A `cacheId` scoping operation that allows consumer not to worry about collision in
   * the `cacheId`. A renderGroup cannot nest another renderGroup.
   */
  renderGroup(groupName: string, renderBlock: () => void): void;
}

export interface LinePaintOption {
  visible: boolean;
  color: string;
  opacity?: number;
  width: number;
}
