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
import {createScale} from './scale';
import {ScaleType} from './scale_types';

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
  private readonly CAMERA_MIN = 0;
  private readonly CAMERA_MAX = 1000;
  private readonly domToCameraScale = createScale(ScaleType.LINEAR);
  private readonly camera = new THREE.OrthographicCamera(
    this.CAMERA_MIN,
    this.CAMERA_MAX,
    this.CAMERA_MAX,
    this.CAMERA_MIN,
    0,
    100
  );

  transformDataToUiCoord(
    rectInUiCoordinate: Rect,
    dataCoordinate: [number, number]
  ): [number, number] {
    const containerRect = this.domContainerRect;
    const uiCoordinates = super.transformDataToUiCoord(
      rectInUiCoordinate,
      dataCoordinate
    );

    const xInCamera = this.domToCameraScale.forward(
      [containerRect.x, containerRect.x + containerRect.width],
      [this.CAMERA_MIN, this.CAMERA_MAX],
      uiCoordinates[0]
    );
    const yInCamera = this.domToCameraScale.forward(
      [containerRect.y + containerRect.height, containerRect.y],
      [this.CAMERA_MIN, this.CAMERA_MAX],
      uiCoordinates[1]
    );
    return [xInCamera, yInCamera];
  }

  getCamera() {
    return this.camera;
  }
}
