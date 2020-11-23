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
  DataSeries,
  DataSeriesMetadataMap,
  RendererType,
} from './lib/public_types';
import {isWebGl2Supported} from './lib/utils';

/**
 * Returns extent, min and max values of each dimensions, of all data series points.
 *
 * Note that it excludes auxillary data points and invisible data series.
 *
 * TODO(stephanwlee): add support for ignoreOutlier.
 */
export function computeDataSeriesExtent(
  data: DataSeries[],
  metadataMap: DataSeriesMetadataMap
): {x: [number, number] | undefined; y: [number, number] | undefined} {
  let xMin = Infinity;
  let xMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;

  let xExtentChanged = false;
  let yExtentChanged = false;

  for (const {id, points} of data) {
    const meta = metadataMap[id];
    if (!meta || meta.aux || !meta.visible) continue;

    for (let index = 0; index < points.length; index++) {
      const {x, y} = points[index];
      if (!Number.isNaN(x)) {
        xMin = Math.min(xMin, x);
        xMax = Math.max(xMax, x);
        xExtentChanged = true;
      }
      if (!Number.isNaN(y)) {
        yMin = Math.min(yMin, y);
        yMax = Math.max(yMax, y);
        yExtentChanged = true;
      }
    }
  }

  return {
    x: xExtentChanged ? [xMin, xMax] : undefined,
    y: yExtentChanged ? [yMin, yMax] : undefined,
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
