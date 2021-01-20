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

import {DataDrawable} from './drawable';
import {Polyline} from './internal_types';

enum PartitionType {
  NUMBER,
  NAN,
}

export class SeriesLineView extends DataDrawable {
  private recordPartition(
    isNumberPartition: boolean,
    slice: Float32Array,
    nanSubstitute: {x: number; y: number}
  ) {
    return isNumberPartition
      ? {type: PartitionType.NUMBER, polyline: slice}
      : {
          type: PartitionType.NAN,
          polyline: slice.map((x, ind) => {
            if (!isNaN(x)) return x;
            return ind % 2 === 0 ? nanSubstitute.x : nanSubstitute.y;
          }),
        };
  }

  /**
   * @param polyline Expects the polyline to have even length and encode two-dimensional
   *   coordinates.
   */
  private partitionPolyline(
    polyline: Polyline
  ): Array<{polyline: Float32Array; type: PartitionType}> {
    const partition = [];
    let partitionStartInd: number = 0;
    let isPrevValueNaN = false;
    const zeroCoord = this.coordinator.transformDataToUiCoord(
      this.getLayoutRect(),
      [0, 0]
    );
    const zeroPoint = {x: zeroCoord[0], y: zeroCoord[1]};

    let lastLegalNumber: {
      x: number;
      y: number;
    } | null = null;

    for (let index = 0; index < polyline.length; index += 2) {
      const x = polyline[index];
      const y = polyline[index + 1];
      const hasNaN = isNaN(x) || isNaN(y);
      if (hasNaN !== isPrevValueNaN && partitionStartInd !== index) {
        partition.push(
          this.recordPartition(
            !isPrevValueNaN,
            polyline.slice(partitionStartInd, index),
            lastLegalNumber === null ? {x, y} : lastLegalNumber
          )
        );
        partitionStartInd = index;
      }

      if (!hasNaN) {
        lastLegalNumber = {x, y};
      }

      isPrevValueNaN = hasNaN;
    }

    if (partitionStartInd !== polyline.length - 1) {
      partition.push(
        this.recordPartition(
          !isPrevValueNaN,
          polyline.slice(partitionStartInd, polyline.length),
          lastLegalNumber ?? zeroPoint
        )
      );
    }

    return partition;
  }

  redraw() {
    for (const series of this.series) {
      const map = this.getMetadataMap();
      const metadata = map[series.id];
      if (!metadata) continue;
      if (series.polyline.length % 2 !== 0) {
        throw new Error(
          `Cannot have odd length-ed polyline: ${series.polyline.length}`
        );
      }

      const partitionedPolyline = this.partitionPolyline(series.polyline);

      for (const [
        partitionInd,
        {type, polyline},
      ] of partitionedPolyline.entries()) {
        if (type === PartitionType.NUMBER) {
          if (polyline.length === 2) {
            this.paintBrush.setCircle(
              JSON.stringify(['circle', series.id, partitionInd]),
              {x: polyline[0], y: polyline[1]},
              {
                color: metadata.color,
                visible: metadata.visible,
                opacity: metadata.opacity ?? 1,
                radius: 4,
              }
            );
          } else {
            this.paintBrush.setLine(
              JSON.stringify(['line', series.id, partitionInd]),
              polyline,
              {
                color: metadata.color,
                visible: metadata.visible,
                opacity: metadata.opacity ?? 1,
                width: 2,
              }
            );
          }
          // Should not render triangles to mark NaNs for auxiliary lines.
        } else if (!metadata.aux) {
          for (let index = 0; index < polyline.length; index += 2) {
            this.paintBrush.setTriangle(
              JSON.stringify([
                'NaN',
                series.id,
                polyline[index],
                polyline[index + 1],
              ]),
              {x: polyline[index], y: polyline[index + 1]},
              {
                color: metadata.color,
                visible: metadata.visible,
                opacity: metadata.opacity ?? 1,
                size: 12,
              }
            );
          }
        }
      }
    }
  }
}
