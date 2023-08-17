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
import {DebugElement} from '@angular/core';
import {ComponentFixture} from '@angular/core/testing';

export enum KeyType {
  SPECIAL,
  CHARACTER,
}

export interface SendKeyCharArgs {
  type: KeyType.CHARACTER;
  key: string;
  prevString: string;
  startingCursorIndex: number;
}

export interface SendKeySpecialArg {
  type: KeyType.SPECIAL;
  key:
    | 'Backspace'
    | 'Space'
    | 'Tab'
    | 'Enter'
    | 'ArrowLeft'
    | 'ArrowUp'
    | 'ArrowRight'
    | 'Escape';
  prevString: string;
  startingCursorIndex: number;
}

export type SendKeyArgs = SendKeyCharArgs | SendKeySpecialArg;

/**
 * Poorman's webdriver sendKey. Sends a character simulating keyboard key
 * presses.
 */
export function sendKey<T>(
  fixture: ComponentFixture<T>,
  eventTarget: DebugElement,
  args: SendKeyArgs
) {
  const {prevString, key, startingCursorIndex} = args;

  const el = eventTarget.nativeElement;
  const canSetCursor =
    el instanceof HTMLInputElement &&
    el.type !== 'date' &&
    el.type !== 'number';

  let nextString: string;
  let nextCursorIndex: number;
  // KeyCode is deprecated but some Angular material components make use of it.
  let keyCode: number;
  let emitKeyPressAndInput = true;

  switch (key) {
    case 'Backspace':
      nextString =
        prevString.slice(0, startingCursorIndex - 1) +
        prevString.slice(startingCursorIndex);
      nextCursorIndex = startingCursorIndex - 1;
      keyCode = 0x08;
      break;
    case 'Space':
      nextString =
        prevString.slice(0, startingCursorIndex) +
        ' ' +
        prevString.slice(startingCursorIndex);
      nextCursorIndex = startingCursorIndex + 1;
      keyCode = 0x20;
      break;
    case 'ArrowLeft':
      nextString = prevString;
      nextCursorIndex = startingCursorIndex - 1;
      keyCode = 0x25;
      emitKeyPressAndInput = false;
      break;
    case 'ArrowUp':
      nextString = prevString;
      nextCursorIndex = startingCursorIndex - 1;
      keyCode = 0x26;
      emitKeyPressAndInput = false;
      break;
    case 'ArrowRight':
      nextString = prevString;
      nextCursorIndex = startingCursorIndex + 1;
      keyCode = 0x27;
      emitKeyPressAndInput = false;
      break;
    case 'Tab':
      nextString = prevString;
      nextCursorIndex = startingCursorIndex;
      keyCode = 0x09;
      break;
    case 'Enter':
      nextString = prevString;
      nextCursorIndex = startingCursorIndex;
      keyCode = 0x0d;
      break;
    case 'Escape':
      nextString = prevString;
      nextCursorIndex = startingCursorIndex;
      keyCode = 0x1b;
      emitKeyPressAndInput = false;
      break;
    default:
      nextString =
        prevString.slice(0, startingCursorIndex) +
        key +
        prevString.slice(startingCursorIndex);
      nextCursorIndex = startingCursorIndex + 1;
      keyCode = key.charCodeAt(0);
      break;
  }

  el.focus();
  el.value = prevString;
  if (canSetCursor) {
    el.setSelectionRange(startingCursorIndex, startingCursorIndex);
  }

  // Use to override default options on programmatic events to be closer to
  // user-initiated events, which bubble and cancel.
  const baseEventOptions: EventInit = {
    bubbles: true,
    cancelable: true,
  };

  // Convert typing to object. Sadly, because keyCode is deprecated, it is not
  // typed properly.
  const keyboardEventArg = {...baseEventOptions, key, keyCode} as {};
  el.dispatchEvent(new KeyboardEvent('keydown', keyboardEventArg));

  // This is technically incorrect. For modifier key event, the keydown triggers
  // but the keypress does not.

  if (emitKeyPressAndInput) {
    el.dispatchEvent(new KeyboardEvent('keypress', keyboardEventArg));
  }

  el.value = nextString;
  if (canSetCursor) {
    el.setSelectionRange(nextCursorIndex, nextCursorIndex);
  }

  if (emitKeyPressAndInput) {
    el.dispatchEvent(new InputEvent('input', {...baseEventOptions, data: key}));
  }

  document.dispatchEvent(new Event('selectionchange', baseEventOptions));

  el.dispatchEvent(new KeyboardEvent('keyup', keyboardEventArg));
  fixture.detectChanges();
}

/**
 * Send keys to an input target.
 *
 * It makes sure fixture is up-to-date by triggering the change detection.
 * It clears the value, then type each character in `str` one by one.
 */
export function sendKeys<T>(
  fixture: ComponentFixture<T>,
  eventTarget: DebugElement,
  str: string
) {
  let prevString = '';
  let cursorIndex = 0;
  for (const key of str) {
    sendKey(fixture, eventTarget, {
      type: KeyType.CHARACTER,
      prevString,
      key,
      startingCursorIndex: cursorIndex,
    });
    cursorIndex++;
    prevString += key;
  }
}
