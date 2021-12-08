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
  createNpmiState,
  createSampleEmbeddingData,
  createState,
} from '../testing';
import {
  getAnnotationData,
  getAnnotationsExpanded,
  getAnnotationSort,
  getAnnotationsRegex,
  getEmbeddingDataSet,
  getEmbeddingsMetric,
  getEmbeddingsSidebarExpanded,
  getEmbeddingsSidebarWidth,
  getFlaggedAnnotations,
  getHiddenAnnotations,
  getMetricArithmetic,
  getMetricFilters,
  getMetricsRegex,
  getPCExpanded,
  getPluginDataLoaded,
  getRunToMetrics,
  getSelectedAnnotations,
  getShowCounts,
  getShowHiddenAnnotations,
  getSidebarExpanded,
  getSidebarWidth,
  getViewActive,
} from './npmi_selectors';
import {
  ArithmeticKind,
  DataLoadState,
  Operator,
  SortOrder,
  ViewActive,
} from './npmi_types';

describe('npmi selectors', () => {
  describe('getPluginDataLoadState', () => {
    it('returns the correct NOT_LOADED state', () => {
      const state = createState(createNpmiState());
      const annotationsLoaded = getPluginDataLoaded(state);
      expect(annotationsLoaded).toBe(DataLoadState.NOT_LOADED);
    });

    it('returns the correct LOADING state', () => {
      const state = createState(
        createNpmiState({
          pluginDataLoaded: {
            state: DataLoadState.LOADING,
            lastLoadedTimeInMs: null,
          },
        })
      );
      const annotationsLoaded = getPluginDataLoaded(state);
      expect(annotationsLoaded).toBe(DataLoadState.LOADING);
    });

    it('returns the correct LOADED state', () => {
      const state = createState(
        createNpmiState({
          pluginDataLoaded: {
            state: DataLoadState.LOADED,
            lastLoadedTimeInMs: 1234,
          },
        })
      );
      const loaded = getPluginDataLoaded(state);
      expect(loaded).toBe(DataLoadState.LOADED);
    });
  });

  describe('getAnnotationData', () => {
    it('returns the correct empty object', () => {
      const state = createState(createNpmiState());
      expect(getAnnotationData(state)).toEqual({});
    });

    it('returns the correct data', () => {
      const state = createState(
        createNpmiState({
          annotationData: {
            annotation_new_1: [
              {
                nPMIValue: 0.1687,
                countValue: 1671,
                annotation: 'annotation_1',
                metric: 'newtest1',
                run: 'run_1',
              },
            ],
            annotation_new_2: [
              {
                nPMIValue: 0.68761,
                countValue: 189,
                annotation: 'annotation_1',
                metric: 'newtest1',
                run: 'run_1',
              },
            ],
          },
        })
      );
      expect(getAnnotationData(state)).toEqual({
        annotation_new_1: [
          {
            nPMIValue: 0.1687,
            countValue: 1671,
            annotation: 'annotation_1',
            metric: 'newtest1',
            run: 'run_1',
          },
        ],
        annotation_new_2: [
          {
            nPMIValue: 0.68761,
            countValue: 189,
            annotation: 'annotation_1',
            metric: 'newtest1',
            run: 'run_1',
          },
        ],
      });
    });
  });

  describe('getRunToMetrics', () => {
    it('returns the correct empty object', () => {
      const state = createState(createNpmiState());
      expect(getRunToMetrics(state)).toEqual({});
    });

    it('returns the correct data', () => {
      const state = createState(
        createNpmiState({
          runToMetrics: {
            run_1: ['npmi_metric_1', 'npmi_metric_2'],
          },
        })
      );
      expect(getRunToMetrics(state)).toEqual({
        run_1: ['npmi_metric_1', 'npmi_metric_2'],
      });
    });
  });

  describe('getEmbeddingDataSet', () => {
    it('returns correct undefined', () => {
      const state = createState(createNpmiState());
      expect(getEmbeddingDataSet(state)).toEqual(undefined);
    });

    it('returns the correct data', () => {
      const embeddingData = createSampleEmbeddingData();
      const state = createState(
        createNpmiState({
          embeddingDataSet: embeddingData,
        })
      );
      expect(getEmbeddingDataSet(state)).toEqual(embeddingData);
    });
  });

  describe('getSelectedAnnotations', () => {
    it('returns correct empty array', () => {
      const state = createState(createNpmiState());
      expect(getSelectedAnnotations(state)).toEqual([]);
    });

    it('returns correct state', () => {
      const state = createState(
        createNpmiState({
          selectedAnnotations: ['annotation_1', 'annotation_2'],
        })
      );
      expect(getSelectedAnnotations(state)).toEqual([
        'annotation_1',
        'annotation_2',
      ]);
    });
  });

  describe('getFlaggedAnnotations', () => {
    it('returns correct empty array', () => {
      const state = createState(createNpmiState());
      expect(getFlaggedAnnotations(state)).toEqual([]);
    });

    it('returns correct state', () => {
      const state = createState(
        createNpmiState({
          flaggedAnnotations: ['annotation_1', 'annotation_2'],
        })
      );
      expect(getFlaggedAnnotations(state)).toEqual([
        'annotation_1',
        'annotation_2',
      ]);
    });
  });

  describe('getHiddenAnnotations', () => {
    it('returns correct empty array', () => {
      const state = createState(createNpmiState());
      expect(getHiddenAnnotations(state)).toEqual([]);
    });

    it('returns correct state', () => {
      const state = createState(
        createNpmiState({
          hiddenAnnotations: ['annotation_1', 'annotation_2'],
        })
      );
      expect(getHiddenAnnotations(state)).toEqual([
        'annotation_1',
        'annotation_2',
      ]);
    });
  });

  describe('getAnnotationsRegex', () => {
    it('returns correct empty string', () => {
      const state = createState(createNpmiState());
      expect(getAnnotationsRegex(state)).toEqual('');
    });

    it('returns correct value', () => {
      const state = createState(
        createNpmiState({
          annotationsRegex: 'test',
        })
      );
      expect(getAnnotationsRegex(state)).toBe('test');
    });
  });

  describe('getMetricsRegex', () => {
    it('returns correct empty string', () => {
      const state = createState(createNpmiState());
      expect(getMetricsRegex(state)).toEqual('');
    });

    it('returns correct value', () => {
      const state = createState(
        createNpmiState({
          metricsRegex: 'test',
        })
      );
      expect(getMetricsRegex(state)).toBe('test');
    });
  });

  describe('getMetricArithmetic', () => {
    it('return correct empty array', () => {
      const state = createState(createNpmiState());
      expect(getMetricArithmetic(state)).toEqual([]);
    });

    it('return correct arithmetic', () => {
      const state = createState(
        createNpmiState({
          metricArithmetic: [
            {kind: ArithmeticKind.METRIC, metric: 'test'},
            {kind: ArithmeticKind.OPERATOR, operator: Operator.AND},
            {kind: ArithmeticKind.METRIC, metric: 'test2'},
          ],
        })
      );
      expect(getMetricArithmetic(state)).toEqual([
        {kind: ArithmeticKind.METRIC, metric: 'test'},
        {kind: ArithmeticKind.OPERATOR, operator: Operator.AND},
        {kind: ArithmeticKind.METRIC, metric: 'test2'},
      ]);
    });
  });

  describe('getMetricFilters', () => {
    it('returns correct empty object', () => {
      const state = createState(createNpmiState());
      expect(getMetricFilters(state)).toEqual({});
    });

    it('returns correct filters objext', () => {
      const state = createState(
        createNpmiState({
          metricFilters: {
            test: {max: 1.0, min: -1.0, includeNaN: true},
            test2: {max: 1.0, min: 0, includeNaN: false},
          },
        })
      );
      expect(getMetricFilters(state)).toEqual({
        test: {max: 1.0, min: -1.0, includeNaN: true},
        test2: {max: 1.0, min: 0, includeNaN: false},
      });
    });
  });

  describe('getAnnotationSort', () => {
    it('returns correct inital object', () => {
      const state = createState(createNpmiState());
      expect(getAnnotationSort(state)).toEqual({
        metric: '',
        order: SortOrder.DESCENDING,
      });
    });

    it('returns correct state', () => {
      const state = createState(
        createNpmiState({
          sort: {
            metric: 'test',
            order: SortOrder.ASCENDNG,
          },
        })
      );
      expect(getAnnotationSort(state)).toEqual({
        metric: 'test',
        order: SortOrder.ASCENDNG,
      });
    });
  });

  describe('getPCExpanded', () => {
    it('returns correct true state', () => {
      const state = createState(createNpmiState());
      expect(getPCExpanded(state)).toBeTrue();
    });

    it('returns correct state', () => {
      const state = createState(
        createNpmiState({
          pcExpanded: false,
        })
      );
      expect(getPCExpanded(state)).toBeFalse();
    });
  });

  describe('getAnnotationsExpanded', () => {
    it('returns correct true state', () => {
      const state = createState(createNpmiState());
      expect(getAnnotationsExpanded(state)).toBeTrue();
    });

    it('returns correct state', () => {
      const state = createState(
        createNpmiState({
          annotationsExpanded: false,
        })
      );
      expect(getAnnotationsExpanded(state)).toBeFalse();
    });
  });

  describe('getSidebarExpanded', () => {
    it('returns correct true state', () => {
      const state = createState(createNpmiState());
      expect(getSidebarExpanded(state)).toBeTrue();
    });

    it('returns correct state', () => {
      const state = createState(
        createNpmiState({
          sidebarExpanded: false,
        })
      );
      expect(getSidebarExpanded(state)).toBeFalse();
    });
  });

  describe('getShowCounts', () => {
    it('returns correct true state', () => {
      const state = createState(createNpmiState());
      expect(getShowCounts(state)).toBeTrue();
    });

    it('returns correct state', () => {
      const state = createState(
        createNpmiState({
          showCounts: false,
        })
      );
      expect(getShowCounts(state)).toBeFalse();
    });
  });

  describe('getShowHiddenAnnotations', () => {
    it('returns correct false state', () => {
      const state = createState(createNpmiState());
      expect(getShowHiddenAnnotations(state)).toBeFalse();
    });

    it('returns correct state', () => {
      const state = createState(
        createNpmiState({
          showHiddenAnnotations: true,
        })
      );
      expect(getShowHiddenAnnotations(state)).toBeTrue();
    });
  });

  describe('getViewActive', () => {
    it('returns correct initial state', () => {
      const state = createState(createNpmiState());
      expect(getViewActive(state)).toBe(ViewActive.DEFAULT);
    });

    it('returns correct state', () => {
      const state = createState(
        createNpmiState({
          viewActive: ViewActive.EMBEDDINGS,
        })
      );
      expect(getViewActive(state)).toBe(ViewActive.EMBEDDINGS);
    });
  });

  describe('getSidebarWidth', () => {
    it('returns correct initial state', () => {
      const state = createState(createNpmiState());
      expect(getSidebarWidth(state)).toBe(300);
    });

    it('returns correct state', () => {
      const state = createState(
        createNpmiState({
          sidebarWidth: 100,
        })
      );
      expect(getSidebarWidth(state)).toBe(100);
    });
  });

  describe('getEmbeddingsMetric', () => {
    it('returns correct initial state', () => {
      const state = createState(createNpmiState());
      expect(getEmbeddingsMetric(state)).toBe('');
    });

    it('returns correct state', () => {
      const state = createState(
        createNpmiState({
          embeddingsMetric: 'test',
        })
      );
      expect(getEmbeddingsMetric(state)).toBe('test');
    });
  });

  describe('getEmbeddingsSidebarWidth', () => {
    it('returns correct initial state', () => {
      const state = createState(createNpmiState());
      expect(getEmbeddingsSidebarWidth(state)).toBe(500);
    });

    it('returns correct state', () => {
      const state = createState(
        createNpmiState({
          embeddingsSidebarWidth: 100,
        })
      );
      expect(getEmbeddingsSidebarWidth(state)).toBe(100);
    });
  });

  describe('getEmbeddingsSidebarExpanded', () => {
    it('returns correct true state', () => {
      const state = createState(createNpmiState());
      expect(getEmbeddingsSidebarExpanded(state)).toBeTrue();
    });

    it('returns correct state', () => {
      const state = createState(
        createNpmiState({
          embeddingsSidebarExpanded: false,
        })
      );
      expect(getEmbeddingsSidebarExpanded(state)).toBeFalse();
    });
  });
});
