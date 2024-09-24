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
import {OverlayContainer, OverlayModule} from '@angular/cdk/overlay';
import {TestbedHarnessEnvironment} from '@angular/cdk/testing/testbed';
import {CommonModule} from '@angular/common';
import {Component, DebugElement, Input} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {MatButtonModule} from '@angular/material/button';
import {MatInputModule} from '@angular/material/input';
import {MatMenuModule} from '@angular/material/menu';
import {MatMenuHarness} from '@angular/material/menu/testing';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {MatIconTestingModule} from '../../../testing/mat_icon_module';
import {Extent, Scale, ScaleType} from '../lib/public_types';
import {createScale} from '../lib/scale';
import {AxisUtils} from './line_chart_axis_utils';
import {LineChartAxisComponent} from './line_chart_axis_view';

@Component({
  standalone: false,
  selector: 'testable-comp',
  template: `
    <line-chart-axis
      class="test"
      axis="x"
      [axisExtent]="viewBox.x"
      [scale]="scale"
      [gridCount]="10"
      [domDim]="domDim"
      (onViewExtentChange)="onXViewExtentChange($event)"
    ></line-chart-axis>
    <line-chart-axis
      class="test"
      axis="y"
      [axisExtent]="viewBox.y"
      [scale]="scale"
      [gridCount]="5"
      [domDim]="domDim"
    ></line-chart-axis>
  `,
})
class TestableComponent {
  @Input()
  scale: Scale = createScale(ScaleType.LINEAR);

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

  @Input()
  onXViewExtentChange: jasmine.Spy = jasmine.createSpy();
}

describe('line_chart_v2/sub_view/axis test', () => {
  let overlayContainer: OverlayContainer;

  const ByCss = {
    X_AXIS: By.css('line-chart-axis .x-axis'),
    X_AXIS_LABEL: By.css('line-chart-axis .x-axis .minor text'),
    X_AXIS_MAJOR_TICK_LABEL: By.css('line-chart-axis .x-axis .major-label'),
    Y_AXIS_LABEL: By.css('line-chart-axis .y-axis text'),
    X_AXIS_EDIT_BUTTON: By.css('line-chart-axis .x-axis .extent-edit-button'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TestableComponent, LineChartAxisComponent],
      imports: [
        CommonModule,
        MatButtonModule,
        MatIconTestingModule,
        MatInputModule,
        MatMenuModule,
        NoopAnimationsModule,
        OverlayModule,
      ],
    }).compileComponents();

    overlayContainer = TestBed.inject(OverlayContainer);
    // `filterTicksByVisibility` is tested separately.
    spyOn(AxisUtils, 'filterTicksByVisibility').and.callFake((ticks) => ticks);
  });

  function assertLabels(debugElements: DebugElement[], axisLabels: string[]) {
    const actualLabels = debugElements.map((el) =>
      el.nativeElement.textContent.trim()
    );
    expect(actualLabels).toEqual(axisLabels);
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

  describe('temporal axis', () => {
    function createComponent(minDate: Date, maxDate: Date) {
      const fixture = TestBed.createComponent(TestableComponent);
      fixture.componentInstance.scale = createScale(ScaleType.TIME);
      fixture.componentInstance.domDim = {width: 500, height: 100};
      fixture.componentInstance.viewBox = {
        x: [minDate.getTime(), maxDate.getTime()],
        y: [0, 1],
      };
      fixture.detectChanges();
      return fixture;
    }

    it('shows tick in milliseconds', () => {
      const fixture = createComponent(
        new Date('2020-01-05 13:23:01.030'),
        new Date('2020-01-05 13:23:01.084')
      );

      assertLabels(fixture.debugElement.queryAll(ByCss.X_AXIS_LABEL), [
        '.030',
        '.035',
        '.040',
        '.045',
        '.050',
        '.055',
        '.060',
        '.065',
        '.070',
        '.075',
        '.080',
      ]);
      assertLabels(
        fixture.debugElement.queryAll(ByCss.X_AXIS_MAJOR_TICK_LABEL),
        []
      );
    });

    it('shows tick in seconds', () => {
      const fixture = createComponent(
        new Date('2020-01-05 13:23:01'),
        new Date('2020-01-05 13:23:54')
      );

      assertLabels(fixture.debugElement.queryAll(ByCss.X_AXIS_LABEL), [
        ':05',
        ':10',
        ':15',
        ':20',
        ':25',
        ':30',
        ':35',
        ':40',
        ':45',
        ':50',
      ]);
      assertLabels(
        fixture.debugElement.queryAll(ByCss.X_AXIS_MAJOR_TICK_LABEL),
        ['Jan 5, 2020, 1:23:30 PM']
      );
    });

    it('shows tick in hours', () => {
      const fixture = createComponent(
        new Date('2020-01-05 13:23:01'),
        new Date('2020-01-05 16:23:54')
      );

      assertLabels(fixture.debugElement.queryAll(ByCss.X_AXIS_LABEL), [
        '01:30',
        '01:45',
        '02 PM',
        '02:15',
        '02:30',
        '02:45',
        '03 PM',
        '03:15',
        '03:30',
        '03:45',
        '04 PM',
        '04:15',
      ]);
      assertLabels(
        fixture.debugElement.queryAll(ByCss.X_AXIS_MAJOR_TICK_LABEL),
        []
      );
    });

    it('shows tick in hours (wider diff)', () => {
      const fixture = createComponent(
        new Date('2020-01-05 13:23:01'),
        new Date('2020-01-05 20:23:54')
      );

      assertLabels(fixture.debugElement.queryAll(ByCss.X_AXIS_LABEL), [
        '01:30',
        '02 PM',
        '02:30',
        '03 PM',
        '03:30',
        '04 PM',
        '04:30',
        '05 PM',
        '05:30',
        '06 PM',
        '06:30',
        '07 PM',
        '07:30',
        '08 PM',
      ]);
      assertLabels(
        fixture.debugElement.queryAll(ByCss.X_AXIS_MAJOR_TICK_LABEL),
        ['Jan 5, 2020, 3:00:00 PM', 'Jan 5, 2020, 6:00:00 PM']
      );
    });

    it('shows tick in months', () => {
      const fixture = createComponent(
        new Date('2020-01-05 13:23:01'),
        new Date('2020-06-23 20:23:54')
      );

      assertLabels(fixture.debugElement.queryAll(ByCss.X_AXIS_LABEL), [
        'February',
        'March',
        'April',
        'May',
        'June',
      ]);
      assertLabels(
        fixture.debugElement.queryAll(ByCss.X_AXIS_MAJOR_TICK_LABEL),
        []
      );
    });

    it('shows tick in years', () => {
      const fixture = createComponent(
        new Date('2020-01-05 13:23:01'),
        new Date('2025-01-03 05:01:02')
      );

      assertLabels(fixture.debugElement.queryAll(ByCss.X_AXIS_LABEL), [
        '2021',
        '2022',
        '2023',
        '2024',
        '2025',
      ]);
      assertLabels(
        fixture.debugElement.queryAll(ByCss.X_AXIS_MAJOR_TICK_LABEL),
        []
      );
    });
  });

  describe('extent manual edit', () => {
    const EditorSelector = {
      INPUT: '.extent-edit-input input',
      CHANGE: '.extent-edit-change',
      CANCEL: '.extent-edit-cancel',
    };

    function setMinMax(
      fixture: ComponentFixture<TestableComponent>,
      min: string,
      max: string
    ): HTMLElement {
      const el = fixture.debugElement.query(ByCss.X_AXIS_EDIT_BUTTON);
      el.nativeElement.click();

      const overlay = overlayContainer.getContainerElement();
      const [minInput, maxInput] = overlay.querySelectorAll(
        EditorSelector.INPUT
      ) as NodeListOf<HTMLInputElement>;

      minInput.value = min;
      maxInput.value = max;

      return overlay;
    }

    function changeMinMax(
      fixture: ComponentFixture<TestableComponent>,
      min: string,
      max: string
    ) {
      const overlay = setMinMax(fixture, min, max);
      (overlay.querySelector(EditorSelector.CHANGE) as HTMLElement).click();
    }

    it('shows a edit menu clicking on the axis', () => {
      const extentChanged = jasmine.createSpy();
      const fixture = TestBed.createComponent(TestableComponent);
      fixture.componentInstance.onXViewExtentChange = extentChanged;
      fixture.detectChanges();

      changeMinMax(fixture, '-0.5', '0.5');
      expect(extentChanged).toHaveBeenCalledWith([-0.5, 0.5]);
    });

    it('disallows setting non numbers to input', () => {
      const extentChanged = jasmine.createSpy();
      const fixture = TestBed.createComponent(TestableComponent);
      fixture.componentInstance.onXViewExtentChange = extentChanged;
      fixture.detectChanges();

      changeMinMax(fixture, 'meow', '0.5');
      // HTMLInputElement#type=number does some input validation and `el.value` returns
      // `'0'` when it is set to non-numbers.
      expect(extentChanged).toHaveBeenCalledWith([0, 0.5]);
    });

    it('does not allow max to be smaller than min', () => {
      const extentChanged = jasmine.createSpy();
      const fixture = TestBed.createComponent(TestableComponent);
      fixture.componentInstance.onXViewExtentChange = extentChanged;
      fixture.detectChanges();

      changeMinMax(fixture, '100', '1');
      expect(extentChanged).toHaveBeenCalledWith([1, 100]);
    });

    it('resets inputs when the menu when dismissed without saving', async () => {
      const fixture = TestBed.createComponent(TestableComponent);
      const loader = TestbedHarnessEnvironment.loader(fixture);
      fixture.componentInstance.viewBox = {
        x: [1000, 2000],
        y: [-1, 1],
      };
      fixture.detectChanges();
      const overlay = setMinMax(fixture, '100', '1');

      const menuTesting = await loader.getHarness(MatMenuHarness);
      await menuTesting.close();

      expect(overlay.querySelectorAll(EditorSelector.INPUT).length).toBe(0);

      const el = fixture.debugElement.query(ByCss.X_AXIS_EDIT_BUTTON);
      el.nativeElement.click();

      const [minInput, maxInput] = overlay.querySelectorAll(
        EditorSelector.INPUT
      ) as NodeListOf<HTMLInputElement>;
      expect(minInput.value).toBe('1000');
      expect(maxInput.value).toBe('2000');
    });
  });
});
