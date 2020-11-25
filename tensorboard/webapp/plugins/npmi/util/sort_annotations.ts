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
  AnnotationSort,
  SortOrder,
} from '../store/npmi_types';
import {stripMetricString} from './metric_type';

export function sortAnnotations(
  annotationData: AnnotationDataListing,
  sort: AnnotationSort
): string[] {
  let result = Object.keys(annotationData);
  const strippedMetric = stripMetricString(sort.metric);
  if (sort.metric === '') {
    return result;
  }
  if (sort.order === SortOrder.DOWN) {
    const maxData: {[annotation: string]: number} = {};
    for (const annotation of result) {
      maxData[annotation] = Math.max(
        ...annotationData[annotation]
          .filter((annotation) => annotation.metric === strippedMetric)
          .map((filtered) =>
            filtered.nPMIValue === null ? -Infinity : filtered.nPMIValue
          )
      );
    }
    result = result.sort((a, b) => {
      return maxData[b] - maxData[a];
    });
  } else if (sort.order === SortOrder.UP) {
    const minData: {[annotation: string]: number} = {};
    for (const annotation of result) {
      minData[annotation] = Math.min(
        ...annotationData[annotation]
          .filter((annotation) => annotation.metric === strippedMetric)
          .map((filtered) =>
            filtered.nPMIValue === null ? Infinity : filtered.nPMIValue
          )
      );
    }
    result = result.sort((a, b) => {
      return minData[a] - minData[b];
    });
  }
  return result;
}
