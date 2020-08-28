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
import {SortingOrder} from './../store/npmi_types';

export function metricIsCount(metric: string): boolean {
  return metric.startsWith('count');
}

export function metricIsMetricCount(metric: string): boolean {
  return metric.startsWith('count@');
}

export function metricIsNpmi(metric: string): boolean {
  return metric.startsWith('nPMI');
}

export function metricIsNpmiAndNotDiff(metric: string): boolean {
  return metric.startsWith('nPMI@');
}

export function stripMetricString(metricString: string): string {
  const strippedString = metricString.split('@', 2)[1];
  return strippedString;
}

export function addSortingSymbol(
  metricString: string,
  sorting: {metric: string; order: SortingOrder}
): string {
  let result = metricString;
  if (metricString === sorting.metric) {
    if (sorting.order === SortingOrder.DOWN) {
      result = result + ' ↓';
    } else if (sorting.order === SortingOrder.UP) {
      result = result + ' ↑';
    }
  }
  return result;
}
