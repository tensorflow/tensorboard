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
  ArithmeticElement,
  MetricFilterListing,
  ArithmeticKind,
} from './../store/npmi_types';
import {stripMetricString} from './metric_type';

export function filterAnnotations(
  annotationData: AnnotationDataListing,
  activeRuns: string[],
  metricArithmetic: ArithmeticElement[],
  metricFilters: MetricFilterListing,
  metrics: string[]
): AnnotationDataListing {
  const data: AnnotationDataListing = {};
  const annotations = Object.keys(annotationData);
  const allRuns = new Set(...activeRuns);
  const allMetrics = new Set(
    ...metrics.map((metric) => stripMetricString(metric))
  );
  annotations.forEach((annotation) => {
    let valueDataElements = annotationData[annotation];
    // Remove all inactive runs and keep only metrics currently displayed
    valueDataElements = valueDataElements.filter((valueDataElement) => {
      return (
        allRuns.has(valueDataElement.run) &&
        allMetrics.has(valueDataElement.metric)
      );
    });
    // Check all parts of the arithemetic
    let include = metricArithmetic.every((element) => {
      if (element.kind === ArithmeticKind.OPERATOR) {
        return true;
      }
      const metricFilter = metricFilters[element.metric];
      return valueDataElements.some((valueDataElement) => {
        if (stripMetricString(valueDataElement.metric) === element.metric) {
          if (!valueDataElement.nPMIValue && metricFilter.includeNaN) {
            return true;
          } else {
            return (
              valueDataElement.nPMIValue! <= metricFilter.max &&
              valueDataElement.nPMIValue! >= metricFilter.min
            );
          }
        }
        return false;
      });
    });
    if (include) {
      data[annotation] = valueDataElements;
    }
  });
  return data;
}

export function removeHiddenAnnotations(
  annotationData: AnnotationDataListing,
  hiddenAnnotations: string[],
  removeHidden: boolean
): AnnotationDataListing {
  if (!removeHidden) {
    return annotationData;
  }
  const data = annotationData;
  hiddenAnnotations.forEach((annotation) => delete data[annotation]);
  return data;
}
