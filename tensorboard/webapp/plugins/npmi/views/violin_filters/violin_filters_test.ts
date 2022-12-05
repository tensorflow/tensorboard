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
 * Unit tests for the violin filters.
 */
import {NO_ERRORS_SCHEMA} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {Action, Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {State} from '../../../../app_state';
import {createCoreState, createState} from '../../../../core/testing';
import * as npmiActions from '../../actions';
import {getMetricFilters, getSidebarExpanded} from '../../store';
import {appStateFromNpmiState, createNpmiState} from '../../testing';
import {ViolinFiltersComponent} from './violin_filters_component';
import {ViolinFiltersContainer} from './violin_filters_container';

describe('Npmi Violin Filters Container', () => {
  let store: MockStore<State>;
  let dispatchedActions: Action[];
  const css = {
    FILTERS_TOOLBAR: By.css('.filters-toolbar'),
    SIDE_TOGGLE: By.css('.side-toggle'),
    BUTTON: By.css('button'),
    FILTERS_HINT: By.css('.filters-hint'),
    VIOLIN_FILTERS: By.css('npmi-violin-filter'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ViolinFiltersContainer, ViolinFiltersComponent],
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

    dispatchedActions = [];
    spyOn(store, 'dispatch').and.callFake((action: Action) => {
      dispatchedActions.push(action);
    });
  });

  afterEach(() => {
    store?.resetSelectors();
  });

  it('renders npmi violin filters component without filters', () => {
    store.overrideSelector(getMetricFilters, {});
    const fixture = TestBed.createComponent(ViolinFiltersContainer);
    fixture.detectChanges();

    const violinFilters = fixture.debugElement.query(css.FILTERS_TOOLBAR);
    expect(violinFilters).toBeTruthy();

    const filters = fixture.debugElement.queryAll(css.VIOLIN_FILTERS);
    expect(filters.length).toBe(0);

    const filterHint = fixture.debugElement.query(css.FILTERS_HINT);
    expect(filterHint).toBeTruthy();
  });

  it('renders npmi violin filters component with filters', () => {
    store.overrideSelector(getMetricFilters, {
      filter_1: {max: 1.0, min: -1.0, includeNaN: false},
      filter_2: {max: 1.0, min: -1.0, includeNaN: false},
    });
    const fixture = TestBed.createComponent(ViolinFiltersContainer);
    fixture.detectChanges();

    const violinFilters = fixture.debugElement.query(css.FILTERS_TOOLBAR);
    expect(violinFilters).toBeTruthy();

    const filters = fixture.debugElement.queryAll(css.VIOLIN_FILTERS);
    expect(filters.length).toBe(2);

    const filterHint = fixture.debugElement.query(css.FILTERS_HINT);
    expect(filterHint).toBeNull();
  });

  it('dispatches toggle expanded action when hide button clicked', () => {
    store.overrideSelector(getSidebarExpanded, true);
    const fixture = TestBed.createComponent(ViolinFiltersContainer);
    fixture.detectChanges();

    const sideToggle = fixture.debugElement.query(css.SIDE_TOGGLE);
    expect(sideToggle).toBeTruthy();
    const hideButton = sideToggle.query(css.BUTTON);
    expect(hideButton).toBeTruthy();
    hideButton.nativeElement.click();

    expect(dispatchedActions).toEqual([
      npmiActions.npmiToggleSidebarExpanded(),
    ]);
  });
});
