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
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {State} from '../../../../../app_state';
import {createCoreState, createState} from '../../../../../core/testing';
import {
  getCurrentRouteRunSelection,
  getRunColorMap,
} from '../../../../../selectors';
import {
  getAnnotationData,
  getMetricFilters,
  getRunToMetrics,
  getSelectedAnnotations,
} from '../../../store';
import {appStateFromNpmiState, createNpmiState} from '../../../testing';
import {ParallelCoordinatesComponent} from './parallel_coordinates_component';
import {ParallelCoordinatesContainer} from './parallel_coordinates_container';

describe('Npmi Parallel Coordinates Container', () => {
  let store: MockStore<State>;
  const css = {
    PC_CHART: By.css('.pc-chart'),
    AXES: By.css('.axis-y'),
    AXIS_LABELS: By.css('.axis-text'),
    AXIS_BG_LABELS: By.css('.axis-bg-text'),
    COORDINATES: By.css('.coord'),
    COORDINATES_BG: By.css('.hiddenCoord'),
    COORDINATE_LABELS: By.css('.coordinate-label'),
  };
  const annotationData = {
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
        metric: 'other',
        run: 'run_1',
        nPMIValue: -0.1,
        countValue: 53,
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
      {
        annotation: 'annotation_1',
        metric: 'other',
        run: 'run_3',
        nPMIValue: -0.1,
        countValue: 53,
      },
      {
        annotation: 'annotation_1',
        metric: '(test - other)',
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
        nPMIValue: null,
        countValue: 572,
      },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        ParallelCoordinatesComponent,
        ParallelCoordinatesContainer,
      ],
      providers: [
        provideMockStore({
          initialState: {
            ...createState(createCoreState()),
            ...appStateFromNpmiState(createNpmiState()),
          },
        }),
      ],
    }).compileComponents();
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
  });

  afterEach(() => {
    store?.resetSelectors();
  });

  it('renders parallel coordinates without selected annoations', () => {
    store.overrideSelector(
      getCurrentRouteRunSelection,
      new Map([
        ['run_1', true],
        ['run_2', false],
        ['run_3', true],
      ])
    );
    store.overrideSelector(getAnnotationData, annotationData);
    store.overrideSelector(getRunToMetrics, {
      run_1: ['nPMI@test', 'nPMI@other'],
      run_2: ['nPMI@test'],
      run_3: ['nPMI@test', 'nPMI@other', 'nPMI_diff@(test - other)'],
    });
    store.overrideSelector(getRunColorMap, {
      run_1: '#000',
      run_2: '#AAA',
      run_3: '#FFF',
    });
    const fixture = TestBed.createComponent(ParallelCoordinatesContainer);
    fixture.detectChanges();

    const pcChart = fixture.debugElement.query(css.PC_CHART);
    expect(pcChart).toBeTruthy();

    const axes = fixture.debugElement.queryAll(css.AXES);
    expect(axes.length).toBe(2);

    const axisLabels = fixture.debugElement.queryAll(css.AXIS_LABELS);
    expect(axisLabels.length).toBe(2);

    const axisBackgroundLabels = fixture.debugElement.queryAll(
      css.AXIS_BG_LABELS
    );
    expect(axisBackgroundLabels.length).toBe(2);

    const coordinates = fixture.debugElement.queryAll(css.COORDINATES);
    expect(coordinates.length).toBe(0);

    const coordinatesBackground = fixture.debugElement.queryAll(
      css.COORDINATES_BG
    );
    expect(coordinatesBackground.length).toBe(0);

    const coordinateLabels = fixture.debugElement.queryAll(
      css.COORDINATE_LABELS
    );
    expect(coordinateLabels.length).toBe(0);
  });

  it('renders parallel coordinates with selected annoations', () => {
    store.overrideSelector(
      getCurrentRouteRunSelection,
      new Map([
        ['run_1', true],
        ['run_2', false],
        ['run_3', true],
      ])
    );
    store.overrideSelector(getAnnotationData, annotationData);
    store.overrideSelector(getSelectedAnnotations, ['annotation_1']);
    store.overrideSelector(getRunToMetrics, {
      run_1: ['nPMI@test', 'nPMI@other'],
      run_2: ['nPMI@test'],
      run_3: ['nPMI@test', 'nPMI@other', 'nPMI_diff@(test - other)'],
    });
    store.overrideSelector(getRunColorMap, {
      run_1: '#000',
      run_2: '#AAA',
      run_3: '#FFF',
    });
    const fixture = TestBed.createComponent(ParallelCoordinatesContainer);
    fixture.detectChanges();

    const pcChart = fixture.debugElement.query(css.PC_CHART);
    expect(pcChart).toBeTruthy();

    const axes = fixture.debugElement.queryAll(css.AXES);
    expect(axes.length).toBe(2);

    const axisLabels = fixture.debugElement.queryAll(css.AXIS_LABELS);
    expect(axisLabels.length).toBe(2);

    const axisBackgroundLabels = fixture.debugElement.queryAll(
      css.AXIS_BG_LABELS
    );
    expect(axisBackgroundLabels.length).toBe(2);

    const coordinates = fixture.debugElement.queryAll(css.COORDINATES);
    expect(coordinates.length).toBe(2);

    const coordinatesBackground = fixture.debugElement.queryAll(
      css.COORDINATES_BG
    );
    expect(coordinatesBackground.length).toBe(2);

    const coordinateLabels = fixture.debugElement.queryAll(
      css.COORDINATE_LABELS
    );
    expect(coordinateLabels.length).toBe(2);
  });

  it('renders parallel coordinates with additional metric filter', () => {
    store.overrideSelector(
      getCurrentRouteRunSelection,
      new Map([
        ['run_1', true],
        ['run_2', false],
        ['run_3', true],
      ])
    );
    store.overrideSelector(getAnnotationData, annotationData);
    store.overrideSelector(getSelectedAnnotations, ['annotation_1']);
    store.overrideSelector(getRunToMetrics, {
      run_1: ['nPMI@test', 'nPMI@other'],
      run_2: ['nPMI@test'],
      run_3: ['nPMI@test', 'nPMI@other', 'nPMI_diff@(test - other)'],
    });
    store.overrideSelector(getMetricFilters, {
      'nPMI_diff@(test - other)': {max: 1.0, min: -1.0, includeNaN: false},
    });
    store.overrideSelector(getRunColorMap, {
      run_1: '#000',
      run_2: '#AAA',
      run_3: '#FFF',
    });
    const fixture = TestBed.createComponent(ParallelCoordinatesContainer);
    fixture.detectChanges();

    const pcChart = fixture.debugElement.query(css.PC_CHART);
    expect(pcChart).toBeTruthy();

    const axes = fixture.debugElement.queryAll(css.AXES);
    expect(axes.length).toBe(3);

    const axisLabels = fixture.debugElement.queryAll(css.AXIS_LABELS);
    expect(axisLabels.length).toBe(3);

    const axisBackgroundLabels = fixture.debugElement.queryAll(
      css.AXIS_BG_LABELS
    );
    expect(axisBackgroundLabels.length).toBe(3);

    const coordinates = fixture.debugElement.queryAll(css.COORDINATES);
    expect(coordinates.length).toBe(2);

    const coordinatesBackground = fixture.debugElement.queryAll(
      css.COORDINATES_BG
    );
    expect(coordinatesBackground.length).toBe(2);

    const coordinateLabels = fixture.debugElement.queryAll(
      css.COORDINATE_LABELS
    );
    expect(coordinateLabels.length).toBe(2);
  });
});
