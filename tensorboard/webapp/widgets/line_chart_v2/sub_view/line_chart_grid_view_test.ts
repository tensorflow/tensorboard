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

import {Component, DebugElement, Input} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';

import {createScale} from '../lib/scale';
import {Extent, ScaleType} from '../lib/public_types';
import {LineChartGridView} from './line_chart_grid_view';

@Component({
  selector: 'testable-comp',
  template: `
    <line-chart-grid-view
      [viewExtent]="viewBox"
      [xScale]="scale"
      [xGridCount]="10"
      [yScale]="scale"
      [yGridCount]="5"
      [domDim]="domDim"
    ></line-chart-grid-view>
  `,
})
class TestableComponent {
  scale = createScale(ScaleType.LINEAR);

  @Input()
  viewBox: Extent = {
    x: [100, 300],
    y: [-1, 1],
  };

  @Input()
  domDim = {
    width: 100,
    height: 200,
  };
}

describe('line_chart_v2/sub_view/grid test', () => {
  const ByCss = {
    GRID_LINE: By.css('line'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TestableComponent, LineChartGridView],
    }).compileComponents();
  });

  function assertLines(
    debugElements: DebugElement[],
    expectedLines: Array<{x1: number; y1: number; x2: number; y2: number}>
  ) {
    expect(debugElements.length).toBe(expectedLines.length);
    for (const [index, el] of debugElements.entries()) {
      expect({
        x1: el.attributes['x1'],
        y1: el.attributes['y1'],
        x2: el.attributes['x2'],
        y2: el.attributes['y2'],
      }).toEqual({
        x1: String(expectedLines[index].x1),
        y1: String(expectedLines[index].y1),
        x2: String(expectedLines[index].x2),
        y2: String(expectedLines[index].y2),
      });
    }
  }

  it('renders grid lines', () => {
    const fixture = TestBed.createComponent(TestableComponent);
    fixture.detectChanges();

    assertLines(fixture.debugElement.queryAll(ByCss.GRID_LINE), [
      {x1: 0, y1: 0, x2: 0, y2: 200},
      {x1: 50, y1: 0, x2: 50, y2: 200},
      {x1: 100, y1: 0, x2: 100, y2: 200},
      {x1: 0, y1: 200, x2: 100, y2: 200},
      {x1: 0, y1: 150, x2: 100, y2: 150},
      {x1: 0, y1: 100, x2: 100, y2: 100},
      {x1: 0, y1: 50, x2: 100, y2: 50},
      {x1: 0, y1: 0, x2: 100, y2: 0},
    ]);
  });

  it('updates grid lines on dom changes', () => {
    const fixture = TestBed.createComponent(TestableComponent);
    fixture.detectChanges();

    fixture.componentInstance.domDim = {width: 200, height: 1000};
    fixture.detectChanges();

    assertLines(fixture.debugElement.queryAll(ByCss.GRID_LINE), [
      {x1: 0, y1: 0, x2: 0, y2: 1000},
      {x1: 50, y1: 0, x2: 50, y2: 1000},
      {x1: 100, y1: 0, x2: 100, y2: 1000},
      {x1: 150, y1: 0, x2: 150, y2: 1000},
      {x1: 200, y1: 0, x2: 200, y2: 1000},
      {x1: 0, y1: 1000, x2: 200, y2: 1000},
      {x1: 0, y1: 750, x2: 200, y2: 750},
      {x1: 0, y1: 500, x2: 200, y2: 500},
      {x1: 0, y1: 250, x2: 200, y2: 250},
      {x1: 0, y1: 0, x2: 200, y2: 0},
    ]);
  });

  // We tweak the size guidance to approximately allows around 50 pixel gap between the
  // lines so the axis labels do not overlap.
  it('renders fewer grid lines when DOM is smaller and spaces them min. 50 pixel', () => {
    const fixture = TestBed.createComponent(TestableComponent);
    fixture.componentInstance.domDim = {width: 100, height: 50};
    fixture.detectChanges();

    assertLines(fixture.debugElement.queryAll(ByCss.GRID_LINE), [
      {x1: 0, y1: 0, x2: 0, y2: 50},
      {x1: 50, y1: 0, x2: 50, y2: 50},
      {x1: 100, y1: 0, x2: 100, y2: 50},
      {x1: 0, y1: 25, x2: 100, y2: 25},
    ]);
  });
});
