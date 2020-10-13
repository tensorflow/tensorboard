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

import {CompositeLayout} from './composite_layout';
import {FlexLayout} from './flex_layout';
import {RectLayout, LayoutOption, LayoutStrategy} from './layout';
import {Rect} from './types';

class FixedWidthHeightLayout extends RectLayout {
  constructor(config: LayoutOption, contentGrid: RectLayout[][] = []) {
    super(
      {
        ...config,
        widthLayoutStrategy: LayoutStrategy.FIXED,
        heightLayoutStrategy: LayoutStrategy.FIXED,
      },
      contentGrid
    );
  }

  proposeWidth() {
    return 50;
  }

  proposeHeight() {
    return 100;
  }
}

class HundredWidthLayout extends RectLayout {
  constructor(config: LayoutOption, contentGrid: RectLayout[][] = []) {
    super(
      {
        ...config,
        widthLayoutStrategy: LayoutStrategy.FIXED,
        heightLayoutStrategy: LayoutStrategy.MATCH_PARENT,
      },
      contentGrid
    );
  }

  proposeWidth() {
    return 100;
  }
}

const option = {container: document.body};

describe('line_chart_v2/lib/layout test', () => {
  function assertLayout(rootLayout: RectLayout, expected: Rect[][]) {
    const contentGrid = rootLayout.getContentGrid();

    expect(contentGrid.length).toBe(expected.length);
    for (const [rowIndex, row] of contentGrid.entries()) {
      expect(row.length).toBe(expected[rowIndex].length);
      for (const [colIndex, layout] of row.entries()) {
        expect(layout.getLayoutRect()).toEqual(expected[rowIndex][colIndex]);
      }
    }
  }

  function setLayoutAndRelayout(rootLayout: RectLayout, rect: Rect) {
    rootLayout.internalOnlySetLayout(rect);
    rootLayout.relayout();
  }

  describe('validation', () => {
    it('throw when layout is not rectangular', () => {
      expect(() => {
        new FlexLayout(option, [
          [new FlexLayout(option), new FlexLayout(option)],
          [new FlexLayout(option)],
        ]);
      }).toThrowError(RangeError);
    });
  });

  it('lays out based on childrens', () => {
    const rootLayout = new FlexLayout(option, [
      [new FixedWidthHeightLayout(option), new FlexLayout(option)],
      [new FlexLayout(option), new FlexLayout(option)],
    ]);

    setLayoutAndRelayout(rootLayout, {x: 0, width: 200, y: 0, height: 300});

    expect(rootLayout.getLayoutRect()).toEqual({
      x: 0,
      width: 200,
      y: 0,
      height: 300,
    });
    assertLayout(rootLayout, [
      [
        {x: 0, width: 50, y: 0, height: 100},
        {x: 50, width: 150, y: 0, height: 100},
      ],
      [
        {x: 0, width: 50, y: 100, height: 200},
        {x: 50, width: 150, y: 100, height: 200},
      ],
    ]);
  });

  it('assigns equal width to flexs', () => {
    const rootLayout = new FlexLayout(option, [
      [new FlexLayout(option), new FlexLayout(option)],
      [new FlexLayout(option), new FlexLayout(option)],
    ]);

    setLayoutAndRelayout(rootLayout, {x: 0, width: 200, y: 0, height: 300});

    assertLayout(rootLayout, [
      [
        {x: 0, width: 100, y: 0, height: 150},
        {x: 100, width: 100, y: 0, height: 150},
      ],
      [
        {x: 0, width: 100, y: 150, height: 150},
        {x: 100, width: 100, y: 150, height: 150},
      ],
    ]);
  });

  it('assigns layout larger than bounding rect if fixed width are larger', () => {
    const rootLayout = new FlexLayout(option, [
      [
        new FixedWidthHeightLayout(option),
        new HundredWidthLayout(option, []),
        new FlexLayout(option),
      ],
    ]);

    setLayoutAndRelayout(rootLayout, {x: 0, width: 100, y: 0, height: 100});

    assertLayout(rootLayout, [
      [
        {x: 0, width: 50, y: 0, height: 100},
        {x: 50, width: 100, y: 0, height: 100},
        {x: 150, width: 0, y: 0, height: 100},
      ],
    ]);
  });

  it('does not fill remaining space if layouts are fixed', () => {
    const rootLayout = new FlexLayout(option, [
      [new FixedWidthHeightLayout(option), new FlexLayout(option)],
      [new FlexLayout(option), new HundredWidthLayout(option, [])],
    ]);

    setLayoutAndRelayout(rootLayout, {x: 0, width: 200, y: 0, height: 300});

    assertLayout(rootLayout, [
      [
        {x: 0, width: 50, y: 0, height: 100},
        {x: 50, width: 100, y: 0, height: 100},
      ],
      [
        {x: 0, width: 50, y: 100, height: 200},
        {x: 50, width: 100, y: 100, height: 200},
      ],
    ]);
  });

  describe('composite layout', () => {
    it('allows multiple layouts to be superposed', () => {
      const rootLayout = new FlexLayout(option, [
        [
          new CompositeLayout(option, [
            new FlexLayout(option),
            new FlexLayout(option),
          ]),
          new FlexLayout(option),
        ],
        [new FlexLayout(option), new HundredWidthLayout(option, [])],
      ]);

      setLayoutAndRelayout(rootLayout, {x: 0, width: 200, y: 0, height: 300});

      assertLayout(rootLayout, [
        [
          {x: 0, width: 100, y: 0, height: 150},
          {x: 100, width: 100, y: 0, height: 150},
        ],
        [
          {x: 0, width: 100, y: 150, height: 150},
          {x: 100, width: 100, y: 150, height: 150},
        ],
      ]);

      const compositeLayout = rootLayout.getContentGrid()[0][0];
      assertLayout(compositeLayout, [
        [
          {x: 0, width: 100, y: 0, height: 150},
          {x: 0, width: 100, y: 0, height: 150},
        ],
      ]);
    });

    it('takes largest dimension in composite layout', () => {
      const rootLayout = new FlexLayout(option, [
        [
          new CompositeLayout(option, [
            new HundredWidthLayout(option),
            new FixedWidthHeightLayout(option),
          ]),
          new FlexLayout(option),
        ],
        [new FlexLayout(option), new HundredWidthLayout(option, [])],
      ]);

      setLayoutAndRelayout(rootLayout, {x: 0, width: 200, y: 0, height: 300});

      assertLayout(rootLayout, [
        [
          {x: 0, width: 100, y: 0, height: 100},
          {x: 100, width: 100, y: 0, height: 100},
        ],
        [
          {x: 0, width: 100, y: 100, height: 200},
          {x: 100, width: 100, y: 100, height: 200},
        ],
      ]);

      const compositeLayout = rootLayout.getContentGrid()[0][0];
      assertLayout(compositeLayout, [
        [
          {x: 0, width: 100, y: 0, height: 100},
          {x: 0, width: 100, y: 0, height: 100},
        ],
      ]);
    });
  });
});
