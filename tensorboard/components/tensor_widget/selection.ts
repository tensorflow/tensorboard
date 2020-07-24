/* Copyright 2019 The TensorFlow Authors. All Rights Reserved.

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

import {numElements} from './shape-utils';
import {MoveDirection, Shape, TensorViewSlicingSpec} from './types';

/**
 * The possible status of a selected cell.
 */
export interface CellSelectionStatus {
  topEdge?: boolean;
  bottomEdge?: boolean;
  leftEdge?: boolean;
  rightEdge?: boolean;
}

/**
 * The selection state within a n-dimensional tensor.
 *
 * This class keeps track of what element(s) are selected in the
 * current viewing dimensions of the tensor. It provides capabilities to:
 * - Query whether a given set of indices falls into the selection, and
 * - if so, whether it belongs to any of the four edges of selection.
 * - When a selection is moved, what the new selection is and
 * - if the new selection falls out of the current slicing spec, how the
 *   slicing spec ought to be updated to accommodate it.
 */
export class TensorElementSelection {
  private sliceDims: number[] = [];
  private sliceIndices: number[] = [];
  private viewDims: number[];
  private rowStart: number;
  private colStart: number;
  private rowCount: number;
  private colCount: number;
  private readonly rank: number;

  /**
   * Constructor of TensorElementSelection
   * @param shape Shape of the tensor in which the viewing and selection is
   *   taking place.
   * @param slicingSpec The current slicing spec for the tensor.
   * @param rowStart The starting row of selection, within the indices
   *   framework of the original tensor (i.e., *not* with respect to the
   *   slicing spec.)
   * @param colStart The starting column of selection, within the indices
   *   framework of the original tensor (i.e., *not* with respect to the
   *   slicing spec.)
   * @param rowCount How many rows are selected.
   * @param colCount How many columns are selected.
   */
  constructor(
    private readonly shape: Shape,
    slicingSpec: TensorViewSlicingSpec,
    rowStart?: number,
    colStart?: number,
    rowCount?: number,
    colCount?: number
  ) {
    if (numElements(this.shape) === 0) {
      throw new Error(
        `TensorElementSelection doesn't support tensor with zero elements.`
      );
    }

    for (let i = 0; i < slicingSpec.slicingDimsAndIndices.length; ++i) {
      this.sliceDims.push(slicingSpec.slicingDimsAndIndices[i].dim);
      const index = slicingSpec.slicingDimsAndIndices[i].index;
      if (index === null) {
        throw new Error(
          `Failed to create TensorElementSelection due to ` +
            `undetermined slicing index at dimension ${i}`
        );
      }
      this.sliceIndices.push(index);
    }

    this.rank = this.shape.length;

    // Sanity check the size of the the slicing dimensions.
    if (this.rank > 0 && this.sliceDims.length >= this.rank) {
      throw new Error(
        `Expected sliceDims to have a length less than rank ${this.rank}, ` +
          `but got length ${this.sliceDims.length}`
      );
    }

    // Determine the viewing dimensions.
    this.viewDims = [];
    for (let i = 0; i < this.rank; ++i) {
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
  }

  /**
   * Compute whether a given set of indices falls into the selection.
   *
   * ... and if so, whether the set of indices belongs to any of the four
   * edges of the selected region.
   *
   * @param indices
   * @return Cell selection status, if the set of indices falls into the
   *   selection. `null` otherwise.
   */
  public getElementStatus(indices: number[]): CellSelectionStatus | null {
    if (indices.length !== this.rank) {
      throw new Error(
        `Expected indices to have a rank of ${this.rank}, ` +
          `but got ${indices.length} ([${indices}])`
      );
    }

    // First, make sure that the indices belongs to a selected slice.
    for (let i = 0; i < indices.length; ++i) {
      if (this.sliceDims.indexOf(i) !== -1) {
        if (indices[i] !== this.sliceIndices[this.sliceDims.indexOf(i)]) {
          return null;
        }
      }
    }

    let status: CellSelectionStatus | null = null;

    const rowEnd = this.rowStart + this.rowCount;
    const colEnd = this.colStart + this.colCount;

    // Second, check the viewing dims.
    if (this.viewDims.length === 0) {
      if (indices.length === 0) {
        status = {
          topEdge: true,
          bottomEdge: true,
          leftEdge: true,
          rightEdge: true,
        };
      }
    } else if (this.viewDims.length === 1) {
      const rowDim = this.viewDims[0];
      if (indices[rowDim] >= this.rowStart && indices[rowDim] < rowEnd) {
        status = {
          topEdge: indices[rowDim] === this.rowStart,
          bottomEdge: indices[rowDim] === rowEnd - 1,
          leftEdge: true,
          rightEdge: true,
        };
      }
    } else if (this.viewDims.length === 2) {
      const rowDim = this.viewDims[0];
      const colDim = this.viewDims[1];
      if (
        indices[rowDim] >= this.rowStart &&
        indices[rowDim] < rowEnd &&
        indices[colDim] >= this.colStart &&
        indices[colDim] < colEnd
      ) {
        status = {
          topEdge: indices[rowDim] === this.rowStart,
          bottomEdge: indices[rowDim] === rowEnd - 1,
          leftEdge: indices[colDim] === this.colStart,
          rightEdge: indices[colDim] === colEnd - 1,
        };
      }
    } else {
      throw new Error(`Unexpected length of viewDims: ${this.viewDims}`);
    }
    return status;
  }

  /**
   * Move the selection.
   *
   * Updates the state of the object accordingly. It disallows going off the
   * edges.
   *
   * Moving a multi-element selection always causes the selection to
   * collapse to a single element.
   *
   * @param direction Direction in which this movement is being made.
   * @param current slicing spec.
   * @return The direction in which the vertical or horizontal viewing range
   *   of the slicing spec should change. This is just an advisory.
   *   It is up to the caller to actually update the slicing spec.
   */
  public move(
    direction: MoveDirection,
    slicingSpec: TensorViewSlicingSpec
  ): MoveDirection | null {
    let slicingMoveDirection: MoveDirection | null = null;
    if (this.rank === 0) {
      // No-op for a scalar.
      return null;
    }
    if (
      this.rank === 1 &&
      (direction === MoveDirection.LEFT || direction === MoveDirection.RIGHT)
    ) {
      // No-op for moving left or right in a 1D tensor.
      return null;
    }

    if (
      slicingSpec.verticalRange === null ||
      slicingSpec.verticalRange[1] === null
    ) {
      throw new Error(`Failed to move due to undetermined vertical range.`);
    }

    if (direction === MoveDirection.UP) {
      if (this.rowStart > 0) {
        this.rowStart--;
        if (
          slicingSpec.verticalRange != null &&
          this.rowStart < slicingSpec.verticalRange[0]
        ) {
          slicingMoveDirection = MoveDirection.UP;
        }
      }
    } else if (direction === MoveDirection.DOWN) {
      if (
        slicingSpec.viewingDims != null &&
        slicingSpec.viewingDims[0] != null &&
        this.rowStart < this.shape[slicingSpec.viewingDims[0]] - 1
      ) {
        this.rowStart++;
        if (
          slicingSpec.verticalRange != null &&
          this.rowStart >= slicingSpec.verticalRange[1]
        ) {
          slicingMoveDirection = MoveDirection.DOWN;
        }
      }
    } else if (direction === MoveDirection.LEFT) {
      if (this.colStart > 0) {
        this.colStart--;
        if (
          slicingSpec.horizontalRange != null &&
          this.colStart < slicingSpec.horizontalRange[0]
        ) {
          slicingMoveDirection = MoveDirection.LEFT;
        }
      }
    } else if (direction === MoveDirection.RIGHT) {
      if (
        slicingSpec.viewingDims != null &&
        slicingSpec.viewingDims[1] != null &&
        this.colStart < this.shape[slicingSpec.viewingDims[1]] - 1
      ) {
        this.colStart++;
        if (
          slicingSpec.horizontalRange != null &&
          this.colStart >= (slicingSpec.horizontalRange[1] as number)
        ) {
          slicingMoveDirection = MoveDirection.RIGHT;
        }
      }
    }
    // Moving the selection causes the selection size to collapse to 1x1.
    this.rowCount = 1;
    this.colCount = 1;
    return slicingMoveDirection;
  }

  public getRowStart(): number {
    return this.rowStart;
  }

  public getRowCount(): number {
    return this.rowCount;
  }

  public getColStart(): number {
    return this.colStart;
  }

  public getColCount(): number {
    return this.colCount;
  }
}
