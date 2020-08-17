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
 * Unit tests for the Metric Search.
 */
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {FormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';

import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatInputModule} from '@angular/material/input';

import {Store} from '@ngrx/store';
import {provideMockStore, MockStore} from '@ngrx/store/testing';

import {State} from '../../../../../app_state';
import {getRunSelection} from '../../../../../core/store/core_selectors';
import {
  getMetricFilters,
  getMetricsRegex,
  getRunToMetrics,
} from './../../../store/npmi_selectors';
import {appStateFromNpmiState, createNpmiState} from '../../../testing';
import {MatIconTestingModule} from '../../../../../testing/mat_icon.module';

import {MetricSearchComponent} from './metric_search_component';
import {MetricSearchContainer} from './metric_search_container';

/** @typehack */ import * as _typeHackStore from '@ngrx/store';

describe('Npmi Metric Search Container', () => {
  let store: MockStore<State>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MetricSearchComponent, MetricSearchContainer],
      imports: [
        CommonModule,
        FormsModule,
        MatInputModule,
        MatAutocompleteModule,
        MatIconTestingModule,
      ],
      providers: [
        provideMockStore({
          initialState: appStateFromNpmiState(createNpmiState()),
        }),
      ],
    }).compileComponents();
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    store.overrideSelector(getRunSelection, new Map([['run_1', true]]));
    store.overrideSelector(getMetricsRegex, '');
    store.overrideSelector(getRunToMetrics, {
      run1: ['metric_1', 'metric_2'],
      run2: ['metric_1'],
    });
    store.overrideSelector(getMetricFilters, {
      metric_1: {max: 1.0, min: -1.0, includeNaN: false},
    });
  });

  it('renders npmi metrics search component', () => {
    const fixture = TestBed.createComponent(MetricSearchContainer);
    fixture.detectChanges();

    const filterDiv = fixture.debugElement.query(By.css('input'));
    expect(filterDiv).toBeTruthy();
  });
});
