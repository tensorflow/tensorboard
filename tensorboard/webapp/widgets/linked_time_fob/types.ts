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

/**
 * This class is intended to be implemented by the card that has a
 * LinkedTimeFobControllerComponent.
 *
 * Each implementer will have some sort of Scale that is used to translate
 * convert between step and pixel so that the fob lines up with the axis
 * properly. In future comments this scale will be refered to as
 * ImplementerScale
 *
 * It also allows cards to implement the dragging functionality in different
 * ways. By deciding which step to return in the getStepHigherThanMousePosition
 * and getStepLowerThanMousePosition functions the implementer can decide if the
 * fob "snaps" to certain steps or drags in in a smooth continuous way.
 */
export interface FobCardAdapter {
  upperBound: number;
  lowerBound: number;
  /**
   *
   * @param overrides
   */
  // Set the upper and lower bounds. Implementation can determine lower and
  // upper bounds as it needs to. However, if the overrides are set those must
  // be used.
  setBounds(overrides: {lowerOverride?: number; higherOverride?: number}): void;
  /**
   * Uses ImplementerScale to translate the proper pixel offset.
   * @param step the step which needs to be translated.
   * @param domain The thing that I might not need.
   */
  stepToPixel(step: number, domain: [number, number]): number;
  // Using the same scale that is used in the stepToPixel function return a step
  // that is greater than or equal to the step that would be at the given mouse
  // position.
  getStepHigherThanMousePosition(position: number): number;
  // Using the same scale that is used in the stepToPixel function return a step
  // that is less than or equal to the step that would be at the given mouse
  // position.
  getStepLowerThanMousePosition(position: number): number;
}
