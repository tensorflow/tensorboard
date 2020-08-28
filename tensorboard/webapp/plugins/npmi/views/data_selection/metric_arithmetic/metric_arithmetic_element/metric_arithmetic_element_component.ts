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
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import {Validators, FormControl, ValidationErrors} from '@angular/forms';

@Component({
  selector: 'metric-arithmetic-element-component',
  templateUrl: './metric_arithmetic_element_component.ng.html',
  styleUrls: ['./metric_arithmetic_element_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricArithmeticElementComponent {
  @Input() metric!: string;
  @Input() filterValues!: {min: string; max: string};
  @Output() onRemove = new EventEmitter<string>();
  @Output() onFilterChange = new EventEmitter<{min: number; max: number}>();
  focusMin = false;
  focusMax = false;
  minFilterValid = true;
  maxFilterValid = true;

  readonly minFormControl = new FormControl(-1.0, [
    Validators.required,
    Validators.min(-1.0),
    Validators.max(1.0),
    this.minValueValidator.bind(this),
  ]);

  readonly maxFormControl = new FormControl(1.0, [
    Validators.required,
    Validators.min(-1.0),
    Validators.max(1.0),
    this.maxValueValidator.bind(this),
  ]);

  constructor() {
    this.minFormControl.valueChanges.subscribe(() => {
      if (this.minFormControl.valid && this.maxFormControl.valid) {
        this.onFilterChange.emit({
          min: parseFloat(this.minFormControl.value),
          max: parseFloat(this.maxFormControl.value),
        });
      }
    });
    this.maxFormControl.valueChanges.subscribe(() => {
      if (this.minFormControl.valid && this.maxFormControl.valid) {
        this.onFilterChange.emit({
          min: parseFloat(this.minFormControl.value),
          max: parseFloat(this.maxFormControl.value),
        });
      }
    });
  }

  minValueValidator(
    this: MetricArithmeticElementComponent,
    control: FormControl
  ): ValidationErrors | null {
    if (!this.maxFormControl || control.value === 'NaN') {
      return null;
    } else if (isNaN(parseFloat(control.value))) {
      return {value: 'the value you entered is neither NaN nor a number'};
    } else if (
      parseFloat(control.value) > parseFloat(this.maxFormControl.value)
    ) {
      return {value: 'the value you entered is larger than the max value'};
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
      this.maxFormControl.value === 'NaN'
    ) {
      return null;
    } else if (isNaN(parseFloat(control.value))) {
      return {value: 'the value you entered is neither NaN nor a number'};
    } else if (control.value < this.minFormControl.value) {
      return {value: 'the value you entered is smaller than the min value'};
    }
    return null;
  }

  onValueChange(event: any) {
    event.stopPropagation();
  }
}
