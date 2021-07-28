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
import {Component, DebugElement, Input} from '@angular/core';
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
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule],
      declarations: [HistogramV2Component, TestableComponent],
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
      ).toEqual(['-100', '-50', '0', '50', '100']);
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
          '01/02 12:00:00 AM',
          '01/09 12:00:00 AM',
          '01/16 12:00:00 AM',
          '01/23 12:00:00 AM',
          '01/30 12:00:00 AM',
          '02/06 12:00:00 AM',
          '02/13 12:00:00 AM',
          '02/20 12:00:00 AM',
          '02/27 12:00:00 AM',
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
        ).toEqual(['0h', '300h', '600h', '800h', '1000h', '1000h']);
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
        ).toEqual(['0.00', '200', '400', '600', '800', '1.00e+3', '1.20e+3']);
      });
    });
  });
});
