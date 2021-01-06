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

import {MouseEventButtons} from './internal_types';

export enum MouseEventButton {
  LEFT = 0,
  MIDDLE = 1,
  RIGHT = 2,
  FOURTH = 3, // often 'back' button, but can differ by mouse controller.
  FIFTH = 4, // often 'forward' button, but can differ by mouse controller.
}

/**
 * Emulates MouseEvent's `button` and `buttons`. When multiple buttons are pressed, do
 * note that `buttons` have bit-wise union of the keys while `button` has a value
 * corresponding to the last button pressed.
 */
export function createPartialMouseEvent(
  buttonList: MouseEventButtons[]
): Partial<MouseEventInit> {
  const lastButton = buttonList[buttonList.length - 1];

  let buttons = 0;
  for (const button of buttonList) {
    buttons |= button;
  }

  let button: number;
  switch (lastButton) {
    case MouseEventButtons.LEFT:
      button = MouseEventButton.LEFT;
      break;
    case MouseEventButtons.RIGHT:
      button = MouseEventButton.RIGHT;
      break;
    case MouseEventButtons.MIDDLE:
      button = MouseEventButton.MIDDLE;
      break;
    case MouseEventButtons.FOURTH:
      button = MouseEventButton.FOURTH;
      break;
    case MouseEventButtons.FIFTH:
      button = MouseEventButton.FIFTH;
      break;
  }

  return {button, buttons};
}
