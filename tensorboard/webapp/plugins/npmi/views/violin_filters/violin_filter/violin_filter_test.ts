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
 * Unit tests for a violin filter.
 */
import {NO_ERRORS_SCHEMA} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {Action, Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {State} from '../../../../../app_state';
import {createCoreState, createState} from '../../../../../core/testing';
import * as selectors from '../../../../../selectors';
import {getCurrentRouteRunSelection} from '../../../../../selectors';
import * as npmiActions from '../../../actions';
import {getAnnotationData} from '../../../store';
import {appStateFromNpmiState, createNpmiState} from '../../../testing';
import {ViolinFilterComponent} from './violin_filter_component';
import {ViolinFilterContainer} from './violin_filter_container';

describe('Npmi Violin Filter Container', () => {
  let store: MockStore<State>;
  let dispatchedActions: Action[];
  let fixture: ComponentFixture<ViolinFilterContainer>;
  const css = {
    CHART_CONTAINER: By.css('.chart-container'),
    REMOVE_BUTTON: By.css('button'),
    HEADING: By.css('.chart-heading'),
    CHART: By.css('.chart'),
    VIOLIN_PLOTS: By.css('.violin-plot'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ViolinFilterContainer, ViolinFilterComponent],
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

    store.overrideSelector(
      getCurrentRouteRunSelection,
      new Map([
        ['run_1', true],
        ['run_2', false],
        ['run_3', true],
      ])
    );
    store.overrideSelector(getAnnotationData, {
      annotation_1: [
        {
          annotation: 'annotation_1',
          metric: 'test',
          run: 'run_1',
          nPMIValue: 0.5178,
          countValue: 100,
        },
        {
          annotation: 'annotation_1',
          metric: 'test',
          run: 'run_2',
          nPMIValue: 0.02157,
          countValue: 101,
        },
        {
          annotation: 'annotation_1',
          metric: 'test',
          run: 'run_3',
          nPMIValue: -0.1,
          countValue: 53,
        },
      ],
      annotation_2: [
        {
          annotation: 'annotation_2',
          metric: 'test',
          run: 'run_1',
          nPMIValue: -0.5178,
          countValue: 572,
        },
        {
          annotation: 'annotation_2',
          metric: 'test',
          run: 'run_2',
          nPMIValue: 0.351,
          countValue: 101,
        },
        {
          annotation: 'annotation_2',
          metric: 'test',
          run: 'run_3',
          nPMIValue: 0.1,
          countValue: 53,
        },
      ],
    });
    store.overrideSelector(selectors.getRunColorMap, {
      run_1: '#000',
      run_2: '#AAA',
      run_3: '#FFF',
    });
    fixture = TestBed.createComponent(ViolinFilterContainer);
    fixture.componentInstance.metricName = 'nPMI@test';
    fixture.componentInstance.filter = {
      max: 1.0,
      min: -1.0,
      includeNaN: false,
    };
    fixture.detectChanges();
  });

  afterEach(() => {
    store?.resetSelectors();
  });

  it('renders npmi violin filter component', () => {
    const chartContainer = fixture.debugElement.query(css.CHART_CONTAINER);
    expect(chartContainer).toBeTruthy();

    const removeButton = fixture.debugElement.queryAll(css.REMOVE_BUTTON);
    expect(removeButton).toBeTruthy();

    const chartHeading = fixture.debugElement.query(css.HEADING);
    expect(chartHeading).toBeTruthy();
    expect(chartHeading.nativeElement.textContent.trim()).toBe('nPMI@test');

    const chart = fixture.debugElement.query(css.CHART);
    expect(chart).toBeTruthy();
  });

  it('renders one plot per active run', () => {
    const plots = fixture.debugElement.queryAll(css.VIOLIN_PLOTS);
    expect(plots.length).toBe(2);
  });

  it('dispatches removeFilter action when button clicked', () => {
    const removeButton = fixture.debugElement.query(css.REMOVE_BUTTON);
    expect(removeButton).toBeTruthy();
    removeButton.nativeElement.click();

    expect(dispatchedActions).toEqual([
      npmiActions.npmiRemoveMetricFilter({metric: 'nPMI@test'}),
    ]);
  });
});
