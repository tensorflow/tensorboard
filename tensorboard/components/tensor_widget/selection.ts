/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

import {size} from './shape-utils';
import {Shape, TensorViewSlicingSpec} from './types';

/**
 * The possible status of a selected cell.
 */
export enum CellSelectionStatus {
  SELECTED = 1,
  LEFT_EDGE,
  RIGHT_EDGE,
  TOP_EDGE,
  BOTTOM_EDGE,
}

/**
 * The selection state within a n-dimensional tensor.
 */
export class TensorElementSelection {
  private sliceDims: number[];
  private sliceIndices: number[];
  private viewDims: number[];
  private rowStart: number;
  private colStart: number;
  private rowCount: number;
  private colCount: number;
  private rowEnd: number;
  private colEnd: number;

  /** TODO(cais): Doc string. */
  constructor(private readonly shape: Shape,
              readonly slicingSpec: TensorViewSlicingSpec,
              rowStart?: number,
              colStart?: number,
              rowCount?: number,
              colCount?: number) {
    if (size(this.shape) === 0) {
      throw new Error(
          `TensorElementSelection doesn't support tensor with zero elements.`);
    }

    this.sliceDims = slicingSpec.slicingDimsAndIndices.map(
        dimAndIndex => dimAndIndex.dim);
    this.sliceIndices = slicingSpec.slicingDimsAndIndices.map(
        dimAndIndex => dimAndIndex.index);

    // TODO(cais): Remove.
    // if (this.slicingSpec.slicingDimsAndIndices == null) {
    //   if (this.sliceIndices != null) {
    //     throw new Error(
    //         `sliceIndices is not null/undefined when sliceDims is ` +
    //         `null/undefined`);
    //   }
    //   this.sliceDims = [];
    //   this.sliceIndices = [];
    // }

    // Sanity check the size of the the slicing dimensions.
    if (this.rank() > 0 && this.sliceDims.length >= this.rank()) {
      throw new Error(
          `Expected sliceDims to have a length less than rank ${this.rank}, ` +
          `but got length ${this.sliceDims.length}`);
    }

    // Sanity check the slicing dimensions.
    // for (const sliceDim of this.sliceDims) {
    //   if (sliceDim > this.rank()) {
    //     throw new Error(
    //         `Slicing dimension (${sliceDim}) exceeds rank ` +
    //         `(${this.rank})`);
    //   }
    //   if (sliceDim < 0) {
    //     throw new Error(
    //         `Slicing dimension cannot be negative (${sliceDim})`);
    //   }
    //   if ((sliceDim)) {
    //     throw new Error(
    //         `Slicing dimension is expected to be an integer. ` +
    //         `But got ${this.sliceDims}`);
    //   }
    // }

    // Determine the viewing dimensions.
    this.viewDims = [];
    for (let i = 0; i < this.rank(); ++i) {
      if (this.sliceDims.indexOf(i) === -1) {
        this.viewDims.push(i);
      }
    }

    if (this.viewDims.length > 2) {
      throw new Error(`Only selections in 1D and 2D are supported.`);
    }

    this.rowStart = rowStart == null ? 0 : rowStart;
    this.colStart = colStart == null ? 0 : colStart;
    this.rowCount = rowCount == null ? 1 : rowCount;
    this.colCount = colCount == null ? 1 : colCount;
    this.rowEnd = this.rowStart + this.rowCount;
    this.colEnd = this.colStart + this.colCount;
  }

  private rank(): number {
    return this.shape.length;
  }

  /** TODO(cais): Doc string. */
  public getElementStatus(indices: number[]): CellSelectionStatus[]|null {
    if (indices.length !== this.rank()) {
      throw new Error(
          `Expected indices to have a rank of ${this.rank}, ` +
          `but got ${indices.length} ([${indices}])`);
    }

    // First, make sure that the indices belongs to a selected slice.
    for (let i = 0; i < indices.length; ++i) {
      if (this.sliceDims.indexOf(i) !== -1) {
        if (indices[i] !== this.sliceIndices[this.sliceDims.indexOf(i)]) {
          return null;
        }
      }
    }

    let status: CellSelectionStatus[]|null = null;

    // Second, check the viewing dims.
    if (this.viewDims.length === 0) {
      if (indices.length === 0) {
        if (status == null) {
          status = [];
        }
        status.push(CellSelectionStatus.SELECTED);
        status.push(CellSelectionStatus.TOP_EDGE);
        status.push(CellSelectionStatus.BOTTOM_EDGE);
        status.push(CellSelectionStatus.LEFT_EDGE);
        status.push(CellSelectionStatus.RIGHT_EDGE);
      }
      return status;
    } else if (this.viewDims.length === 1) {
      const rowDim = this.viewDims[0];
      if (indices[rowDim] >= this.rowStart && indices[rowDim] < this.rowEnd) {
        if (status == null) {
          status = [];
        }
        console.log('Selected!');  // DEBUG
        status.push(CellSelectionStatus.SELECTED);
        if (indices[rowDim] === this.rowStart) {
          console.log('1D top edge');  // DEBUG
          status.push(CellSelectionStatus.TOP_EDGE);
        }
        if (indices[rowDim] === this.rowEnd - 1) {
          console.log('1D top edge');  // DEBUG
          status.push(CellSelectionStatus.BOTTOM_EDGE);
        }
        status.push(CellSelectionStatus.LEFT_EDGE);
        status.push(CellSelectionStatus.RIGHT_EDGE);
      }
      return status;
    } else if (this.viewDims.length === 2) {
      // console.log('2D case', this.rowStart, this.rowEnd, this.colStart, this.colEnd);  // DEBUG
      const rowDim = this.viewDims[0];
      const colDim = this.viewDims[1];
      // console.log(`rowDim = ${rowDim}; colDim = ${colDim}`);  // DEBUG
      // console.log(`indices =`, indices);  // DEBUG
      if (indices[rowDim] >= this.rowStart && indices[rowDim] < this.rowEnd &&
          indices[colDim] >= this.colStart && indices[colDim] < this.colEnd) {
        if (status == null) {
          status = [];
        }
        console.log('Selected');
        status.push(CellSelectionStatus.SELECTED);
        if (indices[rowDim] === this.rowStart) {
          status.push(CellSelectionStatus.TOP_EDGE);
        }
        if (indices[rowDim] === this.rowEnd - 1) {
          status.push(CellSelectionStatus.BOTTOM_EDGE);
        }
        if (indices[colDim] === this.colStart) {
          status.push(CellSelectionStatus.LEFT_EDGE);
        }
        if (indices[colDim] === this.colEnd - 1) {
          status.push(CellSelectionStatus.RIGHT_EDGE);
        }
      }
      return status;
    } else {
      throw new Error(`Unexpected length of viewDims: ${this.viewDims}`);
    }
  }
}
