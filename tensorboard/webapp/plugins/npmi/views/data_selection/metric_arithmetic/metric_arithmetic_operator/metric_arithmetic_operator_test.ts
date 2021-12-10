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
/**
 * Unit tests for the metric arithmetic operator.
 */
import {NO_ERRORS_SCHEMA} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {Operator} from '../../../../store/npmi_types';
import {MetricArithmeticOperatorComponent} from './metric_arithmetic_operator_component';

describe('Npmi Metric Arithmetic Operator Component', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MetricArithmeticOperatorComponent],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  it('renders AND operator correctly', () => {
    const fixture = TestBed.createComponent(MetricArithmeticOperatorComponent);
    fixture.componentInstance.operator = Operator.AND;
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('&');
  });
});
