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
 * Unit tests for the metric arithmetic element.
 */
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';

import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatInputModule} from '@angular/material/input';
import {MatChipsModule} from '@angular/material/chips';

import {Action, Store} from '@ngrx/store';
import {provideMockStore, MockStore} from '@ngrx/store/testing';

import {State} from '../../../../../../app_state';
import {getMetricFilters} from '../../../../store/npmi_selectors';
import * as npmiActions from '../../../../actions';
import {appStateFromNpmiState, createNpmiState} from '../../../../testing';
import {MetricArithmeticElementContainer} from './metric_arithmetic_element_container';
import {MetricArithmeticElementComponent} from './metric_arithmetic_element_component';

/** @typehack */ import * as _typeHackStore from '@ngrx/store';

describe('Npmi Metric Arithmetic Element Container', () => {
  let store: MockStore<State>;
  let dispatchedActions: Action[];
  const css = {
    FILTER_CHIP: '.filter-chip',
    ELEMENT_REMOVE: '.mat-chip-remove',
    INPUT: 'input',
    VALUE_INVALID: '.value-invalid',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        MetricArithmeticElementContainer,
        MetricArithmeticElementComponent,
      ],
      imports: [
        FormsModule,
        ReactiveFormsModule,
        MatInputModule,
        MatAutocompleteModule,
        MatChipsModule,
      ],
      providers: [
        provideMockStore({
          initialState: appStateFromNpmiState(createNpmiState()),
        }),
      ],
    }).compileComponents();

    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;

    dispatchedActions = [];
    spyOn(store, 'dispatch').and.callFake((action: Action) => {
      dispatchedActions.push(action);
    });
    store.overrideSelector(getMetricFilters, {
      'npmi@test': {max: 1.0, min: -1.0, includeNaN: false},
    });
  });

  it('renders npmi metric arithmetic element component', () => {
    const fixture = TestBed.createComponent(MetricArithmeticElementContainer);
    fixture.componentInstance.metric = 'npmi@test';
    fixture.detectChanges();

    const filterDiv = fixture.debugElement.query(By.css(css.FILTER_CHIP));
    expect(filterDiv).toBeTruthy();
  });

  it('removes metric on click on remove button', () => {
    const fixture = TestBed.createComponent(MetricArithmeticElementContainer);
    fixture.componentInstance.metric = 'npmi@test';
    fixture.detectChanges();

    const removeButton = fixture.debugElement.query(By.css(css.ELEMENT_REMOVE));
    removeButton.nativeElement.click();
    expect(dispatchedActions).toEqual([
      npmiActions.npmiRemoveMetricFilter({metric: 'npmi@test'}),
    ]);

    const inputs = fixture.debugElement.queryAll(By.css(css.INPUT));
    expect(inputs.length).toBe(2);
  });

  describe('input interaction', () => {
    describe('min input', () => {
      it('changes the filter when interacting with the input', () => {
        const fixture = TestBed.createComponent(
          MetricArithmeticElementContainer
        );
        fixture.componentInstance.metric = 'npmi@test';
        fixture.detectChanges();

        const inputs = fixture.debugElement.queryAll(By.css(css.INPUT));
        const input = inputs[0];
        input.nativeElement.focus();
        fixture.detectChanges();

        input.nativeElement.value = '0.2';
        input.nativeElement.dispatchEvent(
          new InputEvent('input', {data: '0.2'})
        );
        fixture.detectChanges();

        expect(dispatchedActions).toEqual([
          npmiActions.npmiChangeMetricFilter({
            metric: 'npmi@test',
            max: 1.0,
            min: 0.2,
            includeNaN: false,
          }),
        ]);
      });

      it('changes the filter to NaN', () => {
        const fixture = TestBed.createComponent(
          MetricArithmeticElementContainer
        );
        fixture.componentInstance.metric = 'npmi@test';
        fixture.detectChanges();

        const inputs = fixture.debugElement.queryAll(By.css(css.INPUT));
        const input = inputs[0];
        input.nativeElement.focus();
        fixture.detectChanges();

        input.nativeElement.value = 'NaN';
        input.nativeElement.dispatchEvent(
          new InputEvent('input', {data: 'NaN'})
        );
        fixture.detectChanges();

        expect(dispatchedActions).toEqual([
          npmiActions.npmiChangeMetricFilter({
            metric: 'npmi@test',
            max: 1.0,
            min: -1.0,
            includeNaN: true,
          }),
        ]);
      });

      it('does not change the filter when an incorrect value is entered', () => {
        const fixture = TestBed.createComponent(
          MetricArithmeticElementContainer
        );
        fixture.componentInstance.metric = 'npmi@test';
        fixture.detectChanges();

        const inputs = fixture.debugElement.queryAll(By.css(css.INPUT));
        const input = inputs[0];
        input.nativeElement.focus();
        fixture.detectChanges();

        input.nativeElement.value = '-';
        input.nativeElement.dispatchEvent(new InputEvent('input', {data: '-'}));
        fixture.detectChanges();

        expect(dispatchedActions).toEqual([]);

        const invalidInput = fixture.debugElement.query(
          By.css(css.VALUE_INVALID)
        );
        expect(invalidInput).toBeTruthy();
      });
    });

    describe('max input', () => {
      it('changes the filter when interacting with the input', () => {
        const fixture = TestBed.createComponent(
          MetricArithmeticElementContainer
        );
        fixture.componentInstance.metric = 'npmi@test';
        fixture.detectChanges();

        const inputs = fixture.debugElement.queryAll(By.css(css.INPUT));
        const input = inputs[1];
        input.nativeElement.focus();
        fixture.detectChanges();

        input.nativeElement.value = '0.2';
        input.nativeElement.dispatchEvent(
          new InputEvent('input', {data: '0.2'})
        );
        fixture.detectChanges();

        expect(dispatchedActions).toEqual([
          npmiActions.npmiChangeMetricFilter({
            metric: 'npmi@test',
            max: 0.2,
            min: -1.0,
            includeNaN: false,
          }),
        ]);
      });

      it('does not change the filter when a value is entered that does not go with the min value', () => {
        const fixture = TestBed.createComponent(
          MetricArithmeticElementContainer
        );
        fixture.componentInstance.metric = 'npmi@test';
        fixture.detectChanges();

        const inputs = fixture.debugElement.queryAll(By.css(css.INPUT));
        const input = inputs[1];
        input.nativeElement.focus();
        fixture.detectChanges();

        input.nativeElement.value = 'NaN';
        input.nativeElement.dispatchEvent(
          new InputEvent('input', {data: 'NaN'})
        );
        fixture.detectChanges();

        expect(dispatchedActions).toEqual([]);

        const invalidInput = fixture.debugElement.query(
          By.css(css.VALUE_INVALID)
        );
        expect(invalidInput).toBeTruthy();
      });
    });
  });
});
