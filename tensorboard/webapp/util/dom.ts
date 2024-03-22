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

// From: https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/buttons
export enum MouseEventButtons {
  LEFT = 0b1,
  RIGHT = 0b10,
  MIDDLE = 0b100,
  FOURTH = 0b1000, // often 'back' button, but can differ by mouse controller.
  FIFTH = 0b100000, // often 'forward' button, but can differ by mouse controller.
}

let currElementId = 0;

/**
 * An opaque id intended to refer to exactly one specific DOM Element.
 */
export type ElementId = Symbol;

/**
 * Generates a new opaque id for the consumer to associate with a unique DOM
 * Element. Consumers are responsible for the 1:1 association between Elements
 * and ids.
 */
export function nextElementId(): ElementId {
  // An incrementing number is actually unnecessary, but makes it easier to
  // identify whether 2 elements are the same in the console when debugging.
  currElementId++;
  return Symbol(currElementId);
}

/** Checks whether a mouse event is within an element's bounding box. */
export function isMouseEventInElement(event: MouseEvent, el: Element): boolean {
  const rect = el.getBoundingClientRect();
  return (
    rect.x <= event.clientX &&
    event.clientX <= rect.x + rect.width &&
    rect.y <= event.clientY &&
    event.clientY <= rect.y + rect.height
  );
}
