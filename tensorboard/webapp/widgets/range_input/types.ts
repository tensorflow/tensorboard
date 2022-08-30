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
 * Types of range input changes
 *
 * TEXT: the user has updated a text field
 * SLIDER: the user has moved a slider
 * TEXT_DELETED: the user has deleted the contents of a text field
 *
 */
export const enum RangeInputSource {
  TEXT = 'TEXT',
  SLIDER = 'SLIDER',
  TEXT_DELETED = 'TEXT_DELETED',
}

/**
 * Type of event emitted when only editing a single value.
 */
export type SingleValue = {
  value: number;
  source: RangeInputSource;
};

/**
 * Type of event emitted when editing a range of values.
 */
export type RangeValues = {
  lowerValue: number;
  upperValue: number;
  source: RangeInputSource;
};
