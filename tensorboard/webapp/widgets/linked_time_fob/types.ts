/* Copyright 2022 The TensorFlow Authors. All Rights Reserved.
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

import {ElementRef} from '@angular/core';

export enum AxisDirection {
  HORIZONTAL,
  VERTICAL,
}

export enum Fob {
  NONE,
  START,
  END,
}

export interface FobCardAdapter {
  upperBound: number;
  lowerBound: number;
  // Set the upper and lower bounds. Implementation can determine lower and
  // upper bounds as it needs to. However, if the overrides are set those must
  // be used.
  setBounds(overrides: {lowerOverride?: number; higherOverride?: number}): void;
  // Uses whatever underlying scale is need to translate the proper pixel offset
  stepToPixel(step: number, domain: [number, number]): number;
  // Using the same scale that is used in the stepToPixel function return a step
  // that is greater than or equal to the step that would be at the given mouse
  // position.
  getStepHigherThanMousePosition(
    position: number,
    axisOverlay: ElementRef
  ): number;
  // Using the same scale that is used in the stepToPixel function return a step
  // that is less than or equal to the step that would be at the given mouse
  // position.
  getStepLowerThanMousePosition(
    position: number,
    axisOverlay: ElementRef
  ): number;
}
