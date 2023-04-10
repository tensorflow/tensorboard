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

import {Extent, Polyline, Rect} from './internal_types';

function convertRectToExtent(rect: Rect): Extent {
  return {
    x: [rect.x, rect.x + rect.width],
    y: [rect.y, rect.y + rect.height],
  };
}

let cachedIsWebGl2Supported = false;

{
  if (
    self.hasOwnProperty('WebGL2RenderingContext') &&
    self.hasOwnProperty('document')
  ) {
    const canvas = document.createElement('canvas');

    canvas.addEventListener('webglcontextcreationerror', () => {
      cachedIsWebGl2Supported = false;
    });
    const context = canvas.getContext('webgl2');
    cachedIsWebGl2Supported = Boolean(context);
  }
}

function isWebGl2Supported(): boolean {
  return cachedIsWebGl2Supported;
}

function isWebGl2OffscreenCanvasSupported(): boolean {
  if (!self.hasOwnProperty('OffscreenCanvas')) {
    return false;
  }
  // Safari 16.4 rolled out OffscreenCanvas support but without webgl2 support.
  const context = new OffscreenCanvas(0, 0).getContext('webgl2');
  return Boolean(context);
}

function arePolylinesEqual(lineA: Polyline, lineB: Polyline) {
  if (lineA.length !== lineB.length) {
    return false;
  }

  for (let i = 0; i < lineA.length; i++) {
    if (lineA[i] !== lineB[i]) {
      return false;
    }
  }
  return true;
}

function areExtentsEqual(extentA: Extent, extentB: Extent): boolean {
  return (
    extentA.x[0] === extentB.x[0] &&
    extentA.x[1] === extentB.x[1] &&
    extentA.y[0] === extentB.y[0] &&
    extentA.y[1] === extentB.y[1]
  );
}

export const ChartUtils = {
  convertRectToExtent,
  isWebGl2Supported,
  isWebGl2OffscreenCanvasSupported,
  arePolylinesEqual,
  areExtentsEqual,
};
