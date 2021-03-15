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
import {By} from '@angular/platform-browser';

import {ChartImpl} from './lib/chart';
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
  selector: 'line-chart-grid-view',
  template: ``,
})
class FakeGridComponent {
  @Input()
  viewExtent!: Extent;

  @Input()
  domDim!: {width: number; height: number};
}

@Component({
  selector: 'testable-comp',
  template: `
    <line-chart
      #chart
      [disableUpdate]="disableUpdate"
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

  @Input()
  disableUpdate?: boolean;

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
      declarations: [TestableComponent, LineChartComponent, FakeGridComponent],
      imports: [CommonModule, OverlayModule],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    resizeSpy = spyOn(ChartImpl.prototype, 'resize');
    disposeSpy = spyOn(ChartImpl.prototype, 'dispose');
    setXScaleTypeSpy = spyOn(ChartImpl.prototype, 'setXScaleType');
    setYScaleTypeSpy = spyOn(ChartImpl.prototype, 'setYScaleType');
    updateMetadataSpy = spyOn(ChartImpl.prototype, 'setMetadata');
    updateDataSpy = spyOn(ChartImpl.prototype, 'setData');
    updateViewBoxSpy = spyOn(ChartImpl.prototype, 'setViewBox');
  });

  function createComponent(input: {
    seriesData: DataSeries[];
    seriesMetadataMap: DataSeriesMetadataMap;
    yScaleType: ScaleType;
    fixedViewBox?: Extent;
    disableUpdate?: boolean;
  }): ComponentFixture<TestableComponent> {
    const fixture = TestBed.createComponent(TestableComponent);
    fixture.componentInstance.seriesData = input.seriesData;
    fixture.componentInstance.seriesMetadataMap = input.seriesMetadataMap;
    fixture.componentInstance.yScaleType = input.yScaleType;

    if (input.fixedViewBox) {
      fixture.componentInstance.fixedViewBox = input.fixedViewBox;
    }

    if (input.disableUpdate !== undefined) {
      fixture.componentInstance.disableUpdate = input.disableUpdate;
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

  it('resets viewBox to default when scaleType changes', () => {
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
    expect(updateViewBoxSpy).toHaveBeenCalledTimes(1);
    expect(updateViewBoxSpy.calls.argsFor(0)).toEqual([
      {x: [-0.2, 2.2], y: [-1.2, 1.2]},
    ]);

    fixture.componentInstance.triggerViewBoxChange({
      x: [-5, 5],
      y: [0, 10],
    });
    expect(updateViewBoxSpy).toHaveBeenCalledTimes(2);

    fixture.componentInstance.yScaleType = ScaleType.TIME;
    fixture.detectChanges();

    expect(updateViewBoxSpy).toHaveBeenCalledTimes(3);
    expect(updateViewBoxSpy.calls.argsFor(2)).toEqual([
      {x: [-0.2, 2.2], y: [-1, 1]},
    ]);

    // and viewBox updates when the data changes to fit the data.
    fixture.componentInstance.seriesData = [
      buildSeries({
        id: 'foo',
        points: [
          {x: 0, y: 0},
          {x: 1, y: -2},
          {x: 2, y: 1},
          {x: 3, y: 0},
          {x: 4, y: 2},
        ],
      }),
    ];
    fixture.detectChanges();
    expect(updateViewBoxSpy).toHaveBeenCalledTimes(4);
    expect(updateViewBoxSpy.calls.argsFor(3)).toEqual([
      {x: [-0.5, 4.5], y: [-2, 2]},
    ]);
  });

  it('sets correct domDim and viewBox on initial render', () => {
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

    const grid = fixture.debugElement.query(By.directive(FakeGridComponent));
    // In testable-comp, we hard coded dimension of 200x150. Since we use about
    // 50px and 30px for y-axis and x-axis, respectively, we have 150x70 here.
    expect(grid.componentInstance.domDim).toEqual({
      width: 150,
      height: 70,
    });
    expect(grid.componentInstance.viewExtent).toEqual({
      x: [-0.2, 2.2],
      y: [-1.2, 1.2],
    });
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

    it('updates viewBox when metadata map updates', () => {
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
      expect(updateViewBoxSpy).toHaveBeenCalledTimes(1);

      fixture.componentInstance.seriesMetadataMap = {};
      fixture.detectChanges();

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

  describe('disableUpdate=true', () => {
    it('disables any update', () => {
      const fixture = createComponent({
        disableUpdate: true,
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
      expect(updateViewBoxSpy).toHaveBeenCalledTimes(0);

      fixture.componentInstance.seriesMetadataMap = {};
      fixture.detectChanges();

      expect(updateViewBoxSpy).toHaveBeenCalledTimes(0);
    });

    it('sets update when disableUpdate changes to false', () => {
      const fixture = createComponent({
        disableUpdate: true,
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
      expect(updateViewBoxSpy).toHaveBeenCalledTimes(0);
      expect(updateMetadataSpy).toHaveBeenCalledTimes(0);
      expect(updateDataSpy).toHaveBeenCalledTimes(0);

      fixture.componentInstance.disableUpdate = false;
      fixture.detectChanges();

      expect(updateViewBoxSpy).toHaveBeenCalledTimes(1);
      expect(updateMetadataSpy).toHaveBeenCalledTimes(1);
      expect(updateDataSpy).toHaveBeenCalledTimes(1);
    });

    it('queues up viewBox changes and updates default viewBox when update is enabled', () => {
      const fixture = createComponent({
        disableUpdate: false,
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
      expect(updateViewBoxSpy).toHaveBeenCalledTimes(1);
      expect(updateViewBoxSpy.calls.argsFor(0)).toEqual([
        {
          x: [-0.2, 2.2],
          y: [-1.2, 1.2],
        },
      ]);

      fixture.componentInstance.disableUpdate = true;
      fixture.detectChanges();

      fixture.componentInstance.seriesData = [
        buildSeries({
          id: 'foo',
          points: [
            {x: 0, y: 0},
            {x: 1, y: -1},
            {x: 2, y: 1},
            {x: 3, y: 1},
          ],
        }),
      ];
      fixture.detectChanges();

      fixture.componentInstance.seriesMetadataMap = {
        foo: buildMetadata({id: 'foo', visible: false}),
      };
      fixture.detectChanges();

      fixture.componentInstance.disableUpdate = false;
      fixture.detectChanges();

      expect(updateViewBoxSpy).toHaveBeenCalledTimes(2);
      // No runs are current visible so we set the default view extent.
      expect(updateViewBoxSpy.calls.argsFor(1)).toEqual([
        {
          x: [-0.1, 1.1],
          y: [-0.1, 1.1],
        },
      ]);
    });
  });

  describe('#getIsViewBoxOverridden', () => {
    it('returns its internal state', () => {
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

      expect(fixture.componentInstance.chart.getIsViewBoxOverridden()).toBe(
        false
      );

      fixture.componentInstance.triggerViewBoxChange({
        x: [-5, 5],
        y: [0, 10],
      });

      expect(fixture.componentInstance.chart.getIsViewBoxOverridden()).toBe(
        true
      );
    });
  });
});
