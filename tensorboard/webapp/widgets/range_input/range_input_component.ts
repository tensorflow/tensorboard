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
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import {fromEvent, Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';

// Keep this in sync with range_input_component.scss's `$_thumb-size`.
const THUMB_SIZE_PX = 12;

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
 * Single slider:
 *
 *        left input             right input
 *   +-----------------+     +----------------+
 *   |                 |     |    [empty]     |
 *   +-----------------+     +----------------+
 *       <lowerValue>          <no upperValue>
 *
 *                 thumb
 *                 +---+
 *                 |   |
 *   x+==============+------------------------+x
 * <min>           |   |                    <max>
 *                 +---+
 *              <lowerValue>
 *
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
 * - `useRange` controls whether renders a single or double thumbed slider
 * - you can drag a thumb to change lowerValue or upperValue
 * - you cannot click on track to change any value on double thumbed slider
 *   but click anywhere in a single slider sets the value to where clicked.
 * - a thumb is centered (origin of the circle) w.r.t a value.
 * - when lowerValue cross upperValue, lowerValue = upperValue and upperValue
 *     changes. Converse is true, too.
 * - does not validate input (e.g., lowerValue can be lower than min) but thumbs
 *   are clipped to `min` and `max`. Also, when emitting changes, the values can
 *   never exceed `min` and `max`.
 * - emits actions on both single and range value changed
 * - emits actions on upper value removed
 */
@Component({
  selector: 'tb-range-input',
  templateUrl: './range_input_component.ng.html',
  styleUrls: ['./range_input_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RangeInputComponent implements OnInit, OnDestroy {
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
   * Maximum value for the slider thumb. Expect the number to be greater than
   * or equal to `max`. If lower, the thumb will still be clipped to the `max`
   * value.
   */
  @Input() upperValue!: number;

  /**
   * `null` denotes contiguous "ticks"
   */
  @Input() tickCount: number | null = 20;
  /**
   * Renders single or range slider.
   */
  @Input() useRange: boolean = true;
  /**
   * Whether the text input is editable.
   */
  @Input() enabled: boolean = true;

  @Output()
  rangeValuesChanged = new EventEmitter<{
    lowerValue: number;
    upperValue: number;
  }>();

  @Output() singleValueChanged = new EventEmitter<number>();

  @Output() upperValueRemoved = new EventEmitter<void>();

  readonly Position = Position;

  private activeThumb = Position.NONE;

  /**
   * Accounts for position of cursor when pressing down on the thumb.
   *
   * To illustrate the point, imagine the case when min=0, max=1, thumb has
   * radius of 100px, the thumb is set to max, and the input is positioned from
   * (0, 0) in the viewport. User can change max by mouse downing at (51, 0) but
   * that should not change the upperValue to 0.51. Instead, it should stay
   * at 1. In this case, since you cannot move the mouse past (0, 0), you can
   * never set the value to <= 49 but, normnally, the input does not get
   * rendered in (0, 0), thumb radius is 6px, and user can mouse down at middle
   * of the thumb.
   */
  private offsetXFromOriginOfActiveThumb: number = 0;

  private readonly ngUnsubscribe = new Subject<void>();

  constructor(private readonly changeDetector: ChangeDetectorRef) {}

  getThumbPosition(value: number): string {
    const clippedValue = this.getClippedValue(value);
    const boundSize = this.max - this.min;

    if (boundSize <= 0) {
      return '50%';
    }

    const percentDifference = ((clippedValue - this.min) / boundSize) * 100;
    return `${percentDifference}%`;
  }

  getTrackWidth(): string {
    const boundSize = this.max - this.min;

    if (boundSize <= 0) {
      return '0%';
    }

    const valDiff =
      this.getClippedValue(this.upperValue) -
      this.getClippedValue(this.lowerValue);
    const percentDifference = (valDiff / boundSize) * 100;
    return `${percentDifference}%`;
  }

  private getClippedValue(value: number) {
    return Math.min(Math.max(value, this.min), this.max);
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  ngOnInit() {
    fromEvent(document, 'mousemove', {passive: true})
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((event) => {
        this.handleMouseMove(event as MouseEvent);
      });
    fromEvent(document, 'mouseup', {passive: true})
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((event) => {
        this.handleMouseOut(event as MouseEvent);
      });
  }

  handleMouseDown(event: MouseEvent, position: Position) {
    this.activeThumb = position;
    // Mouse event reports cursor position w.r.t the top left edge of the target
    // (in this case, a thumb) element.
    const offsetXFromLeftOfThumb = event.offsetX;
    // The thumb is visually centered w.r.t. a value using negative margin of
    // THUMB_SIZE_PX / 2. Account for cursor offset w.r.t the origin of the
    // active thumb so the value does not change simply by mousing down on the
    // thumb.
    const offsetXFromCenterOfThumb = THUMB_SIZE_PX / 2 - offsetXFromLeftOfThumb;
    this.offsetXFromOriginOfActiveThumb = offsetXFromCenterOfThumb;
  }

  private calculateValueFromMouseEvent(event: MouseEvent) {
    const {left, right} = this.container.nativeElement.getBoundingClientRect();
    // Compute cursor position relative to left edge of the range-input element.
    const relativeXPx = event.clientX - left;
    // Compensate for cursor offset from origin of the active thumb.
    const compensatedRelativeXInPx =
      relativeXPx + this.offsetXFromOriginOfActiveThumb;

    let xPositionInPercent: number;
    if (this.tickCount !== null && this.tickCount > 0) {
      const tickWidthInPx = (right - left) / this.tickCount;
      const tickStuckRelativePx =
        Math.round(compensatedRelativeXInPx / tickWidthInPx) * tickWidthInPx;
      xPositionInPercent = tickStuckRelativePx / (right - left);
    } else {
      xPositionInPercent = compensatedRelativeXInPx / (right - left);
    }

    const newValue = this.getClippedValue(
      this.min + (this.max - this.min) * xPositionInPercent
    );

    // Make sure floating point arithmatic does not pollute the number with
    // noise (e.g., 0.2 + 0.1 = 0.30000000000000004; we don't want 4e-17). Clip
    // to 10th decimal.
    return Number(newValue.toFixed(10));
  }

  /**
   * Handles `mousemove` event in the document and, if dragging (mousedown on
   * thumb happened before), compute new relative position of the active thumb
   * and, if changed, event it to parent. If the left thumb is dragged past the
   * right thumb, the effect (from the user perspective) is that the left thumb
   * stays where the right thumb was, and the drag continues, moving the right
   * thumb instead.
   *
   * Implementation note: especially when `lowerValue` and `upperValue` are
   * nearby, you need to know which value is currently being changed (imagine
   * the cursor being right in between): to disambiguate, we have
   * `this.activeThumb`. However, of course, when `lowerValue` crosses
   * `upperValue`, or vice a versa, we need to update the `this.activeThumb`
   * accordingly. This is especially important because the component is a
   * "controlled component" [1] and, when props update, we do not know whether
   * `lowerValue` or `upperValue` correspond to the activeThumb (i.e., if this
   * were completely uncontrolled component, we can take initial position of the
   * thumb via prop, track DOM/position of active and inactive thumbs to
   * update/move the correct DOM).
   *
   * [1]: https://reactjs.org/docs/forms.html#controlled-components
   */
  private handleMouseMove(event: MouseEvent) {
    if (this.activeThumb === Position.NONE) {
      return;
    }

    const newValue = this.calculateValueFromMouseEvent(event);

    let nextValues: [number, number] = [this.lowerValue, this.upperValue];

    if (this.activeThumb === Position.LEFT) {
      if (newValue > this.upperValue) {
        this.activeThumb = Position.RIGHT;
      }
      nextValues = [newValue, this.upperValue];
    } else {
      if (newValue < this.lowerValue) {
        this.activeThumb = Position.LEFT;
      }
      nextValues = [this.lowerValue, newValue];
    }

    this.maybeNotifyNextRangeValues(nextValues);
    this.changeDetector.markForCheck();
  }

  private maybeNotifyNextRangeValues(minAndMax: [number, number]) {
    const [lowerValue, upperValue] = minAndMax.sort((a, b) => a - b);
    if (this.lowerValue !== lowerValue || this.upperValue !== upperValue) {
      this.rangeValuesChanged.emit({lowerValue, upperValue});
    }
  }

  private handleMouseOut(event: MouseEvent) {
    if (this.activeThumb !== Position.NONE) {
      this.activeThumb = Position.NONE;
      this.changeDetector.markForCheck();
    }
  }

  private isUpperValueRemoved(input: HTMLInputElement, position: Position) {
    return input.value === '' && position === Position.RIGHT;
  }

  private isLowerValueUpdatedOnSingleSelection(
    position: Position,
    useRangeSelectTime: boolean
  ) {
    return position === Position.LEFT && !useRangeSelectTime;
  }

  handleInputChange(event: InputEvent, position: Position) {
    const input = event.target! as HTMLInputElement;
    const numValue = this.getClippedValue(Number(input.value));
    if (isNaN(numValue)) {
      return;
    }

    // Cleans input value. If the upper value is removed, we go from range to
    // single selection. If the lower value is removed, we set it to the min
    // for both single and range seleciton.
    // For example, for min=50, max=1000,
    // range  [100, 500]  → delete upper value → single [100, X]
    // single [100, X]    → delete lower value → single [50, X]
    // range  [100, 500]  → delete lower value → range  [50, 500]
    if (this.isUpperValueRemoved(input, position)) {
      this.upperValueRemoved.emit();
      return;
    }
    if (this.isLowerValueUpdatedOnSingleSelection(position, this.useRange)) {
      this.singleValueChanged.emit(numValue);
      return;
    }

    let nextValues: [number, number] = [this.lowerValue, this.upperValue];
    if (position === Position.LEFT) {
      nextValues = [numValue, this.upperValue];
    } else {
      nextValues = [this.lowerValue, numValue];
    }
    this.maybeNotifyNextRangeValues(nextValues);
  }

  isThumbActive(position: Position) {
    return this.activeThumb === position;
  }
}

export const TEST_ONLY = {
  THUMB_SIZE_PX,
};
