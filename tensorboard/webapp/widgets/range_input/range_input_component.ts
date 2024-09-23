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
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import {RangeInputSource, RangeValues, SingleValue} from './types';

enum Position {
  NONE,
  LEFT,
  RIGHT,
}

/**
 * Supports a single or double thumbed slider component used for selecting a single
 * value or a numeric range. It renders one of the two sliders.
 *
 * Anatomy of the component:
 *
 * Double thumbed slider:
 *
 *       left input             right input
 *   +-----------------+     +----------------+
 *   |                 |     |                |
 *   +-----------------+     +----------------+
 *       <lowerValue>           <upperValue>
 *
 *         left thumb         right thumb
 *           +---+               +---+
 *           |   +     track     +   |
 *   x+--------+===================+---------+x
 * <min>     |   +               +   |      <max>
 *           +---+               +---+
 *        <lowerValue>        <upperValue>
 *
 * Features:
 * - you can drag a thumb to change lowerValue or upperValue
 * - a thumb is centered (origin of the circle) w.r.t a value.
 * - does not validate input (e.g., lowerValue can be lower than min) but thumbs
 *   are clipped to `min` and `max`. Also, when emitting changes, the values can
 *   never exceed `min` and `max`.
 * - emits actions on range value changed
 */
@Component({
  standalone: false,
  selector: 'tb-range-input',
  templateUrl: './range_input_component.ng.html',
  styleUrls: ['./range_input_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RangeInputComponent {
  @ViewChild('container', {static: false, read: ElementRef})
  container!: ElementRef<HTMLElement>;

  /**
   * Minimum number of the slider. This would set the minimum of the slider
   * tracker.
   */
  @Input() min!: number;

  /**
   * Maximum number of the slider. This would set the maximum of the slider
   * tracker.
   */
  @Input() max!: number;

  /**
   * Minimum value for the slider thumb. Expect the number to be greater than
   * or equal to `min`. If lower, the thumb will still be clipped to the `min`
   * value.
   */
  @Input() lowerValue!: number;

  /**
   * Maximum value for the slider thumb. Expect the number to be less than
   * or equal to `max`. If lower, the thumb will still be clipped to the `max`
   * value.
   */
  @Input() upperValue!: number;

  /**
   * number of discrete ticks in the slider
   */
  @Input() tickCount: number = 20;

  /**
   * Whether the text input is editable.
   */
  @Input() enabled: boolean = true;

  @Output()
  rangeValuesChanged = new EventEmitter<RangeValues>();

  @Output()
  singleValueChanged = new EventEmitter<SingleValue>();

  readonly Position = Position;

  thumbDrag() {
    this.rangeValuesChanged.emit({
      lowerValue: this.lowerValue,
      upperValue: this.upperValue,
      source: RangeInputSource.SLIDER,
    });
  }

  calculateStepSize() {
    if (this.tickCount === null || this.tickCount <= 0) {
      return 1;
    }
    return (this.max - this.min) / this.tickCount;
  }

  private getClippedValue(value: number) {
    return Math.min(Math.max(value, this.min), this.max);
  }

  private maybeNotifyNextRangeValues(
    minAndMax: [number, number],
    source: RangeInputSource
  ) {
    const [lowerValue, upperValue] = minAndMax.sort((a, b) => a - b);
    if (this.lowerValue !== lowerValue || this.upperValue !== upperValue) {
      this.rangeValuesChanged.emit({lowerValue, upperValue, source});
    }
  }

  handleInputChange(event: InputEvent, position: Position) {
    const input = event.target! as HTMLInputElement;
    const numValue = this.getClippedValue(Number(input.value));
    if (isNaN(numValue)) {
      return;
    }

    if (position === Position.LEFT) {
      this.maybeNotifyNextRangeValues(
        [numValue, this.upperValue],
        RangeInputSource.TEXT
      );
    } else {
      this.maybeNotifyNextRangeValues(
        [this.lowerValue, numValue],
        RangeInputSource.TEXT
      );
    }
  }
}
