/* Copyright 2019 The TensorFlow Authors. All Rights Reserved.

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
import * as actions from '../actions';
import {reducers} from './npmi_reducers';
import {DataLoadState} from './npmi_types';
import {createNpmiState} from '../testing';

describe('Annotations loading', () => {
  it('sets annotationsLoaded to loading on requesting annotations', () => {
    const state = createNpmiState();
    const nextState = reducers(state, actions.npmiAnnotationsRequested());
    expect(nextState.annotationsLoaded.state).toBe(DataLoadState.LOADING);
    expect(nextState.annotationsLoaded.lastLoadedTimeInMs).toBeNull();
  });

  it('set annotationsLoaded to failed on request failure', () => {
    const state = createNpmiState({
      annotationsLoaded: {
        state: DataLoadState.LOADING,
        lastLoadedTimeInMs: null,
      },
    });
    const nextState = reducers(state, actions.npmiAnnotationsRequestFailed());
    expect(nextState.annotationsLoaded.state).toBe(DataLoadState.FAILED);
    expect(nextState.annotationsLoaded.lastLoadedTimeInMs).toBeNull();
  });

  it('sets annotationsLoaded & annotations on successful load', () => {
    const state = createNpmiState();
    const t0 = Date.now();
    const nextState = reducers(
      state,
      actions.npmiAnnotationsLoaded({
        annotations: {
          run_1: ['annotation_1', 'annotation_2'],
        },
      })
    );
    expect(nextState.annotationsLoaded.state).toBe(DataLoadState.LOADED);
    expect(
      nextState.annotationsLoaded.lastLoadedTimeInMs
    ).toBeGreaterThanOrEqual(t0);
    expect(nextState.annotationsData).toEqual({
      run_1: ['annotation_1', 'annotation_2'],
    });
  });

  it('Overrides existing annotations on successful annotations loading', () => {
    const state = createNpmiState({
      annotationsData: {
        run_1: ['annotation_1', 'annotation_2'],
      },
      annotationsLoaded: {
        state: DataLoadState.LOADED,
        lastLoadedTimeInMs: 0,
      },
    });
    const t0 = Date.now();
    const nextState = reducers(
      state,
      actions.npmiAnnotationsLoaded({
        annotations: {
          run_1: ['annotation_new_1', 'annotation_new_2'],
        },
      })
    );
    expect(nextState.annotationsLoaded.state).toBe(DataLoadState.LOADED);
    expect(
      nextState.annotationsLoaded.lastLoadedTimeInMs
    ).toBeGreaterThanOrEqual(t0);
    expect(nextState.annotationsData).toEqual({
      run_1: ['annotation_new_1', 'annotation_new_2'],
    });
  });
});

describe('Metrics and Values loading', () => {
  it('sets metricsAndValuesLoaded to loading on requesting', () => {
    const state = createNpmiState();
    const nextState = reducers(state, actions.npmiMetricsAndValuesRequested());
    expect(nextState.metricsAndValuesLoaded.state).toBe(DataLoadState.LOADING);
    expect(nextState.metricsAndValuesLoaded.lastLoadedTimeInMs).toBeNull();
  });

  it('set metricsLoaded to failed on request failure', () => {
    const state = createNpmiState({
      metricsAndValuesLoaded: {
        state: DataLoadState.LOADING,
        lastLoadedTimeInMs: null,
      },
    });
    const nextState = reducers(
      state,
      actions.npmiMetricsAndValuesRequestFailed()
    );
    expect(nextState.metricsAndValuesLoaded.state).toBe(DataLoadState.FAILED);
    expect(nextState.metricsAndValuesLoaded.lastLoadedTimeInMs).toBeNull();
  });

  it('sets metricsAncValuesLoaded, metrics & values on successful load', () => {
    const state = createNpmiState();
    const t0 = Date.now();
    const nextState = reducers(
      state,
      actions.npmiMetricsAndValuesLoaded({
        metrics: {
          run_1: [
            'count',
            'count@test1',
            'count@test2',
            'nPMI@test1',
            'nPMI@test2',
          ],
        },
        values: {
          run_1: [
            [3510517, 16719, 513767, 0.16871, -0.37206],
            [1396813, 1896, 638967, 0.687616, 0.68116],
          ],
        },
      })
    );
    expect(nextState.metricsAndValuesLoaded.state).toBe(DataLoadState.LOADED);
    expect(
      nextState.metricsAndValuesLoaded.lastLoadedTimeInMs
    ).toBeGreaterThanOrEqual(t0);
    expect(nextState.countMetricsData).toEqual({
      run_1: ['count@test1', 'count@test2'],
    });
    expect(nextState.npmiMetricsData).toEqual({
      run_1: ['nPMI@test1', 'nPMI@test2'],
    });
    expect(nextState.countValuesData).toEqual({
      run_1: [[16719, 513767], [1896, 638967]],
    });
    expect(nextState.npmiValuesData).toEqual({
      run_1: [[0.16871, -0.37206], [0.687616, 0.68116]],
    });
    expect(nextState.countData).toEqual({
      run_1: [3510517, 1396813],
    });
  });

  it('Overrides existing metrics and values on successful loading', () => {
    const state = createNpmiState({
      npmiMetricsData: {
        run_1: ['nPMI@test1', 'nPMI@test2'],
      },
      countMetricsData: {
        run_1: ['count@test1', 'count@test2'],
      },

      npmiValuesData: {
        run_1: [[0.16871, -0.37206], [0.687616, 0.68116]],
      },
      countValuesData: {
        run_1: [[16719, 513767], [1896, 638967]],
      },
      countData: {
        run_1: [3510517, 1396813],
      },
      metricsAndValuesLoaded: {
        state: DataLoadState.LOADED,
        lastLoadedTimeInMs: 0,
      },
    });
    const t0 = Date.now();
    const nextState = reducers(
      state,
      actions.npmiMetricsAndValuesLoaded({
        metrics: {
          run_1: [
            'count',
            'count@newtest1',
            'count@newtest2',
            'nPMI@newtest1',
            'nPMI@newtest2',
          ],
        },
        values: {
          run_1: [
            [351051, 1671, 51376, 0.1687, -0.372],
            [139681, 189, 63896, 0.68761, 0.6811],
          ],
        },
      })
    );
    expect(nextState.metricsAndValuesLoaded.state).toBe(DataLoadState.LOADED);
    expect(
      nextState.metricsAndValuesLoaded.lastLoadedTimeInMs
    ).toBeGreaterThanOrEqual(t0);
    expect(nextState.countMetricsData).toEqual({
      run_1: ['count@newtest1', 'count@newtest2'],
    });
    expect(nextState.npmiMetricsData).toEqual({
      run_1: ['nPMI@newtest1', 'nPMI@newtest2'],
    });
    expect(nextState.countValuesData).toEqual({
      run_1: [[1671, 51376], [189, 63896]],
    });
    expect(nextState.npmiValuesData).toEqual({
      run_1: [[0.1687, -0.372], [0.68761, 0.6811]],
    });
    expect(nextState.countData).toEqual({
      run_1: [351051, 139681],
    });
  });
});
