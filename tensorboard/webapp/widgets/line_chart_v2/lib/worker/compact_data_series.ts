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

import {DataSeries} from '../internal_types';

export interface CompactDataSeries {
  idsAndLengths: Array<{id: string; length: number}>;
  // buffer of packed f64s that represents 2d coordinates, [x1, y1, x2, y2, ..., xn, yn].
  flattenedSeries: ArrayBuffer;
}

/**
 * Converts array of DataSeries to a compact represenation for postMessage.
 *
 * Sending a large JavaScript object can lead to inefficiency as it spends significant
 * amount of time on JSON.stringify and JSON.parse. In a smaller test of sending 1000
 * points, we saw about 4.5x speed up when using the typed array.
 */
export function compactDataSeries(
  dataSeriesArr: DataSeries[]
): CompactDataSeries {
  const totalLength = dataSeriesArr.reduce((len: number, data: DataSeries) => {
    return len + data.points.length;
  }, 0);
  let seriesIndex = 0;
  const flattenedSeries = new Float64Array(totalLength * 2);
  const idsAndLengths: Array<{id: string; length: number}> = [];

  for (const series of dataSeriesArr) {
    idsAndLengths.push({
      id: series.id,
      length: series.points.length,
    });
    for (let index = 0; index < series.points.length; index++) {
      flattenedSeries[seriesIndex++] = series.points[index].x;
      flattenedSeries[seriesIndex++] = series.points[index].y;
    }
  }
  return {idsAndLengths, flattenedSeries: flattenedSeries.buffer};
}

/**
 * Converts compact representation of array of DataSeries into DataSeriesArray.
 */
export function decompactDataSeries(
  compactDataSeries: CompactDataSeries
): DataSeries[] {
  const {flattenedSeries, idsAndLengths} = compactDataSeries;
  const rawData = new Float64Array(flattenedSeries);
  const data: DataSeries[] = [];

  if (rawData.length % 2 !== 0) {
    throw new Error('`flattenedSeries` must have even number of elements');
  }

  let rawDataIndex = 0;
  for (const {id, length} of idsAndLengths) {
    const points: Array<{x: number; y: number}> = [];
    for (let index = 0; index < length; index++) {
      points.push({
        x: rawData[rawDataIndex++],
        y: rawData[rawDataIndex++],
      });
    }
    data.push({
      id,
      points,
    });
  }

  return data;
}
