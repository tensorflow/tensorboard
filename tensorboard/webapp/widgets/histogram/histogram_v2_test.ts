/* Copyright 2021 The TensorFlow Authors. All Rights Reserved.

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
import {Component, DebugElement, Input, NO_ERRORS_SCHEMA} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';

import {
  Bin,
  ColorScale,
  HistogramData,
  HistogramDatum,
  HistogramMode,
  TimeProperty,
} from './histogram_types';
import {HistogramV2Component} from './histogram_v2_component';

function buildBin(override: Partial<Bin> = {}): Bin {
  return {
    x: 0,
    dx: 1,
    y: 0,
    ...override,
  };
}

function buildHistogramDatum(
  override: Partial<HistogramDatum> = {}
): HistogramDatum {
  return {
    wallTime: 1000,
    step: 0,
    bins: [...new Array(10)].map(() => buildBin()),
    ...override,
  };
}

// Wrapper component required to properly trigger Angular lifecycles.
// Without it, ngOnChanges do not get triggered before ngOnInit.
@Component({
  selector: 'testable-tb-histogram',
  template: `
    <tb-histogram-v2
      [mode]="mode"
      [timeProperty]="timeProperty"
      [colorScale]="colorScale"
      [name]="name"
      [data]="data"
    >
    </tb-histogram-v2>
  `,
  styles: [
    `
      tb-histogram-v2 {
        height: 100px;
        position: fixed;
        width: 100px;
      }
    `,
  ],
})
class TestableComponent {
  @Input() mode!: HistogramMode;
  @Input() timeProperty!: TimeProperty;
  @Input() colorScale!: ColorScale;
  @Input() name!: string;
  @Input() data!: HistogramData;
}

describe('histogram v2 test', () => {
  const byCss = {
    X_AXIS: By.css('.x-axis'),
    Y_AXIS: By.css('.y-axis'),
    HISTOGRAMS: By.css('.histograms'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule],
      declarations: [HistogramV2Component, TestableComponent],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  function createComponent(
    name: string,
    data: HistogramData
  ): ComponentFixture<TestableComponent> {
    const fixture = TestBed.createComponent(TestableComponent);
    fixture.componentInstance.name = name;
    fixture.componentInstance.data = data;
    fixture.componentInstance.mode = HistogramMode.OFFSET;
    fixture.componentInstance.timeProperty = TimeProperty.STEP;
    fixture.componentInstance.colorScale = (name) => '#fff';
    return fixture;
  }

  function getAxisLabelText(axis: DebugElement): string[] {
    const elements = axis.nativeElement.querySelectorAll(
      'text'
    ) as SVGTextElement[];
    return Array.from(elements).map((el) => el.textContent ?? '');
  }

  describe('x axis render', () => {
    it('renders min and max of bins in scalar', () => {
      const fixture = createComponent('foo', [
        buildHistogramDatum({
          step: 0,
          bins: [buildBin({x: 1, dx: 5})],
        }),
        buildHistogramDatum({
          step: 1,
          bins: [buildBin({x: 0, dx: 100})],
        }),
        buildHistogramDatum({
          step: 100,
          bins: [buildBin({x: -100, dx: 5})],
        }),
      ]);
      fixture.componentInstance.mode = HistogramMode.OFFSET;
      fixture.componentInstance.timeProperty = TimeProperty.STEP;
      fixture.detectChanges();

      expect(
        getAxisLabelText(fixture.debugElement.query(byCss.X_AXIS))
      ).toEqual(['-100', '0', '100']);
    });
  });

  describe('y axis render', () => {
    describe('offset mode', () => {
      it('renders min and max of step in STEP mode', () => {
        const fixture = createComponent('foo', [
          buildHistogramDatum({
            step: 0,
          }),
          buildHistogramDatum({
            step: 1,
          }),
          buildHistogramDatum({
            step: 100,
          }),
        ]);
        fixture.componentInstance.mode = HistogramMode.OFFSET;
        fixture.componentInstance.timeProperty = TimeProperty.STEP;
        fixture.detectChanges();

        expect(
          getAxisLabelText(fixture.debugElement.query(byCss.Y_AXIS))
        ).toEqual(['0', '20', '40', '60', '80', '100']);
      });

      it('renders wallTime in WALL_TIME mode', () => {
        const fixture = createComponent('foo', [
          buildHistogramDatum({
            step: 0,
            wallTime: new Date('2000-1-1').getTime(),
          }),
          buildHistogramDatum({
            step: 1,
            wallTime: new Date('2000-2-1').getTime(),
          }),
          buildHistogramDatum({
            step: 100,
            wallTime: new Date('2000-3-1').getTime(),
          }),
        ]);
        fixture.componentInstance.mode = HistogramMode.OFFSET;
        fixture.componentInstance.timeProperty = TimeProperty.WALL_TIME;
        fixture.detectChanges();

        expect(
          getAxisLabelText(fixture.debugElement.query(byCss.Y_AXIS))
        ).toEqual([
          '01/01 12:00:00 AM',
          '02/01 12:00:00 AM',
          '03/01 12:00:00 AM',
        ]);
      });

      it('renders relative time from first data in RELATIVE mode', () => {
        const fixture = createComponent('foo', [
          buildHistogramDatum({
            step: 0,
            wallTime: new Date('2000-1-1').getTime(),
          }),
          buildHistogramDatum({
            step: 1,
            wallTime: new Date('2000-2-1').getTime(),
          }),
          buildHistogramDatum({
            step: 100,
            wallTime: new Date('2000-3-1').getTime(),
          }),
        ]);
        fixture.componentInstance.mode = HistogramMode.OFFSET;
        fixture.componentInstance.timeProperty = TimeProperty.RELATIVE;
        fixture.detectChanges();

        expect(
          getAxisLabelText(fixture.debugElement.query(byCss.Y_AXIS))
        ).toEqual(['0h', '600h', '1000h']);
      });
    });

    describe('overlay mode', () => {
      it('renders bin count in scalar value from 0 to max regardless of timeProp', () => {
        const fixture = createComponent('foo', [
          buildHistogramDatum({
            step: 0,
            bins: [buildBin({y: 10}), buildBin({y: 5})],
          }),
          buildHistogramDatum({
            step: 1,
            bins: [buildBin({y: 10}), buildBin({y: 100})],
          }),
          buildHistogramDatum({
            step: 100,
            bins: [buildBin({y: 1337})],
          }),
        ]);
        fixture.componentInstance.mode = HistogramMode.OVERLAY;
        fixture.componentInstance.timeProperty = TimeProperty.WALL_TIME;
        fixture.detectChanges();

        expect(
          getAxisLabelText(fixture.debugElement.query(byCss.Y_AXIS))
        ).toEqual(['0.00', '500', '1.00e+3']);
      });
    });
  });

  describe('histogram render', () => {
    function getGroupTransforms(element: DebugElement): string[] {
      const transforms: string[] = [];
      for (const debugEl of element.queryAll(By.css('.histogram'))) {
        transforms.push(debugEl.attributes['transform']!);
      }
      return transforms;
    }

    function getHistogramPaths(element: DebugElement): string[] {
      const pathD: string[] = [];
      for (const debugEl of element.queryAll(By.css('path'))) {
        pathD.push(debugEl.attributes['d']!);
      }
      return pathD;
    }

    describe('offset mode', () => {
      it('positions group by their position in temporal axis', () => {
        const fixture = createComponent('foo', [
          buildHistogramDatum({step: 0}),
          buildHistogramDatum({step: 5}),
          buildHistogramDatum({step: 10}),
        ]);
        fixture.componentInstance.mode = HistogramMode.OFFSET;
        fixture.componentInstance.timeProperty = TimeProperty.STEP;
        fixture.detectChanges();

        expect(
          getGroupTransforms(fixture.debugElement.query(byCss.HISTOGRAMS))
        ).toEqual([
          // The content box is 30x50 pixels and because we need to render 2.5D
          // on 2D screen, we give height / 2.5 space for histogram slices to
          // render. 50 / 2.5 = 20 so effectively, step=0 is rendered at 20px
          // from the top.
          'translate(0, 20)',
          'translate(0, 35)',
          'translate(0, 50)',
        ]);
      });

      it('moves the group position depending on the timeProperty', () => {
        const fixture = createComponent('foo', [
          buildHistogramDatum({step: 0, wallTime: 100}),
          buildHistogramDatum({step: 5, wallTime: -200}),
          buildHistogramDatum({step: 10, wallTime: 400}),
        ]);
        fixture.componentInstance.mode = HistogramMode.OFFSET;
        fixture.componentInstance.timeProperty = TimeProperty.STEP;
        fixture.detectChanges();

        fixture.componentInstance.timeProperty = TimeProperty.WALL_TIME;
        fixture.detectChanges();
        expect(
          getGroupTransforms(fixture.debugElement.query(byCss.HISTOGRAMS))
        ).toEqual(['translate(0, 35)', 'translate(0, 20)', 'translate(0, 50)']);

        fixture.componentInstance.timeProperty = TimeProperty.RELATIVE;
        fixture.detectChanges();
        // Even the RELATIVE time property takes minimum relative value to the
        // max (-300, 300) which has the same spacing as the WALL_TIME.
        expect(
          getGroupTransforms(fixture.debugElement.query(byCss.HISTOGRAMS))
        ).toEqual(['translate(0, 35)', 'translate(0, 20)', 'translate(0, 50)']);
      });

      it('renders histogram in the "count" coordinate system', () => {
        const fixture = createComponent('foo', [
          buildHistogramDatum({
            step: 0,
            bins: [
              buildBin({x: 0, dx: 10, y: 5}),
              buildBin({x: 10, dx: 10, y: 10}),
              buildBin({x: 20, dx: 10, y: 100}),
            ],
          }),
        ]);
        fixture.componentInstance.mode = HistogramMode.OFFSET;
        fixture.componentInstance.timeProperty = TimeProperty.STEP;
        fixture.detectChanges();

        expect(
          getHistogramPaths(fixture.debugElement.query(byCss.HISTOGRAMS))
          // Do note that the histogram is rendered in 30x50 pixel box with
          // 20 pixel max height for each histogram. So, with max_y = 100,
          // y=0 is rendered at 0 while y=100 is rendered at -20.
          // Since max_x - min_x = 30, which is equal to that of width of the
          // element, we have x coordinate equal to pixel coordinate.
          //
          // M5,0: Starts from <center of first bin=5, pixel(0)>
          // L5,-1: Line to <center of first bin=5, pixel(y_0)>
          // L15,-2: Line to <pixel(15), pixel(y_1)>
          // L25,-20: Line to <pixel(25), pixel(y_2)>
          // L25,0: Last line back down to 0. <pixel(25), pixel(0)>
        ).toEqual(['M5,0L5,-1L15,-2L25,-20L25,0Z']);
      });
    });

    describe('overlay mode', () => {
      it('renders histogram in the "count" coordinate system', () => {
        const fixture = createComponent('foo', [
          buildHistogramDatum({
            step: 0,
            bins: [
              buildBin({x: 0, dx: 10, y: 5}),
              buildBin({x: 10, dx: 10, y: 10}),
              buildBin({x: 20, dx: 10, y: 100}),
            ],
          }),
        ]);
        fixture.componentInstance.mode = HistogramMode.OVERLAY;
        fixture.componentInstance.timeProperty = TimeProperty.STEP;
        fixture.detectChanges();

        // Again, rendered in 30x50 box and histogram now spans 50px high!
        // Do note that, unlike offset, <0, 0> starts from top-left corner so
        // <0, 50> is the bottom.
        expect(
          getHistogramPaths(fixture.debugElement.query(byCss.HISTOGRAMS))
        ).toEqual(['M5,50L5,47.5L15,45L25,0L25,50Z']);
      });
    });
  });
});
