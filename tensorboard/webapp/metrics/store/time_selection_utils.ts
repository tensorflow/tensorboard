/* Copyright 2023 The TensorFlow Authors. All Rights Reserved.

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
import {MinMaxStep, TimeSelection} from '../types';

/**
 * Ensures that value is within min max. If it is not, return the closest value that is.
 * @param value
 * @param min
 * @param max
 */
export function clipStepWithinMinMax(value: number, min: number, max: number) {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

/**
 * Clips both start and end step of a time selection within min and max
 * @param timeSelection
 * @param param1
 */
export function maybeClipTimeSelection(
  timeSelection: TimeSelection,
  {minStep, maxStep}: MinMaxStep
) {
  const start = {
    step: clipStepWithinMinMax(timeSelection.start.step, minStep, maxStep),
  };
  const end = timeSelection.end
    ? {
        step: clipStepWithinMinMax(timeSelection.end.step, minStep, maxStep),
      }
    : null;
  return {
    start,
    end,
  };
}

/**
 * Removes the end step of a time selectio nif range selection is not enabled
 * @param timeSelection
 * @param rangeSelectionEnabled
 */
function maybeOmitTimeSelectionEnd(
  timeSelection: TimeSelection,
  rangeSelectionEnabled: boolean
): TimeSelection {
  if (rangeSelectionEnabled) {
    return timeSelection;
  }

  return {
    start: timeSelection.start,
    end: null,
  };
}

/**
 * Clips a time selection and potentially removes the end step if range selection is not enabled
 */
export function formatTimeSelection(
  timeSelection: TimeSelection,
  minMaxStep: MinMaxStep,
  rangeSelectionEnabled: boolean
) {
  return maybeOmitTimeSelectionEnd(
    maybeClipTimeSelection(timeSelection, minMaxStep),
    rangeSelectionEnabled
  );
}

export const TEST_ONLY = {
  maybeClipTimeSelection,
  maybeOmitTimeSelectionEnd,
};
