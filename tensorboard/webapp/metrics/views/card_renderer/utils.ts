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
import {ExperimentAlias} from '../../../experiments/types';
import {Run} from '../../../runs/store/runs_types';
import {TimeSelection} from '../../types';
import {
  MinMaxStep,
  PartialSeries,
  PartitionedSeries,
  ScalarCardDataSeries,
  ScalarCardSeriesMetadataMap,
} from './scalar_card_types';

export function getDisplayNameForRun(
  runId: string,
  run: Run | null,
  experimentAlias: ExperimentAlias | null | undefined
): string {
  if (!run && !experimentAlias) {
    return runId;
  }

  let displayName = run?.name ?? '...';

  if (experimentAlias) {
    displayName = `[${experimentAlias.aliasNumber}] ${experimentAlias.aliasText}/${displayName}`;
  }

  return displayName;
}

/**
 * Partitions runs into pseudo runs when its points have non-monotonically increasing
 * steps.
 */
export function partitionSeries(series: PartialSeries[]): PartitionedSeries[] {
  const partitionedSeries: PartitionedSeries[] = [];
  for (const datum of series) {
    const currentPartition: Array<
      Omit<PartitionedSeries, 'partitionSize' | 'partitionIndex'>
    > = [];
    let lastXValue = Number.isFinite(datum.points[0]?.x)
      ? datum.points[0]!.x
      : -Infinity;
    let currentPoints: PartitionedSeries['points'] = [];

    for (const point of datum.points) {
      if (!Number.isFinite(point.x)) {
        currentPoints.push(point);
        continue;
      }

      if (point.x < lastXValue) {
        currentPartition.push({
          seriesId: JSON.stringify([datum.runId, currentPartition.length]),
          runId: datum.runId,
          points: currentPoints,
        });
        currentPoints = [];
      }
      currentPoints.push(point);
      lastXValue = point.x;
    }

    currentPartition.push({
      seriesId: JSON.stringify([datum.runId, currentPartition.length]),
      runId: datum.runId,
      points: currentPoints,
    });

    for (let index = 0; index < currentPartition.length; index++) {
      partitionedSeries.push({
        ...currentPartition[index],
        partitionIndex: index,
        partitionSize: currentPartition.length,
      });
    }
  }
  return partitionedSeries;
}

export interface TimeSelectionView {
  startStep: number;
  endStep: number | null;
  clipped: boolean;
}

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

export function maybeClipTimeSelectionView(
  timeSelection: TimeSelection,
  minStep: number,
  maxStep: number
): TimeSelectionView {
  const maybeClippedStartStep = clipStepWithinMinMax(
    timeSelection.start.step,
    minStep,
    maxStep
  );
  const maybeClippedEndStep = timeSelection.end
    ? clipStepWithinMinMax(timeSelection.end.step, minStep, maxStep)
    : null;
  const clipped =
    maybeClippedStartStep !== timeSelection.start.step ||
    maybeClippedEndStep !== (timeSelection.end?.step ?? null);
  return {
    startStep: maybeClippedStartStep,
    endStep: maybeClippedEndStep,
    clipped,
  };
}

/**
 * Sets startStep of TimeSelectionView to the closest step if the closeset step is not null.
 */
export function maybeSetClosestStartStep(
  timeSelectionView: TimeSelectionView,
  steps: number[]
): TimeSelectionView {
  // Only sets start step on single selection.
  if (timeSelectionView.endStep !== null) {
    return timeSelectionView;
  }

  const closestStep = getClosestStep(timeSelectionView.startStep, steps);
  if (closestStep !== null) {
    // If the closest step is startStep itself, this is equivalent to timeSelectionView.
    return {
      ...timeSelectionView,
      startStep: closestStep,
    };
  }

  return timeSelectionView;
}

/**
 * Given an array of steps, returns the closest step to the selected step. Returns null
 * if there is no closest step, which only happens with empty steps array.
 */
export function getClosestStep(
  selectedStep: number,
  steps: number[]
): number | null {
  let minDistance = Infinity;
  let closestStep: number | null = null;
  for (const step of steps) {
    const distance = Math.abs(selectedStep - step);
    // With the same distance between two steps, this method favors smaller step than larger
    // step. It is chosen unintentionally.
    if (distance < minDistance) {
      minDistance = distance;
      closestStep = step;
    }
  }
  return closestStep;
}

/**
 * Used to determine if a data point should be rendered given the metadata.
 */
export function isDatumVisible(
  datum: ScalarCardDataSeries,
  metadataMap: ScalarCardSeriesMetadataMap
) {
  const metadata = metadataMap[datum.id];
  return metadata && metadata.visible && !Boolean(metadata.aux);
}

/**
 * Removes the end step of a time selection if range selection is not enabled
 * @param timeSelection
 * @param rangeSelectionEnabled
 */
export function maybeOmitTimeSelectionEnd(
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
