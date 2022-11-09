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
import * as d3 from '../../third_party/d3';
import {
  DataSeries,
  DataSeriesMetadataMap,
  RendererType,
} from './lib/public_types';
import {ChartUtils} from './lib/utils';

/**
 * Returns extent, min and max values of each dimensions, of all data series points.
 *
 * When ignoreYOutliers is true, it will calculate extent using values within 5th and 95th
 * quantiles.
 *
 * Note that it excludes auxillary data points and invisible data series.
 */
export function computeDataSeriesExtent(
  data: DataSeries[],
  metadataMap: DataSeriesMetadataMap,
  ignoreYOutliers: boolean,
  isXSafeNumber: (x: number) => boolean,
  isYSafeNumber: (x: number) => boolean
): {x: [number, number] | undefined; y: [number, number] | undefined} {
  let xMin: number | null = null;
  let xMax: number | null = null;
  let yPoints: number[] = [];

  let pointIndex = 0;
  for (const {id, points} of data) {
    const meta = metadataMap[id];
    if (!meta || meta.aux || !meta.visible) continue;

    for (let index = 0; index < points.length; index++) {
      const {x, y} = points[index];
      if (isXSafeNumber(x)) {
        xMin = xMin === null || x < xMin ? x : xMin;
        xMax = xMax === null || x > xMax ? x : xMax;
      }
      if (isYSafeNumber(y)) {
        yPoints.push(y);
      }
      pointIndex++;
    }
  }

  yPoints.sort(d3.ascending);
  let yMin = yPoints[0];
  let yMax = yPoints[yPoints.length - 1];

  if (ignoreYOutliers && yPoints.length > 2) {
    yMin = yPoints[Math.ceil((yPoints.length - 1) * 0.05)];
    yMax = yPoints[Math.floor((yPoints.length - 1) * 0.95)];
  }

  return {
    x: xMin !== null && xMax !== null ? [xMin, xMax] : undefined,
    y: yMin !== undefined && yMax !== undefined ? [yMin, yMax] : undefined,
  };
}

export function getRendererType(
  preferredRendererType: RendererType
): RendererType {
  switch (preferredRendererType) {
    case RendererType.SVG:
      return RendererType.SVG;
    case RendererType.WEBGL:
      return ChartUtils.isWebGl2Supported()
        ? RendererType.WEBGL
        : RendererType.SVG;
    default:
      const _ = preferredRendererType as never;
      throw new Error(`Unknown rendererType: ${preferredRendererType}`);
  }
}
