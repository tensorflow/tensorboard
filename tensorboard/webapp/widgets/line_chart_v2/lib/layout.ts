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

import {Rect} from './types';

export enum LayoutStrategy {
  MATCH_PARENT,
  FIXED,
}

export interface LayoutOption {
  container: OffscreenCanvas | Element;
  widthLayoutStrategy?: LayoutStrategy;
  heightLayoutStrategy?: LayoutStrategy;
}

/**
 * Rectangular layout. A layou can nest other layouts in a grid (rows then columns).
 */
export abstract class RectLayout {
  protected readonly widthLayoutStrategy: LayoutStrategy;
  protected readonly heightLayoutStrategy: LayoutStrategy;

  protected readonly container: Element | OffscreenCanvas;

  private readonly childLayout: RectLayout[][];
  private layout: Rect | null = null;

  protected layoutChanged: boolean = true;

  constructor(config: LayoutOption, childLayout: RectLayout[][] = []) {
    const configWithDefault = {
      widthLayoutStrategy: LayoutStrategy.MATCH_PARENT,
      heightLayoutStrategy: LayoutStrategy.MATCH_PARENT,
      ...config,
    };
    this.widthLayoutStrategy = configWithDefault.widthLayoutStrategy;
    this.heightLayoutStrategy = configWithDefault.heightLayoutStrategy;
    this.container = configWithDefault.container;

    this.validateContentGrid(childLayout);
    this.childLayout = childLayout;
  }

  private validateContentGrid(childLayout: RectLayout[][]) {
    if (!childLayout.length) {
      return;
    }
    const expectedColumnLength = childLayout[0].length;
    for (const gridRow of childLayout) {
      if (gridRow.length !== expectedColumnLength) {
        throw new RangeError('Expected grid to have same column counts');
      }
    }
  }

  /**
   * Triggered when container dimension changes or when data extent changes.
   */
  proposeWidth(): number {
    if (this.widthLayoutStrategy === LayoutStrategy.FIXED) {
      throw new RangeError(
        'proposeWidth is a required method for FIXED layout'
      );
    }
    return 0;
  }

  /**
   * Triggered when container dimension changes or when data extent changes.
   */
  proposeHeight(): number {
    if (this.heightLayoutStrategy === LayoutStrategy.FIXED) {
      throw new RangeError(
        'proposeHeight is a required method for FIXED layout'
      );
    }
    return 0;
  }

  getLayoutRect() {
    if (!this.layout) {
      throw new Error(
        'Invariant error: cannot read layout before layout is invoked'
      );
    }
    return this.layout;
  }

  children(): ReadonlyArray<RectLayout> {
    return this.childLayout.flat();
  }

  getContentGrid(): ReadonlyArray<ReadonlyArray<RectLayout>> {
    return this.childLayout;
  }

  getWidth(): number {
    return this.layout ? this.layout.width : 0;
  }

  getHeight(): number {
    return this.layout ? this.layout.height : 0;
  }

  getWidthLayoutStrategy(): LayoutStrategy {
    return this.widthLayoutStrategy;
  }

  getHeightLayoutStrategy(): LayoutStrategy {
    return this.heightLayoutStrategy;
  }

  internalOnlySetLayout(layout: Rect) {
    const originalLayout = this.layout;

    this.layout = layout;

    if (
      originalLayout &&
      layout.x === originalLayout.x &&
      layout.y === originalLayout.y &&
      layout.width === originalLayout.width &&
      layout.height === originalLayout.height
    ) {
      return;
    }

    // When the layout changes, we need to repaint.
    this.layoutChanged = true;
  }

  relayout() {
    if (!this.layout) {
      throw new RangeError('Require `layout` to be set before relaying out');
    }

    interface Dimension {
      width: number | null;
      height: number | null;
    }
    const dimensions: Dimension[][] = [];
    const selfWidth = this.getWidth();
    const selfHeight = this.getHeight();
    const rowCount = this.childLayout.length;
    const columnCount = (this.childLayout[0] || []).length;

    // 1. gather all fixed/concrete dimensions. Set flexible ones as `null`.
    for (const childrenRow of this.childLayout) {
      const rowDimensions: Dimension[] = [];
      dimensions.push(rowDimensions);
      for (const childLayout of childrenRow) {
        const columnDimension: Dimension = {
          width: null,
          height: null,
        };
        if (childLayout.getWidthLayoutStrategy() === LayoutStrategy.FIXED) {
          columnDimension.width = childLayout.proposeWidth();
        }
        if (childLayout.getHeightLayoutStrategy() === LayoutStrategy.FIXED) {
          columnDimension.height = childLayout.proposeHeight();
        }
        rowDimensions.push(columnDimension);
      }
    }

    // 2. calculate max width per column and max height per row.
    const rowHeights: Array<number | null> = [];
    const columnWidths: Array<number | null> = [];
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
      const dimRow = dimensions[rowIndex];
      const maxHeightForRow = Math.max(
        ...dimRow.map(({height}) => height || 0)
      );
      rowHeights.push(maxHeightForRow === 0 ? null : maxHeightForRow);
    }

    for (let colIndex = 0; colIndex < columnCount; colIndex++) {
      const maxWidthForColumn = Math.max(
        ...dimensions.map((row) => row[colIndex].width || 0)
      );
      columnWidths.push(maxWidthForColumn === 0 ? null : maxWidthForColumn);
    }

    // 3. compute concrete width/height for flexible ones and form a dense grid
    // on dimensions
    const numFlexRows = rowHeights.filter((row) => row === null).length;
    const flexibleHeight = rowHeights.reduce(
      (remaining: number, height: number | null) => {
        if (height === null) {
          return remaining;
        }
        return Math.max(remaining - height, 0);
      },
      selfHeight
    );

    const numFlexColumns = columnWidths.filter((column) => column === null)
      .length;
    const flexibleWidth = columnWidths.reduce(
      (remaining: number, width: number | null) => {
        if (width === null) {
          return remaining;
        }
        return Math.max(remaining - width, 0);
      },
      selfWidth
    );

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
      const height =
        rowHeights[rowIndex] !== null
          ? rowHeights[rowIndex]
          : flexibleHeight / numFlexRows;
      for (let colIndex = 0; colIndex < columnCount; colIndex++) {
        const width =
          columnWidths[colIndex] !== null
            ? columnWidths[colIndex]
            : flexibleWidth / numFlexColumns;

        dimensions[rowIndex][colIndex].height = height;
        dimensions[rowIndex][colIndex].width = width;
      }
    }

    let y = this.layout.y;
    // 4. compute offset coordinate and set them to the child content grid.
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
      const row = dimensions[rowIndex];
      let x = this.layout.x;
      for (let colIndex = 0; colIndex < columnCount; colIndex++) {
        const {width, height} = row[colIndex];
        this.childLayout[rowIndex][colIndex].internalOnlySetLayout({
          x: x,
          y: y,
          width: width!,
          height: height!,
        });
        x += width!;
      }

      const height = row[0]?.height || 0;
      y += height;
    }
  }
}
