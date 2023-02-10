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

import {Rect, Scale, ScaleType} from './internal_types';
import {createScale} from './scale';
import {ChartUtils} from './utils';

/**
 * A stateful convenient utility around scale for converting coordinate systems.
 *
 * Definitions.
 *
 * Example for better illustration: we are viewing a diagonal line that goes from
 * <0, 0> -> <1, 2> onto a canvas with size <100, 200>.
 *
 * - data coordinate: coordinate in raw data space. For example above, you would have a
 *     line by connecting two points at <0, 0> and <1, 2>.
 * - ui coordinate: coordinate of a data in pixel/view-space. For example above, a data at
 *     <0.5, 0.5> will be on <50, 100> in UI coordinates.
 * - internal coordinate: in case like webgl, you can use an internal static
 *     coordinate system separate from the ui coordinate.
 * - view box: a rect in data coordinate that describes what should be visible
 *     on the screen.
 */
export class Coordinator {
  protected xScale: Scale = createScale(ScaleType.LINEAR);
  protected yScale: Scale = createScale(ScaleType.LINEAR);

  protected domContainerRect: Rect = {
    x: 0,
    width: 1,
    y: 0,
    height: 1,
  };

  private lastUpdated: number = 0;
  private currentViewBoxRect: Rect = {
    x: 0,
    width: 1,
    y: 0,
    height: 1,
  };

  getUpdateIdentifier() {
    return this.lastUpdated;
  }

  private updateIdentifier() {
    this.lastUpdated++;
  }

  /**
   * Returns whether y axis is pointing down in the output space.
   *
   * ↑
   * | isYAxisPointedDown = false (e.g., cartesian coordinates, 3d scene)
   * |
   * |-------------→
   * |
   * | isYAxisPointedDown = true (e.g., DOM)
   * ↓
   */
  isYAxisPointedDown(): boolean {
    return true;
  }

  setXScale(scale: Scale) {
    this.xScale = scale;
    this.updateIdentifier();
  }

  setYScale(scale: Scale) {
    this.yScale = scale;
    this.updateIdentifier();
  }

  getCurrentViewBoxRect(): Rect {
    return this.currentViewBoxRect;
  }

  setViewBoxRect(rectInDataCoordinate: Rect) {
    this.currentViewBoxRect = rectInDataCoordinate;
    this.updateIdentifier();
  }

  setDomContainerRect(rect: Rect) {
    this.domContainerRect = rect;
    this.updateIdentifier();
  }

  /**
   * Converts data coordinate into ui coordinates where the ui coordinate bounds are
   * specified in `rectInUiCoordinate`.
   */
  transformDataToUiCoord(
    rectInUiCoordinate: Rect,
    dataCoordinate: [number, number]
  ): [number, number] {
    const rect = rectInUiCoordinate;
    const domain = ChartUtils.convertRectToExtent(this.currentViewBoxRect);
    return [
      this.xScale.forward(
        domain.x,
        [rect.x, rect.x + rect.width],
        dataCoordinate[0]
      ),
      this.yScale.forward(
        domain.y,
        this.isYAxisPointedDown()
          ? [rect.y + rect.height, rect.y]
          : [rect.y, rect.y + rect.height],
        dataCoordinate[1]
      ),
    ];
  }
}
