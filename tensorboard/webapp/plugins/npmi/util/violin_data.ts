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
import * as d3 from '../../../third_party/d3';
import {AnnotationDataListing} from './../store/npmi_types';
import {stripMetricString} from './metric_type';

export type ViolinChartData = {[runId: string]: ViolinBin[]};
export type ViolinBin = d3.Bin<number, number>;

/**
 * Returns the data needed for the nPMI violin plots.
 *
 * @param annotationData the data that comes from the backend
 * @param activeRuns currently active runs to filter the data by
 * @param metricName selected metric to filter the data by
 */
export function violinData(
  annotationData: AnnotationDataListing,
  activeRuns: string[],
  metricName: string
): {
  violinData: ViolinChartData;
  extremes: {min: number; max: number};
} {
  const histogramData: {[run: string]: number[]} = {};
  const histogramDataNull: {[run: string]: any[]} = {};
  const allRuns = new Set(activeRuns);
  const strippedMetric = stripMetricString(metricName);
  const extremeValues = {max: -1.0, min: 1.0};
  Object.values(annotationData).forEach((annotationEntry) => {
    annotationEntry.forEach((valueDataElement) => {
      const run = valueDataElement.run;
      if (!allRuns.has(run) || valueDataElement.metric !== strippedMetric) {
        return;
      }
      if (valueDataElement.nPMIValue === null) {
        if (histogramDataNull[run]) {
          histogramDataNull[run].push(null);
        } else {
          histogramDataNull[run] = [null];
        }
      } else {
        const nPMIValue = valueDataElement.nPMIValue;
        extremeValues.max =
          extremeValues.max < nPMIValue ? nPMIValue : extremeValues.max;
        extremeValues.min =
          extremeValues.min > nPMIValue ? nPMIValue : extremeValues.min;
        if (histogramData[valueDataElement.run]) {
          histogramData[run].push(nPMIValue);
        } else {
          histogramData[run] = [nPMIValue];
        }
      }
    });
  });
  const result: ViolinChartData = {};
  const bin = d3
    .histogram()
    .domain([extremeValues.min, extremeValues.max])
    .value((d) => d);
  const binNaN = d3
    .histogram()
    .domain([-Infinity, Infinity])
    .thresholds(0)
    .value((d) => d);
  for (const run of allRuns) {
    result[run] = bin(histogramData[run]);
    if (histogramDataNull[run]) {
      const buckets = binNaN(histogramDataNull[run]);
      result[run].unshift(buckets[0]);
    }
  }
  return {violinData: result, extremes: extremeValues};
}
