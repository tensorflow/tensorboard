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

import {LinePaintOption, Renderer} from './renderer_types';
import {Polyline, Rect} from '../types';

export type RenderGroupMap<Cacheable> = Map<
  string,
  {
    data: Polyline;
    cacheable: Cacheable;
  }
>;

export abstract class BaseCachedObjectRenderer<CacheValue> implements Renderer {
  onResize(rect: Rect): void {}

  drawLine(
    cacheId: string,
    polyline: Float32Array,
    paintOpt: LinePaintOption
  ): void {
    this.cacheIdsToRemove.delete(cacheId);
  }

  abstract flush(): void;

  private groupToCacheIdToCacheable = new Map<
    string,
    Map<string, CacheValue>
  >();

  private currentRenderGroupCache: Map<string, CacheValue> | null = null;

  /**
   * Helps renderer maintain objects that need to be removed after a frame.
   *
   * cacheIds to be removed is populated at the start of a renderGroup and each draw
   * method is expected to delete cacheId from cacheIdsToRemove. Failure to do so will
   * result in object removal at the end of the renderGroup.
   */
  private cacheIdsToRemove = new Set<string>();

  protected getCachedValue(cacheId: string): CacheValue | null {
    if (!this.currentRenderGroupCache) {
      throw new RangeError(
        'Expected getRenderCache to be invoked inside a renderGroup'
      );
    }
    return this.currentRenderGroupCache.get(cacheId) ?? null;
  }

  protected setCacheObject(cacheId: string, cacheObject: CacheValue): void {
    if (!this.currentRenderGroupCache) {
      throw new RangeError(
        'Expected getRenderCache to be invoked inside a renderGroup'
      );
    }
    this.currentRenderGroupCache.set(cacheId, cacheObject);
  }

  abstract removeRenderObject(cacheValue: CacheValue): void;

  renderGroup(groupName: string, renderBlock: () => void) {
    if (this.currentRenderGroupCache) {
      throw new RangeError('renderGroup cannot nest another renderGroup');
    }

    this.currentRenderGroupCache =
      this.groupToCacheIdToCacheable.get(groupName) ?? new Map();
    this.groupToCacheIdToCacheable.set(groupName, this.currentRenderGroupCache);
    this.cacheIdsToRemove.clear();

    for (const cacheKey of this.currentRenderGroupCache.keys()) {
      this.cacheIdsToRemove.add(cacheKey);
    }

    renderBlock();

    for (const cacheKey of this.cacheIdsToRemove.values()) {
      const cachedValue = this.currentRenderGroupCache.get(cacheKey)!;
      this.removeRenderObject(cachedValue);
      this.currentRenderGroupCache.delete(cacheKey);
    }

    this.currentRenderGroupCache = null;
  }
}
