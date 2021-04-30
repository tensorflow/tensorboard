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
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {VzHistogramTimeSeriesElement} from '../../tb_polymer_interop_types';

import {HistogramComponent} from './histogram_component';
import {
  ColorScale,
  HistogramData,
  HistogramMode,
  TimeProperty,
} from './histogram_types';

// Wrapper component required to properly trigger Angular lifecycles.
// Without it, ngOnChanges do not get triggered before ngOnInit.
@Component({
  selector: 'testable-tb-histogram',
  template: `
    <tb-histogram
      [mode]="mode"
      [timeProperty]="timeProperty"
      [colorScale]="colorScale"
      [name]="name"
      [data]="data"
    >
    </tb-histogram>
  `,
})
class TestableComponent {
  @Input() mode!: HistogramMode;

  @Input() timeProperty!: TimeProperty;

  @Input() colorScale!: ColorScale;

  @Input() name!: string;

  @Input() data!: HistogramData;
}

describe('histogram', () => {
  let setSeriesDataSpy: jasmine.Spy;
  let redrawSpy: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule],
      declarations: [HistogramComponent, TestableComponent],
    }).compileComponents();

    // Impossible to implement the interface instead since it needs to inherit
    // Element while not calling the constructor (ES5 downcompile converts it to
    // function declaration).
    // Create a random HTMLElement instead then manually override the
    // properties.
    const vzHistogram = document.createElement(
      'testable-vz-histogram-timeseries'
    ) as VzHistogramTimeSeriesElement;
    setSeriesDataSpy = jasmine.createSpy();
    vzHistogram.setSeriesData = setSeriesDataSpy;
    redrawSpy = jasmine.createSpy();
    vzHistogram.redraw = redrawSpy;

    spyOn(document, 'createElement')
      .and.callThrough()
      .withArgs('vz-histogram-timeseries')
      .and.returnValue(vzHistogram);
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

  function getComponent(fixture: ComponentFixture<TestableComponent>) {
    return fixture.nativeElement.querySelector(
      'testable-vz-histogram-timeseries'
    );
  }

  it('renders vz-histogram-timeseries', () => {
    const fixture = createComponent('foo', []);
    fixture.componentInstance.mode = HistogramMode.OFFSET;
    fixture.componentInstance.timeProperty = TimeProperty.STEP;
    fixture.detectChanges();
    const component = getComponent(fixture);

    expect(component.mode).toBe(HistogramMode.OFFSET);
    expect(component.timeProperty).toBe(TimeProperty.STEP);
    expect(setSeriesDataSpy).toHaveBeenCalledWith('foo', []);
  });

  it('updates data when new data comes in', () => {
    const fixture = createComponent('foo', []);
    fixture.detectChanges();

    fixture.componentInstance.data = [
      {
        wallTime: 0,
        step: 0,
        bins: [
          {x: 1, y: 2, dx: 1},
          {x: 2, y: 3, dx: 1},
        ],
      },
      {wallTime: 123.1, step: 2, bins: [{x: 3, y: 2, dx: 1}]},
    ];
    fixture.detectChanges();

    expect(setSeriesDataSpy).toHaveBeenCalledWith('foo', [
      {
        wall_time: 0,
        step: 0,
        bins: [
          {x: 1, y: 2, dx: 1},
          {x: 2, y: 3, dx: 1},
        ],
      },
      {wall_time: 123.1, step: 2, bins: [{x: 3, y: 2, dx: 1}]},
    ]);
  });
});
