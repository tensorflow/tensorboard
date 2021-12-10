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
 * Unit tests for the data selection.
 */
import {NO_ERRORS_SCHEMA} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {State} from '../../../../app_state';
import {createCoreState, createState} from '../../../../core/testing';
import {appStateFromNpmiState, createNpmiState} from '../../testing';
import {DataSelectionComponent} from './data_selection_component';

describe('Npmi Data Selection Container', () => {
  let store: MockStore<State>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DataSelectionComponent],
      imports: [],
      providers: [
        provideMockStore({
          initialState: {
            ...createState(createCoreState()),
            ...appStateFromNpmiState(createNpmiState()),
          },
        }),
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
  });

  it('renders npmi data selection component', () => {
    const fixture = TestBed.createComponent(DataSelectionComponent);
    fixture.detectChanges();

    const metricSearchElement = fixture.debugElement.query(
      By.css('npmi-metric-search')
    );
    expect(metricSearchElement).toBeTruthy();
  });
});
