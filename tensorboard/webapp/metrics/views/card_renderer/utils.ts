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
  startStep: number | null;
  endStep: number;
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
  const start =
    timeSelection.start !== null
      ? {
          step: clipStepWithinMinMax(
            timeSelection.start.step,
            minStep,
            maxStep
          ),
        }
      : null;
  const end = {
    step: clipStepWithinMinMax(timeSelection.end.step, minStep, maxStep),
  };
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
  const maybeClippedStartStep =
    timeSelection.start !== null
      ? clipStepWithinMinMax(timeSelection.start.step, minStep, maxStep)
      : null;
  const maybeClippedEndStep = clipStepWithinMinMax(
    timeSelection.end.step,
    minStep,
    maxStep
  );
  const clipped =
    maybeClippedStartStep !== (timeSelection.start?.step ?? null) ||
    maybeClippedEndStep !== timeSelection.end.step;
  return {
    startStep: maybeClippedStartStep,
    endStep: maybeClippedEndStep,
    clipped,
  };
}

/**
 * Sets endStep of TimeSelectionView to the closest step if the closeset step is not null.
 */
export function maybeSetClosestEndStep(
  timeSelectionView: TimeSelectionView,
  steps: number[]
): TimeSelectionView {
  // Only sets end step on single selection.
  if (timeSelectionView.startStep !== null) {
    return timeSelectionView;
  }

  const closestStep = getClosestStep(timeSelectionView.endStep, steps);
  if (closestStep !== null) {
    // If the closest step is endStep itself, this is equivalent to timeSelectionView.
    return {
      ...timeSelectionView,
      endStep: closestStep,
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
 * Removes the start step of a time selection if range selection is not enabled
 * @param timeSelection
 * @param rangeSelectionEnabled
 */
export function maybeOmitTimeSelectionStart(
  timeSelection: TimeSelection,
  rangeSelectionEnabled: boolean
): TimeSelection {
  if (rangeSelectionEnabled) {
    return timeSelection;
  }

  return {
    start: null,
    end: timeSelection.end,
  };
}

/**
 * Clips a time selection and potentially removes the start step if range selection is not enabled
 */
export function formatTimeSelection(
  timeSelection: TimeSelection,
  minMaxStep: MinMaxStep,
  rangeSelectionEnabled: boolean
) {
  return maybeOmitTimeSelectionStart(
    maybeClipTimeSelection(timeSelection, minMaxStep),
    rangeSelectionEnabled
  );
}
