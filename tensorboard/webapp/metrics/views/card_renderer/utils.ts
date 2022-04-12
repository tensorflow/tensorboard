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
import {LinkedTime} from '../../types';
import {PartialSeries, PartitionedSeries} from './scalar_card_types';

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

export interface ViewSelectedTime {
  startStep: number;
  endStep: number | null;
  clipped: boolean;
}

export function maybeClipSelectedTime(
  selectedTime: LinkedTime,
  minStep: number,
  maxStep: number
): ViewSelectedTime {
  if (
    // Case when selectedTime contains extents.
    (selectedTime.start.step <= minStep &&
      selectedTime.end &&
      maxStep <= selectedTime.end.step) ||
    // Case when start of selectedTime is within extent.
    (minStep <= selectedTime.start.step &&
      selectedTime.start.step <= maxStep) ||
    // Case when end of selectedTime is within extent.
    (selectedTime.end &&
      minStep <= selectedTime.end?.step &&
      selectedTime.end?.step <= maxStep)
  ) {
    return {
      startStep: selectedTime.start.step,
      endStep: selectedTime.end?.step ?? null,
      clipped: false,
    };
  }

  // When selectedTime and data extent (in step axis) do not overlap,
  // default single select min or max data extent depending on which side
  // the selectedTime is at.

  // Case when selectedTime is on the right of the maximum of the
  // time series.
  if (maxStep <= selectedTime.start.step) {
    return {
      startStep: maxStep,
      endStep: null,
      clipped: true,
    };
  }
  // Case when selectedtime is on the left of the minimum of the time
  // series.
  return {
    startStep: minStep,
    endStep: null,
    clipped: true,
  };
}

/**
 * Sets startStep of ViewSelectedTime to the closest step if the closeset step is not null.
 */
export function maybeSetClosestStartStep(
  viewSelectedTime: ViewSelectedTime,
  closestStep: number | null
): ViewSelectedTime {
  if (closestStep === null || viewSelectedTime.endStep !== null) {
    return viewSelectedTime;
  }

  viewSelectedTime.startStep = closestStep;

  return viewSelectedTime;
}

/**
 * Given an array of steps, returns the closest step to the target step. Returns null
 * if target step has existed in the array.
 */
export function getClosestNonTargetStep(
  targetStep: number,
  steps: number[]
): number | null {
  if (steps.length === 0 || steps.indexOf(targetStep) !== -1) {
    return null;
  }

  let minDistance = Infinity;
  let closestStep = null;
  for (const step of steps) {
    const distance = Math.abs(targetStep - step);
    // With the same distance between two steps, this method favors smaller step than larger
    // step. It is chosen unintentionally.
    if (distance < minDistance) {
      minDistance = distance;
      closestStep = step;
    }
  }
  return closestStep;
}
