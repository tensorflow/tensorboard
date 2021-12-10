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
import {By} from '@angular/platform-browser';
import {RangeInputComponent, TEST_ONLY} from './range_input_component';

@Component({
  selector: 'testable-range-input',
  template: `
    <tb-range-input
      [min]="min"
      [max]="max"
      [lowerValue]="lowerValue"
      [upperValue]="upperValue"
      [tickCount]="tickCount"
      (value)="onValue($event)"
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

  @Input() upperValue!: number;

  @Input() tickCount!: number | null;

  @Input() onValue!: (event: {lowerValue: number; upperValue: number}) => void;
}

describe('range input test', () => {
  interface CreateComponentInput {
    min?: number;
    max?: number;
    tickCount?: number | null;
    lowerValue: number;
    upperValue: number;
  }

  function createComponent(props: CreateComponentInput) {
    const propsWithDefault = {
      min: -5,
      max: 5,
      tickCount: 10,
      ...props,
    };
    const fixture = TestBed.createComponent(TestableComponent);

    const onValue = jasmine.createSpy();
    fixture.componentInstance.lowerValue = propsWithDefault.lowerValue;
    fixture.componentInstance.upperValue = propsWithDefault.upperValue;
    fixture.componentInstance.min = propsWithDefault.min;
    fixture.componentInstance.max = propsWithDefault.max;
    fixture.componentInstance.tickCount = propsWithDefault.tickCount;
    fixture.componentInstance.onValue = onValue;
    fixture.detectChanges();
    return {fixture, onValue};
  }

  function getThumbs(
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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RangeInputComponent, TestableComponent],
    }).compileComponents();
  });

  describe('render', () => {
    function getThumbsStyleLeft(
      fixture: ComponentFixture<TestableComponent>
    ): string[] {
      return getThumbs(fixture).map((debugEl) => {
        return debugEl.style.left;
      });
    }

    it('renders correct thumb positions', () => {
      const {fixture} = createComponent({lowerValue: 2, upperValue: 3});

      expect(getThumbsStyleLeft(fixture)).toEqual(['70%', '80%']);
    });

    it('clips min and max within the slider', () => {
      const {fixture} = createComponent({lowerValue: -100, upperValue: 100});

      expect(getThumbsStyleLeft(fixture)).toEqual(['0%', '100%']);
    });

    it('does not check lowerValue > upperValue and render them', () => {
      const {fixture} = createComponent({lowerValue: 3, upperValue: -1});

      expect(getThumbsStyleLeft(fixture)).toEqual(['80%', '40%']);
    });

    it('puts thumb at 50% when min === max', () => {
      const {fixture} = createComponent({
        min: 10,
        max: 10,
        lowerValue: 10,
        upperValue: 10,
      });

      expect(getThumbsStyleLeft(fixture)).toEqual(['50%', '50%']);
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

    it('calls `value` when thumb is dragged', () => {
      const {fixture, onValue} = createComponent({
        lowerValue: -1,
        upperValue: 1,
        tickCount: null,
      });
      const [leftThumb] = getThumbs(fixture);
      startMovingThumb(leftThumb);
      // range-input starts from 100px and ends at 300px.
      moveThumb(leftThumb, 120);
      expect(onValue).toHaveBeenCalledWith({lowerValue: -4, upperValue: 1});
    });

    it('rounds number to filter out floating point math noise', () => {
      const {fixture, onValue} = createComponent({
        min: 0.1,
        max: 0.3,
        lowerValue: 0.1,
        upperValue: 0.3,
        tickCount: null,
      });
      const [leftThumb] = getThumbs(fixture);
      startMovingThumb(leftThumb);
      // range-input starts from 100px and ends at 300px so 102px is about 2%
      // from left edge.
      moveThumb(leftThumb, 102);
      // Without our logic to round, lowerValue would be 0.10200000000000001.
      expect(onValue).toHaveBeenCalledWith({
        lowerValue: 0.102,
        upperValue: 0.3,
      });
    });

    it('compensates position of mousedown relative to thumb center', () => {
      const {fixture, onValue} = createComponent({
        lowerValue: -1,
        upperValue: 1,
        tickCount: null,
      });
      const values: Array<{lowerValue: number; upperValue: number}> = [];
      onValue.and.callFake(
        (value: {lowerValue: number; upperValue: number}) => {
          values.push(value);
        }
      );
      const [leftThumb] = getThumbs(fixture);
      startMovingThumb(leftThumb, TEST_ONLY.THUMB_SIZE_PX);
      // Because we started to drag from right edge of the thumb, moving the
      // thumb to 120 is equivalent to putting it at 126px (thumb radius is
      // 6px).
      moveThumb(leftThumb, 120);
      expect(values).toEqual([{lowerValue: -4.3, upperValue: 1}]);

      startMovingThumb(leftThumb, 0);
      // Because we started to drag from left edge of the thumb, moving the
      // thumb to 120 is equivalent to putting it at 114px (thumb radius is
      // 6px).
      moveThumb(leftThumb, 120);
      expect(values).toEqual([
        {lowerValue: -4.3, upperValue: 1},
        {lowerValue: -3.7, upperValue: 1},
      ]);
    });

    it('ignores mousemove when mousedown never happened', () => {
      const {fixture, onValue} = createComponent({
        lowerValue: -1,
        upperValue: 1,
      });
      const [leftThumb] = getThumbs(fixture);

      moveThumb(leftThumb, 0);
      expect(onValue).not.toHaveBeenCalled();

      moveThumb(leftThumb, 1000);
      expect(onValue).not.toHaveBeenCalled();
    });

    it('does not trigger change when value does not change', () => {
      const {fixture, onValue} = createComponent({
        lowerValue: -5,
        upperValue: 1,
        tickCount: 10,
      });
      const [leftThumb] = getThumbs(fixture);
      startMovingThumb(leftThumb);

      moveThumb(leftThumb, 101);
      expect(onValue).not.toHaveBeenCalled();
    });

    it('emits change when moved by more than one', () => {
      const {fixture, onValue} = createComponent({
        lowerValue: -5,
        upperValue: 1,
        tickCount: 10,
      });
      const [leftThumb] = getThumbs(fixture);
      startMovingThumb(leftThumb);

      moveThumb(leftThumb, 109);
      expect(onValue).not.toHaveBeenCalled();

      // In 200px wide slider, we have 10 ticks which means every tick should
      // occupy 20px. When you move the cursor a little bit left/right between
      // two ticks, we change the value.
      moveThumb(leftThumb, 111);
      expect(onValue).toHaveBeenCalledWith({lowerValue: -4, upperValue: 1});
    });

    it('triggers change for minute movement when tickCount is null', () => {
      const {fixture, onValue} = createComponent({
        lowerValue: -5,
        upperValue: 1,
        tickCount: null,
      });
      const [leftThumb] = getThumbs(fixture);
      startMovingThumb(leftThumb);

      moveThumb(leftThumb, 101);
      expect(onValue).toHaveBeenCalledWith({lowerValue: -4.95, upperValue: 1});
    });

    it('changes upperValue when min knob crosses upperValue', () => {
      const {fixture, onValue} = createComponent({
        lowerValue: -5,
        upperValue: 0,
        tickCount: null,
      });
      const [leftThumb] = getThumbs(fixture);
      startMovingThumb(leftThumb);

      moveThumb(leftThumb, 250);
      expect(onValue).toHaveBeenCalledWith({lowerValue: 0, upperValue: 2.5});
    });

    it('does not change anything when min === max', () => {
      const {fixture, onValue} = createComponent({
        min: 10,
        max: 10,
        lowerValue: 10,
        upperValue: 10,
      });

      const [leftThumb] = getThumbs(fixture);
      startMovingThumb(leftThumb);

      moveThumb(leftThumb, 250);
      expect(onValue).not.toHaveBeenCalled();
    });
  });

  describe('input control', () => {
    let fixture: ComponentFixture<TestableComponent>;
    let onValue: jasmine.Spy;

    beforeEach(() => {
      const fixtureAndOnValue = createComponent({
        min: 0,
        max: 10,
        lowerValue: 5,
        upperValue: 5,
      });

      fixture = fixtureAndOnValue.fixture;
      onValue = fixtureAndOnValue.onValue;
    });

    it('emits change when user changes input', () => {
      const [minInput] = getInputs(fixture);
      minInput.value = '0';
      minInput.dispatchEvent(new InputEvent('change'));

      expect(onValue).toHaveBeenCalledWith({lowerValue: 0, upperValue: 5});
    });

    it('does not react to keydown or input', () => {
      const [minInput] = getInputs(fixture);
      minInput.value = '0';
      minInput.dispatchEvent(new InputEvent('keydown'));
      minInput.dispatchEvent(new InputEvent('input'));
      minInput.dispatchEvent(new InputEvent('up'));

      expect(onValue).not.toHaveBeenCalled();
    });

    it('swaps min and max when new upperValue is smaller than lowerValue', () => {
      const [, maxInput] = getInputs(fixture);
      maxInput.value = '2';
      maxInput.dispatchEvent(new InputEvent('change'));

      expect(onValue).toHaveBeenCalledWith({lowerValue: 2, upperValue: 5});
    });
  });
});
