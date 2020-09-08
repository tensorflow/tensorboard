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
import {ValueData} from '../store/npmi_types';
import {stripMetricString} from './metric_type';

export function convertToCSVResult(
  flaggedData: [string, ValueData[]][],
  run: string,
  metrics: string[]
): string {
  const result = [[run, ...metrics]];
  if (!metrics.length || !flaggedData.length) {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      result.map((e) => e.join(',')).join('\n');
    return csvContent;
  }
  const strippedMetrics = metrics.map((metric) => stripMetricString(metric));
  for (const [annotation, valueDataList] of flaggedData) {
    const runValues = valueDataList.filter((values) => values.run === run);
    if (runValues.length) {
      const elementResult = [annotation];
      for (const metric of strippedMetrics) {
        const metricValue = runValues.find((value) => value.metric === metric);
        if (metricValue === undefined) {
          elementResult.push('null');
        } else {
          elementResult.push(`${metricValue.nPMIValue}`);
        }
      }
      result.push(elementResult);
    }
  }
  const csvContent =
    'data:text/csv;charset=utf-8,' + result.map((e) => e.join(',')).join('\n');
  return csvContent;
}
