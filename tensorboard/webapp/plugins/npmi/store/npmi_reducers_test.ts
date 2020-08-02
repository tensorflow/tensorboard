import * as actions from '../actions';
import {reducers} from './npmi_reducers';
import {DataLoadState} from './npmi_types';
import {createNpmiState, createState} from '../testing';

describe('Annotations loading', () => {
  it('sets annotationsLoaded to loading on requesting annotations', () => {
    const state = createNpmiState();
    const nextState = reducers(state, actions.annotationsRequested());
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
    const nextState = reducers(state, actions.annotationsRequestFailed());
    expect(nextState.annotationsLoaded.state).toBe(DataLoadState.FAILED);
    expect(nextState.annotationsLoaded.lastLoadedTimeInMs).toBeNull();
  });

  it('sets annotationsLoaded & annotations on successful load', () => {
    const state = createNpmiState();
    const t0 = Date.now();
    const nextState = reducers(
      state,
      actions.annotationsLoaded({
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
      actions.annotationsLoaded({
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

describe('Metrics loading', () => {
  it('sets metricsLoaded to loading on requesting metrics', () => {
    const state = createNpmiState();
    const nextState = reducers(state, actions.metricsRequested());
    expect(nextState.metricsLoaded.state).toBe(DataLoadState.LOADING);
    expect(nextState.metricsLoaded.lastLoadedTimeInMs).toBeNull();
  });

  it('set metricsLoaded to failed on request failure', () => {
    const state = createNpmiState({
      metricsLoaded: {
        state: DataLoadState.LOADING,
        lastLoadedTimeInMs: null,
      },
    });
    const nextState = reducers(state, actions.metricsRequestFailed());
    expect(nextState.metricsLoaded.state).toBe(DataLoadState.FAILED);
    expect(nextState.metricsLoaded.lastLoadedTimeInMs).toBeNull();
  });

  it('sets metricsLoaded & metrics on successful load', () => {
    const state = createNpmiState();
    const t0 = Date.now();
    const nextState = reducers(
      state,
      actions.metricsLoaded({
        metrics: {
          run_1: [
            'count',
            'count@test1',
            'count@test2',
            'npmi@test1',
            'npmi@test2',
          ],
        },
      })
    );
    expect(nextState.metricsLoaded.state).toBe(DataLoadState.LOADED);
    expect(nextState.metricsLoaded.lastLoadedTimeInMs).toBeGreaterThanOrEqual(
      t0
    );
    expect(nextState.metricsData).toEqual({
      run_1: [
        'count',
        'count@test1',
        'count@test2',
        'npmi@test1',
        'npmi@test2',
      ],
    });
    expect(nextState.countMetricsData).toEqual({
      run_1: ['count@test1', 'count@test2'],
    });
    expect(nextState.npmiMetricsData).toEqual({
      run_1: ['npmi@test1', 'npmi@test2'],
    });
  });

  it('Overrides existing metrics on successful metrics loading', () => {
    const state = createNpmiState({
      metricsData: {
        run_1: [
          'count',
          'count@test1',
          'count@test2',
          'npmi@test1',
          'npmi@test2',
        ],
      },
      npmiMetricsData: {
        run_1: ['npmi@test1', 'npmi@test2'],
      },
      countMetricsData: {
        run_1: ['count@test1', 'count@test2'],
      },
      metricsLoaded: {
        state: DataLoadState.LOADED,
        lastLoadedTimeInMs: 0,
      },
    });
    const t0 = Date.now();
    const nextState = reducers(
      state,
      actions.metricsLoaded({
        metrics: {
          run_1: [
            'count',
            'count@newtest1',
            'count@newtest2',
            'npmi@newtest1',
            'npmi@newtest2',
          ],
        },
      })
    );
    expect(nextState.metricsLoaded.state).toBe(DataLoadState.LOADED);
    expect(nextState.metricsLoaded.lastLoadedTimeInMs).toBeGreaterThanOrEqual(
      t0
    );
    expect(nextState.metricsData).toEqual({
      run_1: [
        'count',
        'count@newtest1',
        'count@newtest2',
        'npmi@newtest1',
        'npmi@newtest2',
      ],
    });
    expect(nextState.countMetricsData).toEqual({
      run_1: ['count@newtest1', 'count@newtest2'],
    });
    expect(nextState.npmiMetricsData).toEqual({
      run_1: ['npmi@newtest1', 'npmi@newtest2'],
    });
  });

  describe('Values loading', () => {
    it('sets valuesLoaded to loading on requesting values', () => {
      const state = createNpmiState();
      const nextState = reducers(state, actions.valuesRequested());
      expect(nextState.valuesLoaded.state).toBe(DataLoadState.LOADING);
      expect(nextState.valuesLoaded.lastLoadedTimeInMs).toBeNull();
    });

    it('set valuesLoaded to failed on request failure', () => {
      const state = createNpmiState({
        valuesLoaded: {
          state: DataLoadState.LOADING,
          lastLoadedTimeInMs: null,
        },
      });
      const nextState = reducers(state, actions.valuesRequestFailed());
      expect(nextState.valuesLoaded.state).toBe(DataLoadState.FAILED);
      expect(nextState.valuesLoaded.lastLoadedTimeInMs).toBeNull();
    });

    it('sets valuesLoaded & values on successful load', () => {
      const state = createNpmiState();
      const t0 = Date.now();
      const nextState = reducers(
        state,
        actions.valuesLoaded({
          values: {
            run_1: [
              [3510517, 16719, 513767, 0.16871, -0.37206],
              [1396813, 1896, 638967, 0.687616, 0.68116],
            ],
          },
          metrics: {
            run_1: [
              'count',
              'count@test1',
              'count@test2',
              'npmi@test1',
              'npmi@test2',
            ],
          },
        })
      );
      expect(nextState.valuesLoaded.state).toBe(DataLoadState.LOADED);
      expect(nextState.valuesLoaded.lastLoadedTimeInMs).toBeGreaterThanOrEqual(
        t0
      );
      expect(nextState.valuesData).toEqual({
        run_1: [
          [3510517, 16719, 513767, 0.16871, -0.37206],
          [1396813, 1896, 638967, 0.687616, 0.68116],
        ],
      });
      expect(nextState.countValuesData).toEqual({
        run_1: [[16719, 513767], [1896, 638967]],
      });
      expect(nextState.npmiValuesData).toEqual({
        run_1: [[0.16871, -0.37206], [0.687616, 0.68116]],
      });
      expect(nextState.countData).toEqual({
        run_1: [3510517, 3510517],
      });
    });

    it('Overrides existing values on successful values loading', () => {
      const state = createNpmiState({
        valuesData: {
          run_1: [
            [3510517, 16719, 513767, 0.16871, -0.37206],
            [1396813, 1896, 638967, 0.687616, 0.68116],
          ],
        },
        npmiValuesData: {
          run_1: [[0.16871, -0.37206], [0.687616, 0.68116]],
        },
        countValuesData: {
          run_1: [[16719, 513767], [1896, 638967]],
        },
        countData: {
          run_1: [3510517, 3510517],
        },
        valuesLoaded: {
          state: DataLoadState.LOADED,
          lastLoadedTimeInMs: 0,
        },
      });
      const t0 = Date.now();
      const nextState = reducers(
        state,
        actions.valuesLoaded({
          values: {
            run_1: [
              [351051, 1671, 51376, 0.1687, -0.3720],
              [139681, 189, 63896, 0.68761, 0.6811],
            ],
          },
          metrics: {
            run_1: [
              'count',
              'count@test1',
              'count@test2',
              'npmi@test1',
              'npmi@test2',
            ],
          },
        })
      );
      expect(nextState.valuesLoaded.state).toBe(DataLoadState.LOADED);
      expect(nextState.valuesLoaded.lastLoadedTimeInMs).toBeGreaterThanOrEqual(
        t0
      );
      expect(nextState.valuesData).toEqual({
        run_1: [
          [351051, 1671, 51376, 0.1687, -0.3720],
          [139681, 189, 63896, 0.68761, 0.6811],
        ],
      });
      expect(nextState.countValuesData).toEqual({
        run_1: [[1671, 51376], [189, 63896]],
      });
      expect(nextState.npmiValuesData).toEqual({
        run_1: [[0.1687, -0.3720], [0.68761, 0.6811]],
      });
      expect(nextState.countData).toEqual({
        run_1: [351051, 351051],
      });
  });
});
