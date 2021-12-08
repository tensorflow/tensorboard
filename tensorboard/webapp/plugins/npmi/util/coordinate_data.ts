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
import {AnnotationDataListing, ValueData} from '../store/npmi_types';

export type Coordinate = {
  runId: string;
  annotation: string;
  values: ValueData[];
};

export function convertToCoordinateData(
  annotationData: AnnotationDataListing,
  selectedAnnotations: string[],
  activeRuns: string[],
  activeMetrics: string[]
): {coordinates: Coordinate[]; extremes: {min: number; max: number}} {
  const result: Coordinate[] = [];
  const extremeValues = {max: -1.0, min: 1.0};
  const allRuns = new Set(activeRuns);
  const allMetrics = new Set(activeMetrics);
  if (
    allRuns.size === 0 ||
    allMetrics.size === 0 ||
    Object.keys(annotationData).length === 0
  ) {
    return {coordinates: [], extremes: {min: -1.0, max: 1.0}};
  }
  selectedAnnotations.forEach((annotation) => {
    const data = annotationData[annotation];
    const runResult: {[runId: string]: ValueData[]} = {};
    data.forEach((entry) => {
      if (!allRuns.has(entry.run) || !allMetrics.has(entry.metric)) {
        return;
      }
      if (runResult[entry.run]) {
        runResult[entry.run].push(entry);
      } else {
        runResult[entry.run] = [entry];
      }
      if (entry.nPMIValue !== null) {
        extremeValues.max = Math.max(extremeValues.max, entry.nPMIValue);
        extremeValues.min = Math.min(extremeValues.min, entry.nPMIValue);
      } else {
        extremeValues.max = Math.max(extremeValues.max, 0);
        extremeValues.min = Math.min(extremeValues.min, 0);
      }
    });
    for (const key of Object.keys(runResult)) {
      result.push({
        annotation,
        runId: key,
        values: runResult[key],
      });
    }
  });
  if (extremeValues.max < extremeValues.min) {
    extremeValues.max = 1.0;
    extremeValues.min = -1.0;
  }
  return {coordinates: result, extremes: extremeValues};
}
