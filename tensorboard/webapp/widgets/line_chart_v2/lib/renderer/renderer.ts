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

import {LineSpec, IRenderer} from './renderer_types';
import {Paths, Rect} from '../types';

export type RenderGroupMap<Cacheable> = Map<
  string,
  {
    data: Paths;
    cacheable: Cacheable;
  }
>;

export abstract class Renderer<Cacheable> implements IRenderer {
  onResize(rect: Rect): void {}

  drawLine(cacheId: string, paths: Float32Array, spec: LineSpec): void {
    this.cacheIdsToRemove.delete(cacheId);
  }

  abstract flush(): void;

  private groupToCacheIdToCacheable = new Map<
    string,
    RenderGroupMap<Cacheable>
  >();
  private currentRenderGroupCache: RenderGroupMap<Cacheable> | null = null;
  protected cacheIdsToRemove = new Set<string>();

  protected getRenderCache(): RenderGroupMap<Cacheable> {
    if (!this.currentRenderGroupCache) {
      throw new RangeError(
        'Invariant error: expected getRenderCache to be invoked inside a renderGroup'
      );
    }
    return this.currentRenderGroupCache!;
  }

  abstract removeCacheable(cacheable: Cacheable): void;

  renderGroup(groupName: string, renderBlock: () => void) {
    this.currentRenderGroupCache =
      this.groupToCacheIdToCacheable.get(groupName) ?? new Map();
    this.groupToCacheIdToCacheable.set(groupName, this.currentRenderGroupCache);
    this.cacheIdsToRemove.clear();

    for (const cacheKey of this.currentRenderGroupCache.keys()) {
      this.cacheIdsToRemove.add(cacheKey);
    }

    renderBlock();

    for (const cacheKey of this.cacheIdsToRemove.values()) {
      const {cacheable} = this.currentRenderGroupCache.get(cacheKey)!;
      this.removeCacheable(cacheable);
      this.currentRenderGroupCache.delete(cacheKey);
    }

    this.currentRenderGroupCache = null;
  }
}
