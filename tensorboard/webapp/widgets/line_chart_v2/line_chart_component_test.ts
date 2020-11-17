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

import {OverlayModule} from '@angular/cdk/overlay';
import {CommonModule} from '@angular/common';
import {Component, Input, NO_ERRORS_SCHEMA, ViewChild} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';

import {MainThreadChart} from './lib/chart';
import {
  DataSeries,
  DataSeriesMetadataMap,
  Extent,
  RendererType,
  ScaleType,
} from './lib/public_types';
import {buildMetadata, buildSeries} from './lib/testing';
import {LineChartComponent} from './line_chart_component';

@Component({
  selector: 'testable-comp',
  template: `
    <line-chart
      #chart
      [preferredRendererType]="preferredRendererType"
      [seriesData]="seriesData"
      [seriesMetadataMap]="seriesMetadataMap"
      [yScaleType]="yScaleType"
      [fixedViewBox]="fixedViewBox"
    ></line-chart>
  `,
  styles: [
    `
      line-chart {
        height: 100px;
        position: fixed;
        width: 200px;
      }
    `,
  ],
})
class TestableComponent {
  @ViewChild(LineChartComponent)
  chart!: LineChartComponent;

  @Input()
  seriesData!: DataSeries[];

  @Input()
  seriesMetadataMap!: DataSeriesMetadataMap;

  @Input()
  yScaleType!: ScaleType;

  @Input()
  fixedViewBox?: Extent;

  // WebGL one is harder to test.
  preferredRendererType = RendererType.SVG;

  triggerViewBoxChange(viewBox: Extent) {
    this.chart.onViewBoxChanged({dataExtent: viewBox});
  }
}

describe('line_chart_v2/line_chart test', () => {
  let resizeSpy: jasmine.Spy;
  let disposeSpy: jasmine.Spy;
  let setXScaleTypeSpy: jasmine.Spy;
  let setYScaleTypeSpy: jasmine.Spy;
  let updateMetadataSpy: jasmine.Spy;
  let updateDataSpy: jasmine.Spy;
  let updateViewBoxSpy: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TestableComponent, LineChartComponent],
      imports: [CommonModule, OverlayModule],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    resizeSpy = spyOn(MainThreadChart.prototype, 'resize');
    disposeSpy = spyOn(MainThreadChart.prototype, 'dispose');
    setXScaleTypeSpy = spyOn(MainThreadChart.prototype, 'setXScaleType');
    setYScaleTypeSpy = spyOn(MainThreadChart.prototype, 'setYScaleType');
    updateMetadataSpy = spyOn(MainThreadChart.prototype, 'setMetadata');
    updateDataSpy = spyOn(MainThreadChart.prototype, 'setData');
    updateViewBoxSpy = spyOn(MainThreadChart.prototype, 'setViewBox');
  });

  function createComponent(input: {
    seriesData: DataSeries[];
    seriesMetadataMap: DataSeriesMetadataMap;
    yScaleType: ScaleType;
    fixedViewBox?: Extent;
  }): ComponentFixture<TestableComponent> {
    const fixture = TestBed.createComponent(TestableComponent);
    fixture.componentInstance.seriesData = input.seriesData;
    fixture.componentInstance.seriesMetadataMap = input.seriesMetadataMap;
    fixture.componentInstance.yScaleType = input.yScaleType;

    if (input.fixedViewBox) {
      fixture.componentInstance.fixedViewBox = input.fixedViewBox;
    }

    return fixture;
  }

  it('sets axis, data, metadata, viewBox, and resize when created', () => {
    const fixture = createComponent({
      seriesData: [
        buildSeries({
          id: 'foo',
          points: [
            {x: 0, y: 0},
            {x: 1, y: -1},
            {x: 2, y: 1},
          ],
        }),
      ],
      seriesMetadataMap: {foo: buildMetadata({id: 'foo', visible: true})},
      yScaleType: ScaleType.LINEAR,
    });
    fixture.detectChanges();

    expect(disposeSpy).toHaveBeenCalledTimes(0);
    // line chart DOM dimensions are measured as the component is created.
    expect(resizeSpy).toHaveBeenCalledTimes(1);

    expect(setXScaleTypeSpy).toHaveBeenCalledTimes(1);
    expect(setXScaleTypeSpy).toHaveBeenCalledWith(ScaleType.LINEAR);

    expect(setYScaleTypeSpy).toHaveBeenCalledTimes(1);
    expect(setYScaleTypeSpy).toHaveBeenCalledWith(ScaleType.LINEAR);

    expect(updateMetadataSpy).toHaveBeenCalledTimes(1);
    expect(updateMetadataSpy).toHaveBeenCalledWith({
      foo: buildMetadata({id: 'foo', visible: true}),
    });

    expect(updateDataSpy).toHaveBeenCalledTimes(1);
    expect(updateDataSpy).toHaveBeenCalledWith([
      buildSeries({
        id: 'foo',
        points: [
          {x: 0, y: 0},
          {x: 1, y: -1},
          {x: 2, y: 1},
        ],
      }),
    ]);

    expect(updateViewBoxSpy).toHaveBeenCalledTimes(1);
    expect(updateViewBoxSpy).toHaveBeenCalledWith({
      x: [-0.2, 2.2],
      y: [-1.2, 1.2],
    });
  });

  it('uses the fixedViewBox when configured', () => {
    const fixture = createComponent({
      seriesData: [
        buildSeries({
          id: 'foo',
          points: [
            {x: 0, y: 0},
            {x: 1, y: -1},
            {x: 2, y: 1},
          ],
        }),
      ],
      seriesMetadataMap: {foo: buildMetadata({id: 'foo', visible: true})},
      yScaleType: ScaleType.LINEAR,
      fixedViewBox: {
        x: [-100, 100],
        y: [0, 1],
      },
    });
    fixture.detectChanges();

    expect(updateViewBoxSpy).toHaveBeenCalledTimes(1);
    expect(updateViewBoxSpy).toHaveBeenCalledWith({
      x: [-100, 100],
      y: [0, 1],
    });
  });

  it('updates only scaleType when updating scaleType', () => {
    const fixture = createComponent({
      seriesData: [
        buildSeries({
          id: 'foo',
          points: [
            {x: 0, y: 0},
            {x: 1, y: -1},
            {x: 2, y: 1},
          ],
        }),
      ],
      seriesMetadataMap: {foo: buildMetadata({id: 'foo', visible: true})},
      yScaleType: ScaleType.LINEAR,
    });
    fixture.detectChanges();

    fixture.componentInstance.yScaleType = ScaleType.LOG10;
    fixture.detectChanges();

    expect(setXScaleTypeSpy).toHaveBeenCalledTimes(2);
    expect(setYScaleTypeSpy).toHaveBeenCalledTimes(2);
    // `niceDomain` logic can change depending on the scale change.
    expect(updateViewBoxSpy).toHaveBeenCalledTimes(2);

    expect(disposeSpy).toHaveBeenCalledTimes(0);
    expect(resizeSpy).toHaveBeenCalledTimes(1);
    expect(updateMetadataSpy).toHaveBeenCalledTimes(1);
    expect(updateDataSpy).toHaveBeenCalledTimes(1);
  });

  describe('data change', () => {
    it('updates data and viewBox when data changes', () => {
      const fixture = createComponent({
        seriesData: [
          buildSeries({
            id: 'foo',
            points: [
              {x: 0, y: 0},
              {x: 1, y: -1},
              {x: 2, y: 1},
            ],
          }),
        ],
        seriesMetadataMap: {foo: buildMetadata({id: 'foo', visible: true})},
        yScaleType: ScaleType.LINEAR,
      });
      fixture.detectChanges();

      fixture.componentInstance.seriesData = [
        buildSeries({
          id: 'foo',
          points: [
            {x: 0, y: 0},
            {x: 1, y: -1},
            {x: 2, y: 1},
            {x: 3, y: 0},
            {x: 4, y: 2},
          ],
        }),
      ];
      fixture.detectChanges();

      expect(disposeSpy).toHaveBeenCalledTimes(0);
      expect(setXScaleTypeSpy).toHaveBeenCalledTimes(1);
      expect(setYScaleTypeSpy).toHaveBeenCalledTimes(1);
      expect(resizeSpy).toHaveBeenCalledTimes(1);
      expect(updateMetadataSpy).toHaveBeenCalledTimes(1);

      expect(updateDataSpy).toHaveBeenCalledTimes(2);
      // when data changes, we want to recompute the domain and fit it.
      expect(updateViewBoxSpy).toHaveBeenCalledTimes(2);
    });

    it('does not change the viewBox when it was modified manually', () => {
      const fixture = createComponent({
        seriesData: [
          buildSeries({
            id: 'foo',
            points: [
              {x: 0, y: 0},
              {x: 1, y: -1},
              {x: 2, y: 1},
            ],
          }),
        ],
        seriesMetadataMap: {foo: buildMetadata({id: 'foo', visible: true})},
        yScaleType: ScaleType.LINEAR,
      });
      fixture.detectChanges();

      fixture.componentInstance.triggerViewBoxChange({
        x: [-5, 5],
        y: [0, 10],
      });
      expect(updateViewBoxSpy).toHaveBeenCalledTimes(2);

      fixture.componentInstance.seriesData = [
        buildSeries({
          id: 'foo',
          points: [
            {x: 0, y: 0},
            {x: 1, y: -1},
            {x: 2, y: 1},
            {x: 3, y: 0},
            {x: 4, y: 2},
          ],
        }),
      ];
      fixture.detectChanges();

      expect(updateViewBoxSpy).toHaveBeenCalledTimes(2);
    });
  });

  it('sets [0, 1] viewBox when seriesData is empty', () => {
    const fixture = createComponent({
      seriesData: [],
      seriesMetadataMap: {},
      yScaleType: ScaleType.LINEAR,
    });
    fixture.detectChanges();

    expect(updateViewBoxSpy).toHaveBeenCalledTimes(1);
    expect(updateViewBoxSpy).toHaveBeenCalledWith({
      x: [-0.1, 1.1],
      y: [-0.1, 1.1],
    });
  });
});
