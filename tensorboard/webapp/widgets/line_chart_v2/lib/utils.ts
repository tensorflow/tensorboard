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

import {Extent, Paths, Rect} from './types';

export function convertRectToExtent(rect: Rect): Extent {
  return {
    x: [rect.x, rect.x + rect.width],
    y: [rect.y, rect.y + rect.height],
  };
}

const cachedIsWebGl2Supported = Boolean(
  self.hasOwnProperty('document') &&
    document.createElement('canvas').getContext('webgl2')
);

export function isWebGl2Supported(): boolean {
  return cachedIsWebGl2Supported;
}

export function isOffscreenCanvasSupported(): boolean {
  return self.hasOwnProperty('OffscreenCanvas');
}

export function arePathsEqual(pathA: Paths, pathB: Paths) {
  if (pathA.length !== pathB.length) {
    return false;
  }

  for (let i = 0; i < pathA.length; i++) {
    if (pathA[i] !== pathB[i]) {
      return false;
    }
  }
  return true;
}
