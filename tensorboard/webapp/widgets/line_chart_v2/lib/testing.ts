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

import {DataSeries, DataSeriesMetadata} from './internal_types';

export function buildSeries(override: Partial<DataSeries>): DataSeries {
  return {
    id: 'foo',
    points: [
      {x: 1, y: 0},
      {x: 2, y: -1},
      {x: 2, y: 1},
    ],
    ...override,
  };
}

export function createSeries(
  id: string,
  pointFn: (index: number) => number = Math.sin
): DataSeries {
  return buildSeries({
    id,
    points: [...new Array(10)].map((_, index) => {
      return {x: index, y: pointFn(index)};
    }),
  });
}

export function buildMetadata(metadata: Partial<DataSeriesMetadata>) {
  return {
    id: 'line',
    displayName: 'Line',
    visible: true,
    color: '#000',
    ...metadata,
  };
}

/**
 * Asserts `d` attribute on a SVGPathElement.
 *
 * @param path An SVGPathElement with `d` attribute of format with absolute
 *    coordinates: M, L, and Zs. e.g., "M1,2L2,3L3,4Z".
 * @param roundedCoords Coordinates expected rounded to nearest integer.
 */
export function assertSvgPathD(
  path: SVGElement,
  roundedCoords: Array<[number, number]>
) {
  expect(path.nodeName).toBe('path');
  const dPath = path.getAttribute('d')!;
  const parts = dPath.replace(/[MZ]/g, '').split('L');
  expect(parts.length).toBe(roundedCoords.length);
  for (const [index, [x, y]] of roundedCoords.entries()) {
    const coordParts = parts[index].split(',');
    expect(coordParts.length).toBe(2);
    const [actualX, actualY] = coordParts;
    expect(Number(actualX)).toBeCloseTo(x, 0);
    expect(Number(actualY)).toBeCloseTo(y, 0);
  }
}
