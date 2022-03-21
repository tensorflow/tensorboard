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
/**
 * The start and end time to define a linked time.
 */
export interface LinkedTime {
  start: {step: number};
  end: {step: number} | null;
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
  /**
   * gets the highest step for this card.
   */
  getHighestStep(): number;

  /**
   * Gets the lowest step for this card.
   */
  getLowestStep(): number;

  /**
   * Uses ImplementerScale to translate the proper pixel offset.
   * @param step the step which needs to be translated.
   */
  stepToPixel(step: number): number;

  /**
   * Uses ImplementerScale to determine the step that is at the current mouse
   * position or the closes step that is higher than the current mouse position.
   * @param position The mouse position
   */
  getStepHigherThanMousePosition(position: number): number;

  /**
   * Uses ImplementerScale to determine the step that is at the current mouse
   * position or the closes step that is lower than the current mouse position.
   * @param position The mouse position
   */
  getStepLowerThanMousePosition(position: number): number;
}
