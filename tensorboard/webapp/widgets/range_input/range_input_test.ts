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
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {FormsModule} from '@angular/forms';
import {MatSliderModule} from '@angular/material/slider';
import {By} from '@angular/platform-browser';
import {RangeInputComponent} from './range_input_component';
import {RangeInputSource, RangeValues} from './types';

@Component({
  standalone: false,
  selector: 'testable-range-input',
  template: `
    <tb-range-input
      [min]="min"
      [max]="max"
      [lowerValue]="lowerValue"
      [upperValue]="upperValue"
      [enabled]="enabled"
      [tickCount]="tickCount"
      (rangeValuesChanged)="onRangeValuesChanged($event)"
    ></tb-range-input>
  `,
})
class TestableComponent {
  @Input() min!: number;

  @Input() max!: number;

  @Input() lowerValue!: number;

  @Input() upperValue!: number | null;

  @Input() enabled!: boolean;

  @Input() tickCount!: number | null;

  @Input()
  onRangeValuesChanged!: (event: RangeValues) => void;
}

describe('range input test', () => {
  interface CreateComponentInput {
    min?: number;
    max?: number;
    tickCount?: number | null;
    lowerValue: number;
    upperValue?: number;
    useRange?: boolean;
  }

  function createComponent(props: CreateComponentInput) {
    const propsWithDefault = {
      min: -5,
      max: 5,
      tickCount: 10,
      enabled: true,
      ...props,
    };
    const fixture = TestBed.createComponent(TestableComponent);

    const onRangeValuesChanged = jasmine.createSpy();
    fixture.componentInstance.lowerValue = propsWithDefault.lowerValue;
    if (propsWithDefault.upperValue !== undefined) {
      fixture.componentInstance.upperValue = propsWithDefault.upperValue;
    } else {
      fixture.componentInstance.upperValue = null;
    }
    fixture.componentInstance.min = propsWithDefault.min;
    fixture.componentInstance.max = propsWithDefault.max;
    fixture.componentInstance.tickCount = propsWithDefault.tickCount;
    fixture.componentInstance.onRangeValuesChanged = onRangeValuesChanged;
    fixture.detectChanges();
    return {
      fixture,
      onRangeValuesChanged,
    };
  }

  function getInputs(
    fixture: ComponentFixture<TestableComponent>
  ): HTMLInputElement[] {
    const input = fixture.debugElement.queryAll(By.css('input'));
    return input.map((inputDebugElement) => inputDebugElement.nativeElement);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule, MatSliderModule],
      declarations: [RangeInputComponent, TestableComponent],
    }).compileComponents();
  });

  describe('slider', () => {
    it('uses correct values in slider', () => {
      const {fixture} = createComponent({
        lowerValue: 2,
        upperValue: 3,
      });

      let thumbs = fixture.debugElement.queryAll(By.css('mat-slider input'));
      expect(thumbs[0].nativeElement.getAttribute('ng-reflect-model')).toEqual(
        '2'
      );
      expect(thumbs[1].nativeElement.getAttribute('ng-reflect-model')).toEqual(
        '3'
      );
    });

    it('dispatches actions when slider emits valueChange event', () => {
      const {fixture, onRangeValuesChanged} = createComponent({
        lowerValue: -1,
        upperValue: 1,
        tickCount: null,
      });
      const sliderThumb = fixture.debugElement.queryAll(
        By.css('mat-slider input')
      )[0];

      sliderThumb.triggerEventHandler('valueChange');
      expect(onRangeValuesChanged).toHaveBeenCalledWith({
        lowerValue: -1,
        upperValue: 1,
        source: RangeInputSource.SLIDER,
      });
    });

    it('calculates ticks based on input', () => {
      const {fixture} = createComponent({
        lowerValue: 0,
        upperValue: 10,
        min: 0,
        max: 10,
        tickCount: 20,
      });

      const slider = fixture.debugElement.queryAll(By.css('mat-slider'))[0];
      expect(slider.nativeElement.getAttribute('ng-reflect-step')).toEqual(
        '0.5'
      );
    });
  });

  describe('input control', () => {
    it('emits change when user changes input', () => {
      const {fixture, onRangeValuesChanged} = createComponent({
        min: 0,
        max: 10,
        lowerValue: 5,
        upperValue: 5,
      });
      const [minInput] = getInputs(fixture);
      minInput.value = '0';
      minInput.dispatchEvent(new InputEvent('change'));

      expect(onRangeValuesChanged).toHaveBeenCalledWith({
        lowerValue: 0,
        upperValue: 5,
        source: RangeInputSource.TEXT,
      });
    });

    it('does not react to keydown or input', () => {
      const {fixture, onRangeValuesChanged} = createComponent({
        min: 0,
        max: 10,
        lowerValue: 5,
        upperValue: 5,
      });
      const [minInput] = getInputs(fixture);
      minInput.value = '0';
      minInput.dispatchEvent(new InputEvent('keydown'));
      minInput.dispatchEvent(new InputEvent('input'));
      minInput.dispatchEvent(new InputEvent('up'));

      expect(onRangeValuesChanged).not.toHaveBeenCalled();
    });

    it('swaps min and max when new upperValue is smaller than lowerValue', () => {
      const {fixture, onRangeValuesChanged} = createComponent({
        min: 0,
        max: 10,
        lowerValue: 5,
        upperValue: 5,
      });
      const [, maxInput] = getInputs(fixture);
      maxInput.value = '2';
      maxInput.dispatchEvent(new InputEvent('change'));

      expect(onRangeValuesChanged).toHaveBeenCalledWith({
        lowerValue: 2,
        upperValue: 5,
        source: RangeInputSource.TEXT,
      });
    });

    it('updates value to be min in range slider on lower value cleared', () => {
      const {fixture, onRangeValuesChanged} = createComponent({
        min: 0,
        max: 10,
        lowerValue: 5,
        upperValue: 5,
      });
      const [minInput] = getInputs(fixture);
      minInput.value = '';
      minInput.dispatchEvent(new InputEvent('change'));

      expect(onRangeValuesChanged).toHaveBeenCalledWith({
        lowerValue: 0,
        upperValue: 5,
        source: RangeInputSource.TEXT,
      });
    });

    it('dispatches actions on range value changed when adding upper value to single slider', () => {
      const {fixture, onRangeValuesChanged} = createComponent({
        min: 0,
        max: 10,
        lowerValue: 5,
      });
      const [, maxInput] = getInputs(fixture);
      maxInput.value = '7';
      maxInput.dispatchEvent(new InputEvent('change'));

      expect(onRangeValuesChanged).toHaveBeenCalledWith({
        lowerValue: 5,
        upperValue: 7,
        source: RangeInputSource.TEXT,
      });
    });
  });
});
