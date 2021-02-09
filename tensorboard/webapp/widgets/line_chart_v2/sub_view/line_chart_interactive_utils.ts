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

import {bisect} from '../../../third_party/d3';
import {Dimension, Extent, Point, Scale} from '../lib/public_types';

/**
 * @param sortedPoints DataSeries points that requires points to be sorted in `x`.
 * @param targetX target `x` location.
 */
export function findClosestIndex(
  sortedPoints: Point[],
  targetX: number
): number {
  const right = Math.min(
    bisect(
      sortedPoints.map(({x}) => x),
      targetX
    ),
    sortedPoints.length - 1
  );

  const left = Math.max(0, right - 1);
  const closerToLeft =
    Math.abs(sortedPoints[left].x - targetX) -
      Math.abs(sortedPoints[right].x - targetX) <=
    0;
  return closerToLeft ? left : right;
}

/**
 * Proposes new viewExtent based on zoom factor and zoom origin.
 */
export function getProposedViewExtentOnZoom(
  event: WheelEvent,
  viewExtent: Extent,
  domDim: Dimension,
  scrollZoomSpeedFactor: number,
  xScale: Scale,
  yScale: Scale
): Extent {
  let scrollDeltaFactor: number;

  switch (event.deltaMode) {
    case WheelEvent.DOM_DELTA_PIXEL:
      scrollDeltaFactor = 1;
      break;
    case WheelEvent.DOM_DELTA_LINE:
      scrollDeltaFactor = 8;
      break;
    case WheelEvent.DOM_DELTA_PAGE:
      scrollDeltaFactor = 20;
      break;
    default:
      scrollDeltaFactor = 1;
      console.warn(`Unknown WheelEvent deltaMode: ${event.deltaMode}.`);
  }
  const scrollMagnitude = event.deltaY * scrollDeltaFactor;

  const zoomFactor =
    scrollMagnitude < 0
      ? // Clip the zoom-in to -0.95 (eye-balled) so we do not invert min/max extent.
        Math.max(scrollMagnitude * scrollZoomSpeedFactor, -0.95)
      : scrollMagnitude * scrollZoomSpeedFactor;

  const {width, height} = domDim;

  const proposedX: [number, number] = [
    xScale.reverse(viewExtent.x, [0, width], -event.offsetX * zoomFactor),
    xScale.reverse(
      viewExtent.x,
      [0, width],
      width + (width - event.offsetX) * zoomFactor
    ),
  ];

  const proposedY: [number, number] = [
    yScale.reverse(viewExtent.y, [height, 0], -event.offsetY * zoomFactor),
    yScale.reverse(
      viewExtent.y,
      [height, 0],
      height + (height - event.offsetY) * zoomFactor
    ),
  ];

  return {
    x: proposedX[1] < proposedX[0] ? [proposedX[1], proposedX[0]] : proposedX,
    y: proposedY[1] < proposedY[0] ? [proposedY[1], proposedY[0]] : proposedY,
  };
}
