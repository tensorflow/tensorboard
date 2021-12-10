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
import {Coordinator} from './coordinator';
import {Rect} from './internal_types';

/**
 * Unlike Coordinator, ThreeCoordinator uses internal coordinate system.
 *
 * Three.js has a notion of camera and it can efficiently update the canvas when the
 * canvas dimension changes; it does not have to re-transform coordinates of each
 * DataSeries, but, instead, only have to update the camera.
 *
 * In this coordinator, the output coordinate system is static from [0, 1000].
 */
export class ThreeCoordinator extends Coordinator {
  override isYAxisPointedDown() {
    return false;
  }

  private readonly camera = new THREE.OrthographicCamera(
    0,
    1000,
    1000,
    0,
    0,
    100
  );

  override setDomContainerRect(rect: Rect) {
    // We set the camera extent based on the dom container size so the dimensions in
    // camera coordinate corresponds to dimensions in pixels. This way, in order to draw,
    // for example a circle, we don't have to map a pixel size to camera dimensions
    // (which may have different aspect ratio and can draw a circle as an oval).
    super.setDomContainerRect(rect);
    this.camera.left = rect.x;
    this.camera.right = rect.x + rect.width;
    this.camera.top = rect.y + rect.height;
    this.camera.bottom = rect.y;
    this.camera.updateProjectionMatrix();
  }

  getCamera() {
    return this.camera;
  }
}
