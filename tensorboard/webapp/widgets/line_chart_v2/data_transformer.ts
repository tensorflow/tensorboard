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

import {DataSeries} from './lib/public_types';

/**
 * Smoothes data series in y axis using smoothing algorithm from classical TensorBoard
 * circa 2019-2020. 1st-order IIR low-pass filter to attenuate the higher-frequency
 * components of the time-series.
 * @param data DataSeries to smooth
 * @param smoothingWeight Degree of smoothing. Number between 0 and 1, inclusive.
 */
export async function classicSmoothing(
  data: DataSeries[],
  smoothingWeight: number
): Promise<DataSeries[]> {
  if (!data.length) [];

  if (!Number.isFinite(smoothingWeight)) {
    smoothingWeight = 0;
  }
  smoothingWeight = Math.max(0, Math.min(smoothingWeight, 1));

  const results: Array<{id: string; points: DataSeries['points']}> = [];

  for (const series of data) {
    const initialYVal = series.points[0]?.y;
    const isConstant = series.points.every((point) => point.y == initialYVal);

    // See #786.
    if (isConstant) {
      results.push(series);
      continue;
    }

    let last = series.points.length > 0 ? 0 : NaN;
    let numAccum = 0;

    const smoothedPoints = series.points.map((point) => {
      const nextVal = point.y;
      if (!Number.isFinite(nextVal)) {
        return {
          x: point.x,
          y: nextVal,
        };
      } else {
        last = last * smoothingWeight + (1 - smoothingWeight) * nextVal;
        numAccum++;
        // The uncorrected moving average is biased towards the initial value.
        // For example, if initialized with `0`, with smoothingWeight `s`, where
        // every data point is `c`, after `t` steps the moving average is
        // ```
        //   EMA = 0*s^(t) + c*(1 - s)*s^(t-1) + c*(1 - s)*s^(t-2) + ...
        //       = c*(1 - s^t)
        // ```
        // If initialized with `0`, dividing by (1 - s^t) is enough to debias
        // the moving average. We count the number of finite data points and
        // divide appropriately before storing the data.
        const debiasWeight =
          smoothingWeight === 1 ? 1 : 1 - Math.pow(smoothingWeight, numAccum);

        return {
          x: point.x,
          y: last / debiasWeight,
        };
      }
    });
    results.push({
      id: series.id,
      points: smoothedPoints,
    });
  }

  return results;
}
