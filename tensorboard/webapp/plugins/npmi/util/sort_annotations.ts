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
import {
  AnnotationDataListing,
  AnnotationSorting,
  SortingOrder,
} from '../store/npmi_types';
import {stripMetricString} from './metric_type';

export function getSortedAnnotations(
  annotationData: AnnotationDataListing,
  sorting: AnnotationSorting
): string[] {
  let result = Object.keys(annotationData);
  const strippedMetric = stripMetricString(sorting.metric);
  if (sorting.metric === '') {
    return result;
  }
  if (sorting.order === SortingOrder.DOWN) {
    result = result.sort(function(a, b) {
      return (
        Math.max(
          ...annotationData[b]
            .filter((annotation) => annotation.metric === strippedMetric)
            .map((filtered) =>
              filtered.nPMIValue === null ? -Infinity : filtered.nPMIValue
            )
        ) -
        Math.max(
          ...annotationData[a]
            .filter((annotation) => annotation.metric === strippedMetric)
            .map((filtered) =>
              filtered.nPMIValue === null ? -Infinity : filtered.nPMIValue
            )
        )
      );
    });
  } else if (sorting.order === SortingOrder.UP) {
    result = result.sort(function(a, b) {
      return (
        Math.min(
          ...annotationData[a]
            .filter((annotation) => annotation.metric === strippedMetric)
            .map((filtered) =>
              filtered.nPMIValue === null ? Infinity : filtered.nPMIValue
            )
        ) -
        Math.min(
          ...annotationData[b]
            .filter((annotation) => annotation.metric === strippedMetric)
            .map((filtered) =>
              filtered.nPMIValue === null ? Infinity : filtered.nPMIValue
            )
        )
      );
    });
  }
  return result;
}
