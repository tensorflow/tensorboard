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
 * Unit tests for the metric arithmetic.
 */
import {NO_ERRORS_SCHEMA} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {State} from '../../../../../app_state';
import {ArithmeticKind, Operator} from '../../../store/npmi_types';
import {appStateFromNpmiState, createNpmiState} from '../../../testing';
import {
  getMetricArithmetic,
  getMetricFilters,
} from './../../../store/npmi_selectors';
import {MetricArithmeticComponent} from './metric_arithmetic_component';
import {MetricArithmeticContainer} from './metric_arithmetic_container';

describe('Npmi Metric Arithmetic Container', () => {
  let store: MockStore<State>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MetricArithmeticComponent, MetricArithmeticContainer],
      imports: [],
      providers: [
        provideMockStore({
          initialState: appStateFromNpmiState(createNpmiState()),
        }),
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
  });

  afterEach(() => {
    store?.resetSelectors();
  });

  it('renders no metrics when none active', () => {
    const fixture = TestBed.createComponent(MetricArithmeticContainer);
    fixture.detectChanges();

    const metricArithmeticElement = fixture.debugElement.query(
      By.css('npmi-metric-arithmetic-element')
    );
    expect(metricArithmeticElement).toBeFalsy();
  });

  it('renders a metric when one is active', () => {
    store.overrideSelector(getMetricArithmetic, [
      {kind: ArithmeticKind.METRIC, metric: 'test_metric'},
    ]);
    store.overrideSelector(getMetricFilters, {
      test_metric: {max: 1.0, min: -1.0, includeNaN: false},
    });
    const fixture = TestBed.createComponent(MetricArithmeticContainer);
    fixture.detectChanges();

    const metricArithmeticElement = fixture.debugElement.query(
      By.css('npmi-metric-arithmetic-element')
    );
    expect(metricArithmeticElement).toBeTruthy();
  });

  it('renders metrics when at least two active', () => {
    store.overrideSelector(getMetricArithmetic, [
      {kind: ArithmeticKind.METRIC, metric: 'test_metric'},
      {kind: ArithmeticKind.OPERATOR, operator: Operator.AND},
      {kind: ArithmeticKind.METRIC, metric: 'test_metric_2'},
    ]);
    store.overrideSelector(getMetricFilters, {
      test_metric: {max: 1.0, min: -1.0, includeNaN: false},
      test_metric_2: {max: 1.0, min: -1.0, includeNaN: false},
    });
    const fixture = TestBed.createComponent(MetricArithmeticContainer);
    fixture.detectChanges();

    const metricArithmeticElement = fixture.debugElement.query(
      By.css('npmi-metric-arithmetic-element')
    );
    expect(metricArithmeticElement).toBeTruthy();
    const metricArithmeticOperator = fixture.debugElement.query(
      By.css('npmi-metric-arithmetic-operator')
    );
    expect(metricArithmeticOperator).toBeTruthy();
  });
});
