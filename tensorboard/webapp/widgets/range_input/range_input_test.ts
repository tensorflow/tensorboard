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
import {MatSliderModule} from '@angular/material/slider';
import {By} from '@angular/platform-browser';
import {RangeInputComponent, TEST_ONLY} from './range_input_component';
import {RangeInputSource, RangeValues, SingleValue} from './types';

@Component({
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
      (singleValueChanged)="onSingleValueChanged($event)"
    ></tb-range-input>
  `,
  styles: [
    `
      tb-range-input {
        position: fixed;
        /* account for 6px padding and align left of track to 100px. */
        left: ${100 - TEST_ONLY.THUMB_SIZE_PX / 2}px;
        top: 50px;
        width: ${200 + TEST_ONLY.THUMB_SIZE_PX}px;
      }
    `,
  ],
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

  @Input()
  onSingleValueChanged!: (event: SingleValue) => void;
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
    const onSingleValueChanged = jasmine.createSpy();
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
    fixture.componentInstance.onSingleValueChanged = onSingleValueChanged;
    fixture.detectChanges();
    return {
      fixture,
      onRangeValuesChanged,
      onSingleValueChanged,
    };
  }

  function getThumbsOnRange(
    fixture: ComponentFixture<TestableComponent>
  ): HTMLElement[] {
    const thumbs = fixture.debugElement.queryAll(By.css('.thumb'));
    return thumbs.map((thumbDebugElement) => thumbDebugElement.nativeElement);
  }

  function getInputs(
    fixture: ComponentFixture<TestableComponent>
  ): HTMLInputElement[] {
    const input = fixture.debugElement.queryAll(By.css('input'));
    return input.map((inputDebugElement) => inputDebugElement.nativeElement);
  }

  function getMatSliderValue(el: DebugElement): string {
    return el.query(By.css('.mat-slider-thumb-label-text')).nativeElement
      .textContent;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatSliderModule],
      declarations: [RangeInputComponent, TestableComponent],
    }).compileComponents();
  });

  describe('render', () => {
    function getRangeThumbsStyleLeft(
      fixture: ComponentFixture<TestableComponent>
    ): string[] {
      return getThumbsOnRange(fixture).map((debugEl) => {
        return debugEl.style.left;
      });
    }
    describe('single selection', () => {
      it('renders correct slider value', () => {
        const {fixture} = createComponent({lowerValue: 2});
        expect(getMatSliderValue(fixture.debugElement)).toEqual('2');
      });
    });

    describe('range selection', () => {
      it('renders correct thumb positions', () => {
        const {fixture} = createComponent({
          lowerValue: 2,
          upperValue: 3,
        });

        expect(getRangeThumbsStyleLeft(fixture)).toEqual(['70%', '80%']);
      });

      it('clips min and max within the slider', () => {
        const {fixture} = createComponent({
          lowerValue: -100,
          upperValue: 100,
        });

        expect(getRangeThumbsStyleLeft(fixture)).toEqual(['0%', '100%']);
      });

      it('does not check lowerValue > upperValue and render them', () => {
        const {fixture} = createComponent({
          lowerValue: 3,
          upperValue: -1,
        });

        expect(getRangeThumbsStyleLeft(fixture)).toEqual(['80%', '40%']);
      });

      it('puts thumb at 50% when min === max', () => {
        const {fixture} = createComponent({
          min: 10,
          max: 10,
          lowerValue: 10,
          upperValue: 10,
        });

        expect(getRangeThumbsStyleLeft(fixture)).toEqual(['50%', '50%']);
      });
    });
  });

  describe('move', () => {
    function startMovingThumb(
      thumb: HTMLElement,
      relativePosition: number = TEST_ONLY.THUMB_SIZE_PX / 2
    ) {
      const {left} = thumb.getBoundingClientRect();
      // Simulate clicking right in the middle of the thumb.
      const mouseDownEvent = new MouseEvent('mousedown', {
        clientX: left + relativePosition,
      });
      thumb.dispatchEvent(mouseDownEvent);
    }

    function moveThumb(
      thumb: HTMLElement,
      absolutePositionInScreenInPx: number
    ) {
      const mouseMoveEvent = new MouseEvent('mousemove', {
        clientX: absolutePositionInScreenInPx,
      });
      document.dispatchEvent(mouseMoveEvent);
    }

    describe('single selection', () => {
      it('dispatches actions when making single step change', () => {
        const {fixture, onSingleValueChanged} = createComponent({
          lowerValue: -1,
          tickCount: null,
        });

        const slider = fixture.debugElement.query(By.css('mat-slider'));

        slider.triggerEventHandler('input', {
          value: 5,
        });

        expect(onSingleValueChanged).toHaveBeenCalledOnceWith(5);
      });
    });

    describe('range selection', () => {
      it('dispatches actions when making range step change', () => {
        const {fixture, onRangeValuesChanged} = createComponent({
          lowerValue: -1,
          upperValue: 1,
          tickCount: null,
        });
        const [leftThumb] = getThumbsOnRange(fixture);
        startMovingThumb(leftThumb);
        // range-input starts from 100px and ends at 300px.
        moveThumb(leftThumb, 120);
        expect(onRangeValuesChanged).toHaveBeenCalledWith({
          lowerValue: -4,
          upperValue: 1,
          source: RangeInputSource.SLIDER,
        });
      });

      it('rounds number to filter out floating point math noise', () => {
        const {fixture, onRangeValuesChanged} = createComponent({
          min: 0.1,
          max: 0.3,
          lowerValue: 0.1,
          upperValue: 0.3,
          tickCount: null,
        });
        const [leftThumb] = getThumbsOnRange(fixture);
        startMovingThumb(leftThumb);
        // range-input starts from 100px and ends at 300px so 102px is about 2%
        // from left edge.
        moveThumb(leftThumb, 102);
        // Without our logic to round, lowerValue would be 0.10200000000000001.
        expect(onRangeValuesChanged).toHaveBeenCalledWith({
          lowerValue: 0.102,
          upperValue: 0.3,
          source: RangeInputSource.SLIDER,
        });
      });

      it('compensates position of mousedown relative to thumb center', () => {
        const {fixture, onRangeValuesChanged} = createComponent({
          lowerValue: -1,
          upperValue: 1,
          tickCount: null,
        });
        const values: Array<RangeValues> = [];
        onRangeValuesChanged.and.callFake((value: RangeValues) => {
          values.push(value);
        });
        const [leftThumb] = getThumbsOnRange(fixture);
        startMovingThumb(leftThumb, TEST_ONLY.THUMB_SIZE_PX);
        // Because we started to drag from right edge of the thumb, moving the
        // thumb to 120 is equivalent to putting it at 126px (thumb radius is
        // 6px).
        moveThumb(leftThumb, 120);
        expect(values).toEqual([
          {
            lowerValue: -4.3,
            upperValue: 1,
            source: RangeInputSource.SLIDER,
          },
        ]);

        startMovingThumb(leftThumb, 0);
        // Because we started to drag from left edge of the thumb, moving the
        // thumb to 120 is equivalent to putting it at 114px (thumb radius is
        // 6px).
        moveThumb(leftThumb, 120);
        expect(values).toEqual([
          {
            lowerValue: -4.3,
            upperValue: 1,
            source: RangeInputSource.SLIDER,
          },
          {
            lowerValue: -3.7,
            upperValue: 1,
            source: RangeInputSource.SLIDER,
          },
        ]);
      });

      it('ignores mousemove when mousedown never happened', () => {
        const {fixture, onRangeValuesChanged} = createComponent({
          lowerValue: -1,
          upperValue: 1,
        });
        const [leftThumb] = getThumbsOnRange(fixture);

        moveThumb(leftThumb, 0);
        expect(onRangeValuesChanged).not.toHaveBeenCalled();

        moveThumb(leftThumb, 1000);
        expect(onRangeValuesChanged).not.toHaveBeenCalled();
      });

      it('does not trigger change when value does not change', () => {
        const {fixture, onRangeValuesChanged} = createComponent({
          lowerValue: -5,
          upperValue: 1,
          tickCount: 10,
        });
        const [leftThumb] = getThumbsOnRange(fixture);
        startMovingThumb(leftThumb);

        moveThumb(leftThumb, 101);
        expect(onRangeValuesChanged).not.toHaveBeenCalled();
      });

      it('emits change when moved by more than one', () => {
        const {fixture, onRangeValuesChanged} = createComponent({
          lowerValue: -5,
          upperValue: 1,
          tickCount: 10,
        });
        const [leftThumb] = getThumbsOnRange(fixture);
        startMovingThumb(leftThumb);

        moveThumb(leftThumb, 109);
        expect(onRangeValuesChanged).not.toHaveBeenCalled();

        // In 200px wide slider, we have 10 ticks which means every tick should
        // occupy 20px. When you move the cursor a little bit left/right between
        // two ticks, we change the value.
        moveThumb(leftThumb, 111);
        expect(onRangeValuesChanged).toHaveBeenCalledWith({
          lowerValue: -4,
          upperValue: 1,
          source: RangeInputSource.SLIDER,
        });
      });

      it('triggers change for minute movement when tickCount is null', () => {
        const {fixture, onRangeValuesChanged} = createComponent({
          lowerValue: -5,
          upperValue: 1,
          tickCount: null,
        });
        const [leftThumb] = getThumbsOnRange(fixture);
        startMovingThumb(leftThumb);

        moveThumb(leftThumb, 101);
        expect(onRangeValuesChanged).toHaveBeenCalledWith({
          lowerValue: -4.95,
          upperValue: 1,
          source: RangeInputSource.SLIDER,
        });
      });

      it('changes upperValue when min knob crosses upperValue', () => {
        const {fixture, onRangeValuesChanged} = createComponent({
          lowerValue: -5,
          upperValue: 0,
          tickCount: null,
        });
        const [leftThumb] = getThumbsOnRange(fixture);
        startMovingThumb(leftThumb);

        moveThumb(leftThumb, 250);
        expect(onRangeValuesChanged).toHaveBeenCalledWith({
          lowerValue: 0,
          upperValue: 2.5,
          source: RangeInputSource.SLIDER,
        });
      });

      it('does not change anything when min === max', () => {
        const {fixture, onRangeValuesChanged} = createComponent({
          min: 10,
          max: 10,
          lowerValue: 10,
          upperValue: 10,
        });

        const [leftThumb] = getThumbsOnRange(fixture);
        startMovingThumb(leftThumb);

        moveThumb(leftThumb, 250);
        expect(onRangeValuesChanged).not.toHaveBeenCalled();
      });
    });
  });

  describe('input control', () => {
    let fixture: ComponentFixture<TestableComponent>;
    let onRangeValuesChanged: jasmine.Spy;

    it('emits change when user changes input on range slider', () => {
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

    it('emits change when user changes input on single slider', () => {
      const {fixture, onSingleValueChanged} = createComponent({
        min: 0,
        max: 10,
        lowerValue: 5,
      });
      const [minInput] = getInputs(fixture);
      minInput.value = '2';
      minInput.dispatchEvent(new InputEvent('change'));

      expect(onSingleValueChanged).toHaveBeenCalledWith({
        value: 2,
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

      const {fixture: fixture2, onSingleValueChanged} = createComponent({
        min: 0,
        max: 10,
        lowerValue: 5,
      });
      const [minInput2] = getInputs(fixture2);
      minInput2.value = '0';
      minInput2.dispatchEvent(new InputEvent('keydown'));
      minInput2.dispatchEvent(new InputEvent('input'));
      minInput2.dispatchEvent(new InputEvent('up'));

      expect(onSingleValueChanged).not.toHaveBeenCalled();
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

    it('updates value to be min in single slider on input cleared', () => {
      const {fixture, onSingleValueChanged} = createComponent({
        min: 0,
        max: 10,
        lowerValue: 5,
      });
      const [minInput] = getInputs(fixture);
      minInput.value = '';
      minInput.dispatchEvent(new InputEvent('change'));

      expect(onSingleValueChanged).toHaveBeenCalledWith({
        value: 0,
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

    it('dispatches action when upper value removed on range slider', () => {
      const {fixture, onSingleValueChanged} = createComponent({
        min: 0,
        max: 10,
        lowerValue: 5,
        upperValue: 6,
      });
      const [, maxInput] = getInputs(fixture);
      maxInput.value = '';
      maxInput.dispatchEvent(new InputEvent('change'));

      expect(onSingleValueChanged).toHaveBeenCalledWith({
        value: 5,
        source: RangeInputSource.TEXT_DELETED,
      });
    });
  });
});
