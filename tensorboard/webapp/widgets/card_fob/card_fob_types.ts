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
 * The start and end time to define a time selection, used for linked time and step selector.
 */
export interface TimeSelection {
  start: {step: number};
  end: {step: number} | null;
}

/**
 * The affordance supported to update the time selection in  step selector and linked time.
 * Only used for internal analytics.
 */
export enum TimeSelectionAffordance {
  NONE = 'NO_AFFORDANCE',
  // Dragging the extended line above a fob.
  EXTENDED_LINE = 'EXTENDED_LINE',
  // Dragging the fob.
  FOB = 'FOB',
  // Clicking the deselect button.
  FOB_REMOVED = 'FOB_REMOVED',
  // Typing the step in fob.
  FOB_TEXT = 'FOB_TEXT',
  // Typing the step in setting pane.
  SETTINGS_TEXT = 'SETTINGS_TEXT',
  // Dragging the slider in setting pane.
  SETTINGS_SLIDER = 'SETTINGS_SLIDER',
}

/**
 * The affordance supported to toggle step selector and linked time.
 * Only used for internal analytics.
 */
export enum TimeSelectionToggleAffordance {
  NONE = 'NO_TOGGLE_AFFORDANCE',
  // Clicking cross sign in fob.
  FOB_DESELECT = 'FOB_DESELECT',
  // Clicking check box in settings pane.
  CHECK_BOX = 'CHECK_BOX',
}

/**
 * The direction of the axis used to control the fob movements.
 */
export enum AxisDirection {
  HORIZONTAL,
  VERTICAL,
}

/**
 * These helper functions are intended to be defined by the card that is a parent
 * of CardFobControllerComponent.
 *
 * Each helper function will have some sort of Scale that is used to convert from
 * pixel to step so that the fob lines up with the axis properly. In future
 * comments this scale will be refered to as ImplementerScale.
 *
 * It also allows cards to implement the dragging functionality in different
 * ways. By deciding which step to return in the getStepHigherThanMousePosition
 * and getStepLowerThanMousePosition functions the implementer can decide if the
 * fob "snaps" to certain steps or drags in in a smooth continuous way.
 */
export interface CardFobGetStepFromPositionHelper {
  /**
   * Uses ImplementerScale to determine the step that is at the current mouse
   * position or the closest step that is higher than the current mouse position.
   * @param position The mouse position relative to the start of the axis
   */
  getStepHigherThanAxisPosition(position: number): number;

  /**
   * Uses ImplementerScale to determine the step that is at the current mouse
   * position or the closest step that is lower than the current mouse position.
   * @param position The mouse position relative to the start of the axis
   */
  getStepLowerThanAxisPosition(position: number): number;
}
