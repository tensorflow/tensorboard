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
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import {FormControl, ValidationErrors, Validators} from '@angular/forms';
import {Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';

@Component({
  selector: 'metric-arithmetic-element-component',
  templateUrl: './metric_arithmetic_element_component.ng.html',
  styleUrls: ['./metric_arithmetic_element_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricArithmeticElementComponent
  implements OnInit, OnDestroy, OnChanges
{
  @Input() metric!: string;
  @Input() filterValues!: {min: number; max: number};
  @Input() hasEmbeddingsData!: boolean;
  @Input() embeddingsMetric!: string;
  @Output() onRemove = new EventEmitter<string>();
  @Output() onSelect = new EventEmitter<string>();
  @Output() onFilterChange = new EventEmitter<{min: number; max: number}>();
  focusMin = false;
  focusMax = false;
  private ngUnsubscribe = new Subject<void>();
  minFormControl!: FormControl;
  maxFormControl!: FormControl;

  ngOnInit() {
    this.minFormControl = new FormControl(this.filterValues.min, [
      Validators.required,
      Validators.min(-1.0),
      Validators.max(1.0),
      this.minValueValidator.bind(this),
    ]);
    this.maxFormControl = new FormControl(this.filterValues.max, [
      Validators.required,
      Validators.min(-1.0),
      Validators.max(1.0),
      this.maxValueValidator.bind(this),
    ]);

    this.minFormControl.valueChanges
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        if (this.minFormControl.valid && this.maxFormControl.valid) {
          this.onFilterChange.emit({
            min: parseFloat(this.minFormControl.value),
            max: parseFloat(this.maxFormControl.value),
          });
        }
      });
    this.maxFormControl.valueChanges
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        if (this.minFormControl.valid && this.maxFormControl.valid) {
          this.onFilterChange.emit({
            min: parseFloat(this.minFormControl.value),
            max: parseFloat(this.maxFormControl.value),
          });
        }
      });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.minFormControl && this.maxFormControl) {
      this.minFormControl.setValue(this.filterValues.min, {emitEvent: false});
      this.maxFormControl.setValue(this.filterValues.max, {emitEvent: false});
    }
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  minValueValidator(
    this: MetricArithmeticElementComponent,
    control: FormControl
  ): ValidationErrors | null {
    if (!this.maxFormControl || control.value === 'NaN') {
      return null;
    } else if (isNaN(parseFloat(control.value))) {
      return {value: 'the string you entered is neither NaN nor a number'};
    } else if (
      parseFloat(control.value) > parseFloat(this.maxFormControl.value)
    ) {
      return {value: 'the number you entered is larger than the max value'};
    }
    return null;
  }

  maxValueValidator(
    this: MetricArithmeticElementComponent,
    control: FormControl
  ): ValidationErrors | null {
    if (!this.minFormControl) {
      return null;
    } else if (
      // Max NaN only if min also NaN
      this.minFormControl.value === 'NaN' &&
      control.value === 'NaN'
    ) {
      return null;
    } else if (isNaN(parseFloat(control.value))) {
      return {value: 'the string you entered is neither NaN nor a number'};
    } else if (control.value < this.minFormControl.value) {
      return {value: 'the number you entered is smaller than the min value'};
    }
    return null;
  }

  getErrorDescription(errors: ValidationErrors | null): string {
    if (errors) {
      const firstKey = Object.keys(errors)[0];
      if (firstKey === 'required') {
        return 'you did not enter anything';
      } else if (firstKey === 'min') {
        return 'the number must be at least -1.0';
      } else if (firstKey === 'max') {
        return 'the number is bigger than 1.0';
      }
      return errors[firstKey];
    }
    return '';
  }
}
