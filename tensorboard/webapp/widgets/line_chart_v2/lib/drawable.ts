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
import {
  DataInternalSeries,
  DataSeries,
  DataSeriesMetadataMap,
  Rect,
} from './internal_types';
import {PaintBrush} from './paint_brush';
import {ObjectRenderer} from './renderer/renderer_types';

type Cacheable = {};

export interface RenderCache {
  getFromPreviousFrame(key: string): Cacheable | null;
  setToCurrentFrame(key: string, value: Cacheable): void;
}

class RenderCacheContainer implements RenderCache {
  private prevFrameCache = new Map<string, Cacheable>();
  private currFrameCache = new Map<string, Cacheable>();

  getFromPreviousFrame(key: string): Cacheable | null {
    const value = this.prevFrameCache.get(key);
    return value ?? null;
  }

  setToCurrentFrame(key: string, value: Cacheable) {
    this.currFrameCache.set(key, value);
  }

  /**
   * Flush the current frame cache into previous frame cache. At this point, you should
   * not update the current frame cache with `set` calls.
   *
   * It returns cached objects that got removed from the new frame.
   */
  finalizeFrameAndGetRemoved(): ReadonlyArray<Cacheable> {
    const removed = [];

    for (const [key, value] of this.prevFrameCache.entries()) {
      if (!this.currFrameCache.has(key)) {
        removed.push(value);
      }
    }

    this.prevFrameCache = this.currFrameCache;
    this.currFrameCache = new Map();

    return removed;
  }
}

export interface DrawableConfig {
  coordinator: Coordinator;
  getMetadataMap: () => DataSeriesMetadataMap;
  renderer: ObjectRenderer;
}

/**
 * A view that renders data in a rectangular region. A client of DataDrawable is expected
 * to subclass DataDrawable and implement `redraw` method.
 *
 * The base class maintains cache of coordinate mapped data, `series` and rendered scene.
 *
 * Example:
 *
 * class LineView extends DataDrawable {
 *   redraw() {
 *     for (const line of this.series) {
 *       this.paintBrush.setLine('uniqId', line, ...);
 *     }
 *   }
 * }
 */
export abstract class DataDrawable {
  private rawSeriesData: DataSeries[] = [];
  // UI coordinate mapped data.
  protected series: DataInternalSeries[] = [];
  protected readonly coordinator: Coordinator;
  protected readonly paintBrush: PaintBrush;

  private paintDirty = true;
  private readonly getMetadataMapImpl: () => DataSeriesMetadataMap;
  private readonly renderer: ObjectRenderer;
  private readonly renderCache = new RenderCacheContainer();
  private coordinateIdentifier: number | null = null;
  private layout: Rect = {x: 0, width: 1, y: 0, height: 1};

  constructor(config: DrawableConfig) {
    this.getMetadataMapImpl = config.getMetadataMap;
    this.coordinator = config.coordinator;
    this.renderer = config.renderer;
    this.paintBrush = new PaintBrush(this.renderCache, this.renderer);
  }

  setLayoutRect(layout: Rect) {
    if (
      this.layout.x !== layout.x ||
      this.layout.width !== layout.width ||
      this.layout.y !== layout.y ||
      this.layout.height !== layout.height
    ) {
      this.paintDirty = true;
    }
    this.layout = layout;
  }

  protected getLayoutRect(): Rect {
    return this.layout;
  }

  protected getMetadataMap(): DataSeriesMetadataMap {
    return this.getMetadataMapImpl();
  }

  /**
   * Manually marks paint as dirty. Drawable automatically marks paint as dirty when data
   * or layout changes. If there are other conditions in which redraw must happen, invoke
   * this method.
   */
  markAsPaintDirty() {
    this.paintDirty = true;
  }

  /**
   * Renders a rectangular region if paint is dirty.
   *
   * @final Do not override.
   */
  render() {
    this.transformCoordinatesIfStale();

    if (!this.paintDirty) return;

    this.redraw();

    for (const removedObj of this.renderCache.finalizeFrameAndGetRemoved()) {
      this.renderer.destroyObject(removedObj);
    }

    this.paintDirty = false;
  }

  private isCoordinateUpdated() {
    return this.coordinator.getUpdateIdentifier() !== this.coordinateIdentifier;
  }

  private clearCoordinateIdentifier() {
    this.coordinateIdentifier = null;
  }

  setData(data: DataSeries[]) {
    this.clearCoordinateIdentifier();
    this.rawSeriesData = data;
  }

  private transformCoordinatesIfStale(): void {
    if (!this.isCoordinateUpdated()) {
      return;
    }

    const layoutRect = this.getLayoutRect();
    this.series = new Array(this.rawSeriesData.length);

    for (let i = 0; i < this.rawSeriesData.length; i++) {
      const datum = this.rawSeriesData[i];
      this.series[i] = {
        id: datum.id,
        polyline: new Float32Array(datum.points.length * 2),
      };
      for (let pointIndex = 0; pointIndex < datum.points.length; pointIndex++) {
        const [x, y] = this.coordinator.transformDataToUiCoord(layoutRect, [
          datum.points[pointIndex].x,
          datum.points[pointIndex].y,
        ]);
        this.series[i].polyline[pointIndex * 2] = x;
        this.series[i].polyline[pointIndex * 2 + 1] = y;
      }
    }

    this.coordinateIdentifier = this.coordinator.getUpdateIdentifier();
    this.markAsPaintDirty();
  }

  /**
   * Draws a rectangular region with coordinate system transformed `this.series` and
   * `this.paintBrush`.
   */
  protected abstract redraw(): void;
}
