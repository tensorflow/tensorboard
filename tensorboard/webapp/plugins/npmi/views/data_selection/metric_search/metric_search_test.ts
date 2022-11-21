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
import {OverlayContainer} from '@angular/cdk/overlay';
import {CommonModule} from '@angular/common';
import {DebugElement, getDebugNode, NO_ERRORS_SCHEMA} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {FormsModule} from '@angular/forms';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatInputModule} from '@angular/material/input';
import {By} from '@angular/platform-browser';
import {Action, Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {State} from '../../../../../app_state';
import {getCurrentRouteRunSelection} from '../../../../../selectors';
import * as npmiActions from '../../../actions';
import {appStateFromNpmiState, createNpmiState} from '../../../testing';
import {
  getMetricFilters,
  getMetricsRegex,
  getRunToMetrics,
} from './../../../store/npmi_selectors';
import {MetricSearchComponent} from './metric_search_component';
import {MetricSearchContainer} from './metric_search_container';

describe('Npmi Metric Search Container', () => {
  let store: MockStore<State>;
  let dispatchedActions: Action[];
  let overlayContainer: OverlayContainer;
  const css = {
    INPUT: By.css('input'),
    ERROR_ICON: By.css('.error-icon'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MetricSearchComponent, MetricSearchContainer],
      imports: [
        CommonModule,
        FormsModule,
        MatInputModule,
        MatAutocompleteModule,
      ],
      providers: [
        provideMockStore({
          initialState: appStateFromNpmiState(createNpmiState()),
        }),
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    overlayContainer = TestBed.inject(OverlayContainer);
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;

    dispatchedActions = [];
    spyOn(store, 'dispatch').and.callFake((action: Action) => {
      dispatchedActions.push(action);
    });

    store.overrideSelector(
      getCurrentRouteRunSelection,
      new Map([
        ['run1', true],
        ['run2', true],
      ])
    );
    store.overrideSelector(getRunToMetrics, {
      run1: ['metric_1', 'metric_2'],
      run2: ['metric_1'],
    });
  });

  afterEach(() => {
    store?.resetSelectors();
  });

  it('renders npmi metrics search component', () => {
    const fixture = TestBed.createComponent(MetricSearchContainer);
    fixture.detectChanges();

    const filterDiv = fixture.debugElement.query(css.INPUT);
    expect(filterDiv).toBeTruthy();
  });

  describe('input interaction', () => {
    it('dispatches changeMetricRegex when typing on input', () => {
      const fixture = TestBed.createComponent(MetricSearchContainer);
      fixture.detectChanges();

      const input = fixture.debugElement.query(css.INPUT);
      input.nativeElement.focus();
      fixture.detectChanges();

      input.nativeElement.value = 'a';
      input.nativeElement.dispatchEvent(new InputEvent('input', {data: 'a'}));
      fixture.detectChanges();

      expect(dispatchedActions).toEqual([
        npmiActions.npmiMetricsRegexChanged({regex: 'a'}),
      ]);
    });
  });

  describe('autocomplete', () => {
    it('shows all metrics on focus', () => {
      const fixture = TestBed.createComponent(MetricSearchContainer);
      fixture.detectChanges();

      const input = fixture.debugElement.query(css.INPUT);
      input.nativeElement.focus();
      fixture.detectChanges();

      const optionElements = overlayContainer
        .getContainerElement()
        .querySelectorAll('mat-option');
      const options = Array.from(optionElements).map(
        (optionEl: Element): DebugElement =>
          getDebugNode(optionEl) as DebugElement
      );

      expect(options.map((option) => option.nativeElement.textContent)).toEqual(
        ['metric_1', 'metric_2']
      );
    });

    it('shows remaining metrics if some are already filtered for', () => {
      store.overrideSelector(getMetricFilters, {
        metric_1: {max: 1.0, min: -1.0, includeNaN: false},
      });
      const fixture = TestBed.createComponent(MetricSearchContainer);
      fixture.detectChanges();

      const input = fixture.debugElement.query(css.INPUT);
      input.nativeElement.focus();
      fixture.detectChanges();

      const optionElements = overlayContainer
        .getContainerElement()
        .querySelectorAll('mat-option');
      const options = Array.from(optionElements).map(
        (optionEl: Element): DebugElement =>
          getDebugNode(optionEl) as DebugElement
      );

      expect(options.map((option) => option.nativeElement.textContent)).toEqual(
        ['metric_2']
      );
    });

    it('renders empty when no metrics match', () => {
      store.overrideSelector(getMetricsRegex, 'YOU CANNOT MATCH ME');
      const fixture = TestBed.createComponent(MetricSearchContainer);
      fixture.detectChanges();

      const input = fixture.debugElement.query(css.INPUT);
      input.nativeElement.focus();
      fixture.detectChanges();

      const optionElements = overlayContainer
        .getContainerElement()
        .querySelectorAll('mat-option');
      const options = Array.from(optionElements).map(
        (optionEl: Element): DebugElement =>
          getDebugNode(optionEl) as DebugElement
      );

      expect(options.map((option) => option.nativeElement.textContent)).toEqual(
        []
      );
    });

    it('filters by regex, case-insensitive', () => {
      store.overrideSelector(getMetricsRegex, '[A-Z]+_1');
      const fixture = TestBed.createComponent(MetricSearchContainer);
      fixture.detectChanges();

      const input = fixture.debugElement.query(css.INPUT);
      input.nativeElement.focus();
      fixture.detectChanges();

      const optionElements = overlayContainer
        .getContainerElement()
        .querySelectorAll('mat-option');
      const options = Array.from(optionElements).map(
        (optionEl: Element): DebugElement =>
          getDebugNode(optionEl) as DebugElement
      );

      expect(options.map((option) => option.nativeElement.textContent)).toEqual(
        ['metric_1']
      );
    });

    it('responds to input changes', () => {
      const fixture = TestBed.createComponent(MetricSearchContainer);
      fixture.detectChanges();

      const input = fixture.debugElement.query(css.INPUT);
      input.nativeElement.focus();
      fixture.detectChanges();

      store.overrideSelector(getMetricsRegex, '2$');
      store.refreshState();
      fixture.detectChanges();

      const optionElements = overlayContainer
        .getContainerElement()
        .querySelectorAll('mat-option');
      const options = Array.from(optionElements).map(
        (optionEl: Element): DebugElement =>
          getDebugNode(optionEl) as DebugElement
      );

      expect(options.map((option) => option.nativeElement.textContent)).toEqual(
        ['metric_2']
      );
    });

    it('dispatches action when selecting an option', () => {
      const fixture = TestBed.createComponent(MetricSearchContainer);
      fixture.detectChanges();

      const input = fixture.debugElement.query(css.INPUT);
      input.nativeElement.focus();
      fixture.detectChanges();

      const optionElements = overlayContainer
        .getContainerElement()
        .querySelectorAll('mat-option');
      const options = Array.from(optionElements).map(
        (optionEl: Element): DebugElement =>
          getDebugNode(optionEl) as DebugElement
      );
      options[0].nativeElement.click();

      expect(dispatchedActions).toEqual([
        npmiActions.npmiAddMetricFilter({metric: 'metric_1'}),
        npmiActions.npmiMetricsRegexChanged({regex: ''}),
      ]);
    });

    it('shows error icon for an invalid regex', () => {
      store.overrideSelector(getMetricsRegex, '*');
      const fixture = TestBed.createComponent(MetricSearchContainer);
      fixture.detectChanges();

      expect(fixture.debugElement.query(css.ERROR_ICON)).not.toBeNull();
    });
  });
});
