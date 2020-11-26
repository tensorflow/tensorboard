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
import {isWebGl2Supported} from './lib/utils';

/**
 * Returns extent, min and max values of each dimensions, of all data series points.
 *
 * When ignoreYOutliers is true, it will filter out values that are approximately [1] less
 * than 5th and greater than 95th percentile when calculating y-extent.
 *
 * Note that it excludes auxillary data points and invisible data series.
 *
 * [1]: Uses R-7 method for approximation: https://github.com/d3/d3-array#quantile
 */
export function computeDataSeriesExtent(
  data: DataSeries[],
  metadataMap: DataSeriesMetadataMap,
  ignoreYOutliers: boolean
): {x: [number, number] | undefined; y: [number, number] | undefined} {
  let yPoints: number[] = [];
  const xPoints: number[] = [];

  let pointIndex = 0;
  for (const {id, points} of data) {
    const meta = metadataMap[id];
    if (!meta || meta.aux || !meta.visible) continue;

    for (let index = 0; index < points.length; index++) {
      const {x, y} = points[index];
      if (Number.isFinite(x)) {
        xPoints.push(x);
      }
      if (Number.isFinite(y)) {
        yPoints.push(y);
      }
      pointIndex++;
    }
  }

  yPoints.sort(d3.ascending);

  if (ignoreYOutliers && yPoints.length > 2) {
    const aY = d3.quantile(yPoints, 0.05)!;
    const bY = d3.quantile(yPoints, 0.95)!;
    yPoints = yPoints.filter((val) => {
      return aY <= val && val <= bY;
    });
  }

  const [xMin, xMax] = d3.extent(xPoints);
  const yMin = yPoints[0];
  const yMax = yPoints[yPoints.length - 1];

  return {
    x: xMin !== undefined && xMax !== undefined ? [xMin, xMax] : undefined,
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
      return isWebGl2Supported() ? RendererType.WEBGL : RendererType.SVG;
    default:
      const _ = preferredRendererType as never;
      throw new Error(`Unknown rendererType: ${preferredRendererType}`);
  }
}
