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
import {
  getAnnotationsLoaded,
  getMetricsLoaded,
  getValuesLoaded,
  getAnnotationsData,
  getMetricsData,
  getCountMetricsData,
  getNpmiMetricsData,
  getValuesData,
  getCountValuesData,
  getNpmiValuesData,
  getCountData,
} from './npmi_selectors';
import {DataLoadState} from './npmi_types';
import {createNpmiState, createState} from '../testing';

describe('npmi selectors', () => {
  describe('getAnnotationsLoadState', () => {
    it('return correct NOT_LOADED state', () => {
      const state = createState(createNpmiState());
      const annotationsLoaded = getAnnotationsLoaded(state);
      expect(annotationsLoaded.state).toBe(DataLoadState.NOT_LOADED);
    });

    it('returns correct LOADING state', () => {
      const state = createState(
        createNpmiState({
          annotationsLoaded: {
            state: DataLoadState.LOADING,
            lastLoadedTimeInMs: null,
          },
        })
      );
      const annotationsLoaded = getAnnotationsLoaded(state);
      expect(annotationsLoaded.state).toBe(DataLoadState.LOADING);
      expect(annotationsLoaded.lastLoadedTimeInMs).toBe(null);
    });

    it('returns correct LOADED state', () => {
      const state = createState(
        createNpmiState({
          annotationsLoaded: {
            state: DataLoadState.LOADED,
            lastLoadedTimeInMs: 1234,
          },
        })
      );
      const loaded = getAnnotationsLoaded(state);
      expect(loaded.state).toBe(DataLoadState.LOADED);
      expect(loaded.lastLoadedTimeInMs).toBe(1234);
    });
  });

  describe('getMetricsLoadState', () => {
    it('return correct NOT_LOADED state', () => {
      const state = createState(createNpmiState());
      const metricsLoaded = getMetricsLoaded(state);
      expect(metricsLoaded.state).toBe(DataLoadState.NOT_LOADED);
    });

    it('returns correct LOADING state', () => {
      const state = createState(
        createNpmiState({
          metricsLoaded: {
            state: DataLoadState.LOADING,
            lastLoadedTimeInMs: null,
          },
        })
      );
      const metricsLoaded = getMetricsLoaded(state);
      expect(metricsLoaded.state).toBe(DataLoadState.LOADING);
      expect(metricsLoaded.lastLoadedTimeInMs).toBe(null);
    });

    it('returns correct LOADED state', () => {
      const state = createState(
        createNpmiState({
          metricsLoaded: {
            state: DataLoadState.LOADED,
            lastLoadedTimeInMs: 1234,
          },
        })
      );
      const loaded = getMetricsLoaded(state);
      expect(loaded.state).toBe(DataLoadState.LOADED);
      expect(loaded.lastLoadedTimeInMs).toBe(1234);
    });
  });

  describe('getValuesLoadState', () => {
    it('return correct NOT_LOADED state', () => {
      const state = createState(createNpmiState());
      const valuesLoaded = getValuesLoaded(state);
      expect(valuesLoaded.state).toBe(DataLoadState.NOT_LOADED);
    });

    it('returns correct LOADING state', () => {
      const state = createState(
        createNpmiState({
          valuesLoaded: {
            state: DataLoadState.LOADING,
            lastLoadedTimeInMs: null,
          },
        })
      );
      const valuesLoaded = getValuesLoaded(state);
      expect(valuesLoaded.state).toBe(DataLoadState.LOADING);
      expect(valuesLoaded.lastLoadedTimeInMs).toBe(null);
    });

    it('returns correct LOADED state', () => {
      const state = createState(
        createNpmiState({
          valuesLoaded: {
            state: DataLoadState.LOADED,
            lastLoadedTimeInMs: 1234,
          },
        })
      );
      const loaded = getValuesLoaded(state);
      expect(loaded.state).toBe(DataLoadState.LOADED);
      expect(loaded.lastLoadedTimeInMs).toBe(1234);
    });
  });

  describe('getAnnotationsData', () => {
    it('return correct empty object', () => {
      const state = createState(createNpmiState());
      expect(getAnnotationsData(state)).toEqual({});
    });

    it('return correct data', () => {
      const state = createState(
        createNpmiState({
          annotationsData: {
            run_1: ['annotation_1', 'annotation_2'],
          },
        })
      );
      expect(getAnnotationsData(state)).toEqual({
        run_1: ['annotation_1', 'annotation_2'],
      });
    });
  });

  describe('getMetricsData', () => {
    it('return correct empty object', () => {
      const state = createState(createNpmiState());
      expect(getMetricsData(state)).toEqual({});
    });

    it('return correct data', () => {
      const state = createState(
        createNpmiState({
          metricsData: {
            run_1: ['metric_1', 'metric_2'],
          },
        })
      );
      expect(getMetricsData(state)).toEqual({run_1: ['metric_1', 'metric_2']});
    });
  });

  describe('getCountMetricsData', () => {
    it('return correct empty object', () => {
      const state = createState(createNpmiState());
      expect(getCountMetricsData(state)).toEqual({});
    });

    it('return correct data', () => {
      const state = createState(
        createNpmiState({
          countMetricsData: {
            run_1: ['count_metric_1', 'count_metric_2'],
          },
        })
      );
      expect(getCountMetricsData(state)).toEqual({
        run_1: ['count_metric_1', 'count_metric_2'],
      });
    });
  });

  describe('getNpmiMetricsData', () => {
    it('return correct empty object', () => {
      const state = createState(createNpmiState());
      expect(getNpmiMetricsData(state)).toEqual({});
    });

    it('return correct data', () => {
      const state = createState(
        createNpmiState({
          npmiMetricsData: {
            run_1: ['npmi_metric_1', 'npmi_metric_2'],
          },
        })
      );
      expect(getNpmiMetricsData(state)).toEqual({
        run_1: ['npmi_metric_1', 'npmi_metric_2'],
      });
    });
  });

  describe('getValuesData', () => {
    it('return correct empty object', () => {
      const state = createState(createNpmiState());
      expect(getValuesData(state)).toEqual({});
    });

    it('return correct data', () => {
      const state = createState(
        createNpmiState({
          valuesData: {
            run_1: [[0.11528, -0.15616], [-0.00513, 0.51611]],
          },
        })
      );
      expect(getValuesData(state)).toEqual({
        run_1: [[0.11528, -0.15616], [-0.00513, 0.51611]],
      });
    });
  });

  describe('getCountValuesData', () => {
    it('return correct empty object', () => {
      const state = createState(createNpmiState());
      expect(getCountValuesData(state)).toEqual({});
    });

    it('return correct data', () => {
      const state = createState(
        createNpmiState({
          countValuesData: {
            run_1: [[100153, 1501671], [2617609, 5019671]],
          },
        })
      );
      expect(getCountValuesData(state)).toEqual({
        run_1: [[100153, 1501671], [2617609, 5019671]],
      });
    });
  });

  describe('getNpmiValuesData', () => {
    it('return correct empty object', () => {
      const state = createState(createNpmiState());
      expect(getNpmiValuesData(state)).toEqual({});
    });

    it('return correct data', () => {
      const state = createState(
        createNpmiState({
          npmiValuesData: {
            run_1: [[0.11528, -0.15616], [-0.00513, 0.51611]],
          },
        })
      );
      expect(getNpmiValuesData(state)).toEqual({
        run_1: [[0.11528, -0.15616], [-0.00513, 0.51611]],
      });
    });
  });

  describe('getCountData', () => {
    it('return correct empty object', () => {
      const state = createState(createNpmiState());
      expect(getCountData(state)).toEqual({});
    });

    it('return correct data', () => {
      const state = createState(
        createNpmiState({
          countData: {
            run_1: [235716, 16098762],
          },
        })
      );
      expect(getCountData(state)).toEqual({run_1: [235716, 16098762]});
    });
  });
});
