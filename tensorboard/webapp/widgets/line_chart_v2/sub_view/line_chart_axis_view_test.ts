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

import {CommonModule} from '@angular/common';
import {Component, DebugElement, Input} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';

import {createScale} from '../lib/scale';
import {Extent, ScaleType} from '../lib/public_types';
import {LineChartAxisComponent} from './line_chart_axis_view';

@Component({
  selector: 'testable-comp',
  template: `
    <line-chart-axis
      class="x"
      axis="x"
      [axisExtent]="viewBox.x"
      [scale]="scale"
      [gridCount]="10"
      [domDim]="domDim"
    ></line-chart-axis>
    <line-chart-axis
      class="y"
      axis="y"
      [axisExtent]="viewBox.y"
      [scale]="scale"
      [gridCount]="5"
      [domDim]="domDim"
    ></line-chart-axis>
  `,
})
class TestableComponent {
  scale = createScale(ScaleType.LINEAR);

  @Input()
  viewBox: Extent = {
    x: [100, 300],
    y: [-1, 1],
  };

  domDim = {
    width: 100,
    height: 200,
  };
}

describe('line_chart_v2/sub_view/axis test', () => {
  const ByCss = {
    X_AXIS_LABEL: By.css('line-chart-axis.x text'),
    Y_AXIS_LABEL: By.css('line-chart-axis.y text'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TestableComponent, LineChartAxisComponent],
      imports: [CommonModule],
    }).compileComponents();
  });

  function assertLabels(debugElements: DebugElement[], axisLabels: string[]) {
    const actualLabels = debugElements.map((el) =>
      el.nativeElement.textContent.trim()
    );
    expect(actualLabels).toEqual(axisLabels);
  }

  function assertLabelLoc(
    debugElements: DebugElement[],
    expectedLocs: Array<{x: number; y: number}>
  ) {
    const expected = expectedLocs.map((loc) => ({
      x: String(loc.x),
      y: String(loc.y),
    }));
    const actuals = debugElements.map((el) => ({
      x: String(el.attributes['x']),
      y: String(el.attributes['y']),
    }));

    expect(expected).toEqual(actuals);
  }

  it('renders tick in human readable format', () => {
    const fixture = TestBed.createComponent(TestableComponent);
    fixture.detectChanges();

    assertLabels(fixture.debugElement.queryAll(ByCss.X_AXIS_LABEL), [
      '100',
      '200',
      '300',
    ]);

    assertLabels(fixture.debugElement.queryAll(ByCss.Y_AXIS_LABEL), [
      '-1',
      '-0.5',
      '0',
      '0.5',
      '1',
    ]);
  });

  it('updates to viewBox changes', () => {
    const fixture = TestBed.createComponent(TestableComponent);
    fixture.detectChanges();

    fixture.componentInstance.viewBox = {x: [1e6, 5e6], y: [0, 1]};
    fixture.detectChanges();

    assertLabels(fixture.debugElement.queryAll(ByCss.X_AXIS_LABEL), [
      '2e+6',
      '4e+6',
    ]);

    assertLabels(fixture.debugElement.queryAll(ByCss.Y_AXIS_LABEL), [
      '0',
      '0.2',
      '0.4',
      '0.6',
      '0.8',
      '1',
    ]);
  });

  it('aligns y axis to the right edge of its dom', () => {
    const fixture = TestBed.createComponent(TestableComponent);
    fixture.detectChanges();

    assertLabelLoc(fixture.debugElement.queryAll(ByCss.Y_AXIS_LABEL), [
      // -1 is at the bottom of the DOM
      {x: 95, y: 200},
      {x: 95, y: 150},
      {x: 95, y: 100},
      {x: 95, y: 50},
      // 1 is at the top.
      {x: 95, y: 0},
    ]);
  });

  it('aligns x axis to the top edge of its dom', () => {
    const fixture = TestBed.createComponent(TestableComponent);
    fixture.detectChanges();

    assertLabelLoc(fixture.debugElement.queryAll(ByCss.X_AXIS_LABEL), [
      {x: 0, y: 5},
      {x: 50, y: 5},
      {x: 100, y: 5},
    ]);
  });
});
