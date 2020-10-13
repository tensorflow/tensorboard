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

import {RectLayout, LayoutStrategy, LayoutOption} from './layout';
import {Rect} from './types';

export class CompositeLayout extends RectLayout {
  private readonly superposedLayouts: RectLayout[];

  constructor(config: LayoutOption, contentColumns: RectLayout[]) {
    let heightLayoutStrategy: LayoutStrategy = LayoutStrategy.MATCH_PARENT;
    let widthLayoutStrategy: LayoutStrategy = LayoutStrategy.MATCH_PARENT;
    for (const column of contentColumns) {
      if (column.getHeightLayoutStrategy() === LayoutStrategy.FIXED) {
        heightLayoutStrategy = LayoutStrategy.FIXED;
      }
      if (column.getWidthLayoutStrategy() === LayoutStrategy.FIXED) {
        widthLayoutStrategy = LayoutStrategy.FIXED;
      }
    }

    super(
      {
        ...config,
        heightLayoutStrategy,
        widthLayoutStrategy,
      },
      []
    );
    this.superposedLayouts = contentColumns;
  }

  children(): ReadonlyArray<RectLayout> {
    return this.superposedLayouts;
  }

  getContentGrid() {
    return [this.superposedLayouts];
  }

  proposeWidth(): number {
    let width = 0;
    if (this.widthLayoutStrategy === LayoutStrategy.FIXED) {
      for (const layout of this.children()) {
        if (layout.getWidthLayoutStrategy() === LayoutStrategy.FIXED) {
          width = Math.max(layout.proposeWidth(), width);
        }
      }
    }
    return width;
  }

  /**
   * Triggered when container dimension changes or when data extent changes.
   */
  proposeHeight(): number {
    let height = 0;
    if (this.heightLayoutStrategy === LayoutStrategy.FIXED) {
      for (const layout of this.children()) {
        if (layout.getHeightLayoutStrategy() === LayoutStrategy.FIXED) {
          height = Math.max(layout.proposeHeight(), height);
        }
      }
    }
    return height;
  }

  internalOnlySetLayout(rect: Rect) {
    super.internalOnlySetLayout(rect);
    for (const layout of this.children()) {
      layout.internalOnlySetLayout(rect);
    }
  }
}
