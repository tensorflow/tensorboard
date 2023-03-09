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

export function clipStepWithinMinMax(value: number, min: number, max: number) {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

function maybeClipTimeSelection(
  timeSelection: TimeSelection,
  minMaxStep: MinMaxStep
) {
  const start = {
    step: clipStepWithinMinMax(
      timeSelection.start.step,
      minMaxStep.minStep,
      minMaxStep.maxStep
    ),
  };
  const end = timeSelection.end
    ? {
        step: clipStepWithinMinMax(
          timeSelection.end.step,
          minMaxStep.minStep,
          minMaxStep.maxStep
        ),
      }
    : null;
  return {
    start,
    end,
  };
}

function maybeIncludeEnd(
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

export function formatTimeSelection(
  timeSelection: TimeSelection,
  minMaxStep: MinMaxStep,
  rangeSelectionEnabled: boolean
) {
  return maybeIncludeEnd(
    maybeClipTimeSelection(timeSelection, minMaxStep),
    rangeSelectionEnabled
  );
}
