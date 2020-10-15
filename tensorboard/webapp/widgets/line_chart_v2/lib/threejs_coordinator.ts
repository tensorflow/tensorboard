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
import {Rect} from './types';

export class ThreeCoordinator extends Coordinator {
  private readonly camera = new THREE.OrthographicCamera(
    0,
    1000,
    1000,
    0,
    0,
    100
  );

  setDomContainerRect(rect: Rect) {
    super.setDomContainerRect(rect);
    this.camera.left = rect.x;
    this.camera.right = rect.x + rect.width;
    this.camera.top = rect.y;
    this.camera.bottom = rect.y + rect.height;
    this.camera.updateProjectionMatrix();
  }

  getCamera() {
    return this.camera;
  }
}
