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
import {Component, Input} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';

import {RunColorScale} from '../../types/ui';

import {LineChartComponent} from './line_chart_component';
import {SeriesData, TooltipColumnSpec} from './line_chart_types';
import {
  AxisRange,
  TooltipPosition,
  TooltipSortingMethod,
  VzLineChart2,
  XAxisType,
  YAxisType,
} from './polymer_interop_types';

// Wrapper component required to properly trigger Angular lifecycles.
// Without it, ngOnChanges do not get triggered before ngOnInit.
@Component({
  selector: 'testable-line-chart',
  template: `
    <tb-line-chart
      [colorScale]="colorScale"
      [defaultXRange]="defaultXRange"
      [defaultYRange]="defaultYRange"
      [ignoreYOutliers]="ignoreYOutliers"
      [smoothingEnabled]="smoothingEnabled"
      [smoothingWeight]="smoothingWeight"
      [tooltipColumns]="tooltipColumns"
      [tooltipPosition]="tooltipPosition"
      [tooltipSortingMethod]="tooltipSortingMethod"
      [seriesDataList]="seriesDataList"
      [xAxisType]="xAxisType"
      [yAxisType]="yAxisType"
    >
    </tb-line-chart>
  `,
})
class TestableComponent {
  @Input() colorScale?: RunColorScale;
  @Input() defaultXRange?: AxisRange;
  @Input() defaultYRange?: AxisRange;
  @Input() ignoreYOutliers?: boolean;
  @Input() smoothingEnabled?: boolean;
  @Input() smoothingWeight?: number;
  @Input() tooltipColumns: Array<TooltipColumnSpec<{}, {}>> = [];
  @Input() tooltipPosition?: TooltipPosition;
  @Input() tooltipSortingMethod?: TooltipSortingMethod;
  @Input() seriesDataList: Array<SeriesData<{}, {}>> = [];
  @Input() xAxisType?: XAxisType;
  @Input() yAxisType?: YAxisType;
}

describe('LineChart', () => {
  let vzLineChartEl: VzLineChart2<{}, {}>;
  let methodSpies = {} as {[method: string]: jasmine.Spy};

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule],
      declarations: [LineChartComponent, TestableComponent],
    }).compileComponents();

    // Create a random HTMLElement instead then manually override the
    // properties.
    vzLineChartEl = document.createElement(
      'testable-vz-line-chart'
    ) as VzLineChart2<{}, {}>;
    const methods = [
      'commitChanges',
      'isDataFitToDomain',
      'redraw',
      'resetDomain',
      'setSeriesData',
      'setSeriesMetadata',
      'setVisibleSeries',
      'yValueAccessor',
    ];
    for (const method of methods) {
      methodSpies[method] = (vzLineChartEl as any)[
        method
      ] = jasmine.createSpy();
    }
    (methodSpies['getExporter'] = vzLineChartEl[
      'getExporter'
    ] = jasmine.createSpy().and.callFake(() => {
      return {
        exportAsString: jasmine.createSpy(),
      };
    })),
      spyOn(document, 'createElement')
        .and.callThrough()
        .withArgs('vz-line-chart2')
        .and.returnValue((vzLineChartEl as unknown) as VzLineChart2<{}, {}>);
  });

  it('renders vz-line-chart', () => {
    const fakeSeriesDataList = [
      {
        seriesId: 'series1',
        metadata: {},
        points: [{x: 1610612159, y: 20, flavor: 'spicy'}],
        visible: true,
      },
    ];

    const fixture = TestBed.createComponent(TestableComponent);

    fixture.componentInstance.colorScale = () => '#fff';
    fixture.componentInstance.defaultXRange = [0, 1];
    fixture.componentInstance.defaultYRange = [2, 3];
    fixture.componentInstance.ignoreYOutliers = true;
    fixture.componentInstance.smoothingEnabled = true;
    fixture.componentInstance.smoothingWeight = 1;
    fixture.componentInstance.tooltipColumns = [
      {
        title: 'column1',
        evaluate: () => 'tooltipValue',
      },
    ];
    fixture.componentInstance.tooltipPosition = TooltipPosition.RIGHT;
    fixture.componentInstance.tooltipSortingMethod =
      TooltipSortingMethod.ASCENDING;
    fixture.componentInstance.seriesDataList = fakeSeriesDataList;
    fixture.componentInstance.xAxisType = XAxisType.WALL_TIME;
    fixture.componentInstance.yAxisType = YAxisType.LOG;

    const setSeriesDataCallArgs: any[] = [];
    methodSpies['setSeriesData'].and.callFake((...args: any[]) => {
      setSeriesDataCallArgs.push(args);
    });

    fixture.detectChanges();

    const fakeEvaluationPoint = {
      dataset: {
        data: () => [],
        metadata: () => ({meta: {}}),
      },
      datum: {},
    };
    expect(vzLineChartEl.colorScale.scale('run1')).toBe('#fff');
    expect(vzLineChartEl.defaultXRange).toEqual([0, 1]);
    expect(vzLineChartEl.defaultYRange).toEqual([2, 3]);
    expect(vzLineChartEl.ignoreYOutliers).toBe(true);
    expect(vzLineChartEl.smoothingEnabled).toBe(true);
    expect(vzLineChartEl.smoothingWeight).toBe(1);
    expect(vzLineChartEl.tooltipColumns[0].title).toBe('column1');
    expect(vzLineChartEl.tooltipColumns[0].evaluate(fakeEvaluationPoint)).toBe(
      'tooltipValue'
    );
    expect(vzLineChartEl.tooltipPosition).toBe(TooltipPosition.RIGHT);
    expect(vzLineChartEl.tooltipSortingMethod).toEqual(
      TooltipSortingMethod.ASCENDING
    );
    expect(setSeriesDataCallArgs).toEqual([
      [
        'series1',
        [
          {
            x: 1610612159,
            wall_time: new Date(1610612159 * 1000),
            y: 20,
            flavor: 'spicy',
          },
        ],
      ],
    ]);
    expect(vzLineChartEl.setSeriesMetadata).toHaveBeenCalledWith('series1', {});
    expect(vzLineChartEl.setVisibleSeries).toHaveBeenCalledWith(['series1']);
    expect(vzLineChartEl.commitChanges).toHaveBeenCalled();
    expect(vzLineChartEl.xType).toBe(XAxisType.WALL_TIME);
    expect(vzLineChartEl.yScaleType).toBe(YAxisType.LOG);
    expect(vzLineChartEl.yValueAccessor(fakeSeriesDataList[0].points[0])).toBe(
      20
    );
    expect(vzLineChartEl.redraw).toHaveBeenCalled();
  });

  it('sets inputs with default values to the vz-line-chart2', () => {
    TestBed.createComponent(TestableComponent);

    expect(vzLineChartEl.ignoreYOutliers).toBe(false);
    expect(vzLineChartEl.smoothingEnabled).toBe(false);
    expect(vzLineChartEl.smoothingWeight).toBe(0.6);
    expect(vzLineChartEl.xType).toBe(XAxisType.STEP);
    expect(vzLineChartEl.yScaleType).toBe(YAxisType.LINEAR);
  });

  it('updates series data depending on xAxisType', () => {
    let setSeriesDataCallArgs: any[] = [];
    methodSpies['setSeriesData'].and.callFake((...args: any[]) => {
      setSeriesDataCallArgs.push(args);
    });

    const fakePoints1 = [{x: 1610613017, y: 20, flavor: 'spicy'}];
    const fakePoints2 = [{x: 1610613025, y: 40, flavor: 'bitter'}];
    const fakeSeriesDataList1 = [
      {
        seriesId: 'series1',
        metadata: {},
        points: fakePoints1,
        visible: true,
      },
    ];
    const fakeSeriesDataList2 = [
      {
        seriesId: 'series2',
        metadata: {},
        points: fakePoints2,
        visible: true,
      },
    ];
    const fixture = TestBed.createComponent(TestableComponent);

    fixture.componentInstance.seriesDataList = fakeSeriesDataList1;
    fixture.componentInstance.xAxisType = XAxisType.WALL_TIME;
    fixture.detectChanges();

    fixture.componentInstance.xAxisType = XAxisType.RELATIVE;
    fixture.detectChanges();

    expect(setSeriesDataCallArgs).toEqual([
      [
        'series1',
        [
          {
            x: 1610613017,
            wall_time: new Date(1610613017 * 1000),
            y: 20,
            flavor: 'spicy',
          },
        ],
      ],
    ]);

    fixture.componentInstance.xAxisType = XAxisType.STEP;
    fixture.detectChanges();

    expect(setSeriesDataCallArgs).toEqual([
      setSeriesDataCallArgs[0],
      ['series1', [{x: 1610613017, step: 1610613017, y: 20, flavor: 'spicy'}]],
    ]);

    fixture.componentInstance.seriesDataList = fakeSeriesDataList2;
    fixture.detectChanges();

    expect(setSeriesDataCallArgs).toEqual([
      setSeriesDataCallArgs[0],
      setSeriesDataCallArgs[1],
      ['series2', [{x: 1610613025, step: 1610613025, y: 40, flavor: 'bitter'}]],
    ]);
  });

  it('calls setVisibleSeries only on visible series', () => {
    const fakeSeriesDataList = [
      {
        seriesId: 'series1',
        metadata: {},
        points: [],
        visible: false,
      },
      {
        seriesId: 'series2',
        metadata: {},
        points: [],
        visible: true,
      },
      {
        seriesId: 'series3',
        metadata: {},
        points: [],
        visible: false,
      },
    ];
    const fixture = TestBed.createComponent(TestableComponent);

    fixture.componentInstance.seriesDataList = fakeSeriesDataList;
    fixture.detectChanges();

    expect(methodSpies['setVisibleSeries']).toHaveBeenCalledWith(['series2']);
  });

  it('resets domain on chart when `resetDomain` is called', () => {
    const fixture = TestBed.createComponent(TestableComponent);
    const lineChart = fixture.debugElement.query(By.css('tb-line-chart'));
    lineChart.componentInstance.resetDomain();

    expect(methodSpies['resetDomain']).toHaveBeenCalled();
  });

  it('resets domain on updates, if already fit', () => {
    const fixture = TestBed.createComponent(TestableComponent);
    fixture.componentInstance.seriesDataList = [];
    fixture.detectChanges();
    methodSpies['isDataFitToDomain'].calls.reset();
    methodSpies['isDataFitToDomain'].and.returnValue(true);

    fixture.componentInstance.seriesDataList = [
      {
        seriesId: 'series1',
        metadata: {},
        points: [{x: 0, y: 2}],
        visible: true,
      },
    ];
    fixture.detectChanges();

    expect(methodSpies['resetDomain']).toHaveBeenCalled();
  });

  it('does not reset domain on updates, if not already fit', () => {
    const fixture = TestBed.createComponent(TestableComponent);
    fixture.componentInstance.seriesDataList = [];
    fixture.detectChanges();
    methodSpies['isDataFitToDomain'].calls.reset();
    methodSpies['isDataFitToDomain'].and.returnValue(false);

    fixture.componentInstance.seriesDataList = [
      {
        seriesId: 'series1',
        metadata: {},
        points: [{x: 0, y: 2}],
        visible: true,
      },
    ];
    fixture.detectChanges();

    expect(methodSpies['resetDomain']).not.toHaveBeenCalled();
  });

  it(
    'resets domain on smoothing updates, if smoothing enabled and data ' +
      'fits',
    () => {
      const fixture = TestBed.createComponent(TestableComponent);
      fixture.componentInstance.smoothingWeight = 0.5;
      fixture.componentInstance.smoothingEnabled = false;
      fixture.detectChanges();
      methodSpies['isDataFitToDomain'].calls.reset();
      methodSpies['isDataFitToDomain'].and.returnValue(true);

      fixture.componentInstance.smoothingWeight = 0.6;
      fixture.detectChanges();

      expect(methodSpies['resetDomain']).not.toHaveBeenCalled();

      fixture.componentInstance.smoothingEnabled = true;
      fixture.componentInstance.smoothingWeight = 0.7;
      fixture.detectChanges();

      expect(methodSpies['resetDomain']).toHaveBeenCalled();
    }
  );

  it('does not reset domain on smoothing updates, if not already fit', () => {
    const fixture = TestBed.createComponent(TestableComponent);
    fixture.componentInstance.smoothingWeight = 0.5;
    fixture.detectChanges();
    methodSpies['isDataFitToDomain'].calls.reset();
    methodSpies['isDataFitToDomain'].and.returnValue(false);

    fixture.componentInstance.smoothingWeight = 0.9;
    fixture.detectChanges();

    expect(methodSpies['resetDomain']).not.toHaveBeenCalled();
  });

  it('resets domain on smoothing enabled, if already fit', () => {
    const fixture = TestBed.createComponent(TestableComponent);
    fixture.componentInstance.smoothingEnabled = true;
    fixture.detectChanges();
    methodSpies['isDataFitToDomain'].calls.reset();
    methodSpies['isDataFitToDomain'].and.returnValue(true);

    fixture.componentInstance.smoothingEnabled = false;
    fixture.detectChanges();

    expect(methodSpies['resetDomain']).toHaveBeenCalled();

    fixture.componentInstance.smoothingEnabled = true;
    fixture.detectChanges();

    expect(methodSpies['resetDomain']).toHaveBeenCalledTimes(2);
  });

  it('does not reset domain on smoothing enabled, if not already fit', () => {
    const fixture = TestBed.createComponent(TestableComponent);
    fixture.componentInstance.smoothingEnabled = true;
    fixture.detectChanges();
    methodSpies['isDataFitToDomain'].calls.reset();
    methodSpies['isDataFitToDomain'].and.returnValue(false);

    fixture.componentInstance.smoothingEnabled = false;
    fixture.detectChanges();

    expect(methodSpies['resetDomain']).not.toHaveBeenCalled();

    fixture.componentInstance.smoothingEnabled = true;
    fixture.detectChanges();

    expect(methodSpies['resetDomain']).not.toHaveBeenCalled();
  });
});
