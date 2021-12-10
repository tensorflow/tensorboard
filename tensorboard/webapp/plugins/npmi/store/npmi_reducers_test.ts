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
import * as actions from '../actions';
import {createNpmiState, createSampleEmbeddingData} from '../testing';
import {reducers} from './npmi_reducers';
import {
  ArithmeticKind,
  DataLoadState,
  Operator,
  SortOrder,
  ViewActive,
} from './npmi_types';

describe('npmi_reducers', () => {
  describe('Data loading', () => {
    it('sets pluginDataLoaded to loading on requesting Data', () => {
      const state = createNpmiState();
      const nextState = reducers(state, actions.npmiPluginDataRequested());
      expect(nextState.pluginDataLoaded.state).toBe(DataLoadState.LOADING);
      expect(nextState.pluginDataLoaded.lastLoadedTimeInMs).toBeNull();
    });

    it('sets pluginDataLoaded to failed on request failure', () => {
      const state = createNpmiState({
        pluginDataLoaded: {
          state: DataLoadState.LOADING,
          lastLoadedTimeInMs: null,
        },
      });
      const nextState = reducers(state, actions.npmiPluginDataRequestFailed());
      expect(nextState.pluginDataLoaded.state).toBe(DataLoadState.FAILED);
      expect(nextState.pluginDataLoaded.lastLoadedTimeInMs).toBeNull();
    });

    it('sets pluginDataLoaded and plugin Data on successful load', () => {
      const state = createNpmiState();
      const t0 = Date.now();
      const embeddingData = createSampleEmbeddingData();
      const nextState = reducers(
        state,
        actions.npmiPluginDataLoaded({
          annotationData: {
            annotation_1: [
              {
                nPMIValue: 0.16871,
                countValue: 16719,
                annotation: 'annotation_1',
                metric: 'test1',
                run: 'run_1',
              },
              {
                nPMIValue: -0.37206,
                countValue: 513767,
                annotation: 'annotation_1',
                metric: 'test2',
                run: 'run_1',
              },
            ],
            annotation_2: [
              {
                nPMIValue: 0.687616,
                countValue: 1896,
                annotation: 'annotation_1',
                metric: 'test1',
                run: 'run_1',
              },
              {
                nPMIValue: 0.68116,
                countValue: 638967,
                annotation: 'annotation_1',
                metric: 'test2',
                run: 'run_1',
              },
            ],
          },
          metrics: {
            run_1: [
              'count@test2',
              'count',
              'nPMI@test1',
              'count@test1',
              'nPMI@test2',
            ],
          },
          embeddingDataSet: embeddingData,
        })
      );
      expect(nextState.pluginDataLoaded.state).toBe(DataLoadState.LOADED);
      expect(
        nextState.pluginDataLoaded.lastLoadedTimeInMs
      ).toBeGreaterThanOrEqual(t0);
      expect(nextState.annotationData).toEqual({
        annotation_1: [
          {
            nPMIValue: 0.16871,
            countValue: 16719,
            annotation: 'annotation_1',
            metric: 'test1',
            run: 'run_1',
          },
          {
            nPMIValue: -0.37206,
            countValue: 513767,
            annotation: 'annotation_1',
            metric: 'test2',
            run: 'run_1',
          },
        ],
        annotation_2: [
          {
            nPMIValue: 0.687616,
            countValue: 1896,
            annotation: 'annotation_1',
            metric: 'test1',
            run: 'run_1',
          },
          {
            nPMIValue: 0.68116,
            countValue: 638967,
            annotation: 'annotation_1',
            metric: 'test2',
            run: 'run_1',
          },
        ],
      });
      expect(nextState.runToMetrics).toEqual({
        run_1: ['nPMI@test1', 'nPMI@test2'],
      });
      expect(nextState.embeddingDataSet).toEqual(embeddingData);
    });

    it('overrides existing annotations on successful loading of annotations', () => {
      const embeddingData = createSampleEmbeddingData();
      const state = createNpmiState({
        pluginDataLoaded: {
          state: DataLoadState.LOADED,
          lastLoadedTimeInMs: 0,
        },
        annotationData: {
          annotation_1: [
            {
              nPMIValue: 0.16871,
              countValue: 16719,
              annotation: 'annotation_1',
              metric: 'test1',
              run: 'run_1',
            },
            {
              nPMIValue: -0.37206,
              countValue: 513767,
              annotation: 'annotation_1',
              metric: 'test2',
              run: 'run_1',
            },
          ],
          annotation_2: [
            {
              nPMIValue: 0.687616,
              countValue: 1896,
              annotation: 'annotation_1',
              metric: 'test1',
              run: 'run_1',
            },
            {
              nPMIValue: 0.68116,
              countValue: 638967,
              annotation: 'annotation_1',
              metric: 'test2',
              run: 'run_1',
            },
          ],
        },
        runToMetrics: {
          run_1: ['nPMI@test1', 'nPMI@test2'],
        },
        embeddingDataSet: embeddingData,
      });
      const t0 = Date.now();
      const nextState = reducers(
        state,
        actions.npmiPluginDataLoaded({
          annotationData: {
            annotation_new_1: [
              {
                nPMIValue: 0.1687,
                countValue: 1671,
                annotation: 'annotation_1',
                metric: 'newtest1',
                run: 'run_1',
              },
              {
                nPMIValue: -0.372,
                countValue: 51376,
                annotation: 'annotation_1',
                metric: 'newtest2',
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
              {
                nPMIValue: 0.6811,
                countValue: 63896,
                annotation: 'annotation_1',
                metric: 'newtest2',
                run: 'run_1',
              },
            ],
          },
          metrics: {
            run_1: [
              'count',
              'count@newtest1',
              'count@newtest2',
              'nPMI@newtest1',
              'nPMI@newtest2',
            ],
          },
          embeddingDataSet: embeddingData,
        })
      );
      expect(nextState.pluginDataLoaded.state).toBe(DataLoadState.LOADED);
      expect(
        nextState.pluginDataLoaded.lastLoadedTimeInMs
      ).toBeGreaterThanOrEqual(t0);
      expect(nextState.annotationData).toEqual({
        annotation_new_1: [
          {
            nPMIValue: 0.1687,
            countValue: 1671,
            annotation: 'annotation_1',
            metric: 'newtest1',
            run: 'run_1',
          },
          {
            nPMIValue: -0.372,
            countValue: 51376,
            annotation: 'annotation_1',
            metric: 'newtest2',
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
          {
            nPMIValue: 0.6811,
            countValue: 63896,
            annotation: 'annotation_1',
            metric: 'newtest2',
            run: 'run_1',
          },
        ],
      });
      expect(nextState.runToMetrics).toEqual({
        run_1: ['nPMI@newtest1', 'nPMI@newtest2'],
      });
      expect(nextState.embeddingDataSet).toEqual(embeddingData);
    });
  });

  describe('Annotation Selection', () => {
    it('selects annotations when no annotation is already selected', () => {
      const state = createNpmiState();
      const nextState = reducers(
        state,
        actions.npmiToggleSelectedAnnotations({
          annotations: ['annotation_1', 'annotation_2', 'annotation_3'],
        })
      );
      expect(nextState.selectedAnnotations).toEqual([
        'annotation_1',
        'annotation_2',
        'annotation_3',
      ]);
    });

    it('selects annotations with some already selected', () => {
      const state = createNpmiState({
        selectedAnnotations: ['annotation_1', 'annotation_3'],
      });
      const nextState = reducers(
        state,
        actions.npmiToggleSelectedAnnotations({
          annotations: ['annotation_1', 'annotation_2', 'annotation_3'],
        })
      );
      expect(nextState.selectedAnnotations).toEqual([
        'annotation_1',
        'annotation_3',
        'annotation_2',
      ]);
    });

    it('deselects a set of annotations if they are all selected', () => {
      const state = createNpmiState({
        selectedAnnotations: ['annotation_1', 'annotation_2', 'annotation_3'],
      });
      const nextState = reducers(
        state,
        actions.npmiToggleSelectedAnnotations({
          annotations: ['annotation_1', 'annotation_3'],
        })
      );
      expect(nextState.selectedAnnotations).toEqual(['annotation_2']);
    });

    it('sets the selected annotations to a specified set', () => {
      const state = createNpmiState({
        selectedAnnotations: ['annotation_1', 'annotation_2'],
      });
      const nextState = reducers(
        state,
        actions.npmiSetSelectedAnnotations({
          annotations: ['annotation_1', 'annotation_3'],
        })
      );
      expect(nextState.selectedAnnotations).toEqual([
        'annotation_1',
        'annotation_3',
      ]);
    });

    it('clears all selected annotations', () => {
      const state = createNpmiState({
        selectedAnnotations: ['annotation_1', 'annotation_2'],
      });
      const nextState = reducers(state, actions.npmiClearSelectedAnnotations());
      expect(nextState.selectedAnnotations).toEqual([]);
    });
  });

  describe('Annotation Flagging', () => {
    it('flags annotations when no annotation is already flagged', () => {
      const state = createNpmiState();
      const nextState = reducers(
        state,
        actions.npmiToggleAnnotationFlags({
          annotations: ['annotation_1', 'annotation_2', 'annotation_3'],
        })
      );
      expect(nextState.flaggedAnnotations).toEqual([
        'annotation_1',
        'annotation_2',
        'annotation_3',
      ]);
    });

    it('flags annotations with some already flagged', () => {
      const state = createNpmiState({
        flaggedAnnotations: ['annotation_1', 'annotation_3'],
      });
      const nextState = reducers(
        state,
        actions.npmiToggleAnnotationFlags({
          annotations: ['annotation_1', 'annotation_2', 'annotation_3'],
        })
      );
      expect(nextState.flaggedAnnotations).toEqual([
        'annotation_1',
        'annotation_3',
        'annotation_2',
      ]);
    });

    it('unflags a set of annotations if they are all flagged', () => {
      const state = createNpmiState({
        flaggedAnnotations: ['annotation_1', 'annotation_2', 'annotation_3'],
      });
      const nextState = reducers(
        state,
        actions.npmiToggleAnnotationFlags({
          annotations: ['annotation_1', 'annotation_3'],
        })
      );
      expect(nextState.flaggedAnnotations).toEqual(['annotation_2']);
    });
  });

  describe('Hiding Annotations', () => {
    it('hides annotations with no annotation already hidden', () => {
      const state = createNpmiState();
      const nextState = reducers(
        state,
        actions.npmiToggleAnnotationsHidden({
          annotations: ['annotation_1', 'annotation_2', 'annotation_3'],
        })
      );
      expect(nextState.hiddenAnnotations).toEqual([
        'annotation_1',
        'annotation_2',
        'annotation_3',
      ]);
    });

    it('hides annotations with some already hidden', () => {
      const state = createNpmiState({
        hiddenAnnotations: ['annotation_1', 'annotation_3'],
      });
      const nextState = reducers(
        state,
        actions.npmiToggleAnnotationsHidden({
          annotations: ['annotation_1', 'annotation_2', 'annotation_3'],
        })
      );
      expect(nextState.hiddenAnnotations).toEqual([
        'annotation_1',
        'annotation_3',
        'annotation_2',
      ]);
    });

    it('unhides a set of annotations if they are all hidden', () => {
      const state = createNpmiState({
        hiddenAnnotations: ['annotation_1', 'annotation_2', 'annotation_3'],
      });
      const nextState = reducers(
        state,
        actions.npmiToggleAnnotationsHidden({
          annotations: ['annotation_1', 'annotation_3'],
        })
      );
      expect(nextState.hiddenAnnotations).toEqual(['annotation_2']);
    });
  });

  describe('Regex Filter Changes', () => {
    it('changes the annotation regex', () => {
      const state = createNpmiState({annotationsRegex: 'test'});
      const nextState = reducers(
        state,
        actions.npmiAnnotationsRegexChanged({regex: 'new_regex'})
      );
      expect(nextState.annotationsRegex).toBe('new_regex');
    });

    it('changes the metrics regex', () => {
      const state = createNpmiState({metricsRegex: 'test'});
      const nextState = reducers(
        state,
        actions.npmiMetricsRegexChanged({regex: 'new_regex'})
      );
      expect(nextState.metricsRegex).toBe('new_regex');
    });
  });

  describe('Metric Filters', () => {
    describe('Adding Filters', () => {
      it('adds a new metric filter with none present, and adjusts sorting', () => {
        const state = createNpmiState();
        const nextState = reducers(
          state,
          actions.npmiAddMetricFilter({metric: 'nPMI@test'})
        );
        expect(nextState.metricFilters).toEqual({
          'nPMI@test': {
            max: 1.0,
            min: -1.0,
            includeNaN: false,
          },
        });
        expect(nextState.metricArithmetic).toEqual([
          {kind: ArithmeticKind.METRIC, metric: 'nPMI@test'},
        ]);
        expect(nextState.sort).toEqual({
          metric: 'nPMI@test',
          order: SortOrder.DESCENDING,
        });
      });

      it('adds a new metric filter after the first one', () => {
        const state = createNpmiState({
          metricFilters: {
            'nPMI@test': {
              max: 0.3,
              min: -1.0,
              includeNaN: true,
            },
          },
          metricArithmetic: [
            {kind: ArithmeticKind.METRIC, metric: 'nPMI@test'},
          ],
        });
        const nextState = reducers(
          state,
          actions.npmiAddMetricFilter({metric: 'nPMI@second'})
        );
        expect(nextState.metricFilters).toEqual({
          'nPMI@test': {
            max: 0.3,
            min: -1.0,
            includeNaN: true,
          },
          'nPMI@second': {
            max: 1.0,
            min: -1.0,
            includeNaN: false,
          },
        });
        expect(nextState.metricArithmetic).toEqual([
          {kind: ArithmeticKind.METRIC, metric: 'nPMI@test'},
          {kind: ArithmeticKind.OPERATOR, operator: Operator.AND},
          {kind: ArithmeticKind.METRIC, metric: 'nPMI@second'},
        ]);
      });

      it('does not add a new metric filter if it is already active', () => {
        const state = createNpmiState({
          metricFilters: {
            'nPMI@test': {
              max: 0.3,
              min: -1.0,
              includeNaN: true,
            },
          },
          metricArithmetic: [
            {kind: ArithmeticKind.METRIC, metric: 'nPMI@test'},
          ],
        });
        const nextState = reducers(
          state,
          actions.npmiAddMetricFilter({metric: 'nPMI@test'})
        );
        expect(nextState.metricFilters).toEqual({
          'nPMI@test': {
            max: 0.3,
            min: -1.0,
            includeNaN: true,
          },
        });
        expect(nextState.metricArithmetic).toEqual([
          {kind: ArithmeticKind.METRIC, metric: 'nPMI@test'},
        ]);
      });
    });

    describe('Removing Filters', () => {
      it('removes the last remaining metric filter', () => {
        const state = createNpmiState({
          metricFilters: {
            'nPMI@test': {
              max: 0.3,
              min: -1.0,
              includeNaN: true,
            },
          },
          metricArithmetic: [
            {kind: ArithmeticKind.METRIC, metric: 'nPMI@test'},
          ],
        });
        const nextState = reducers(
          state,
          actions.npmiRemoveMetricFilter({metric: 'nPMI@test'})
        );
        expect(nextState.metricFilters).toEqual({});
        expect(nextState.metricArithmetic).toEqual([]);
      });

      it('removes the first metric filter of more', () => {
        const state = createNpmiState({
          metricFilters: {
            'nPMI@test': {
              max: 0.3,
              min: -1.0,
              includeNaN: true,
            },
            'nPMI@second': {
              max: 1.0,
              min: -1.0,
              includeNaN: false,
            },
            'nPMI@third': {
              max: 1.0,
              min: -1.0,
              includeNaN: false,
            },
          },
          metricArithmetic: [
            {kind: ArithmeticKind.METRIC, metric: 'nPMI@test'},
            {kind: ArithmeticKind.OPERATOR, operator: Operator.AND},
            {kind: ArithmeticKind.METRIC, metric: 'nPMI@second'},
            {kind: ArithmeticKind.OPERATOR, operator: Operator.AND},
            {kind: ArithmeticKind.METRIC, metric: 'nPMI@third'},
          ],
        });
        const nextState = reducers(
          state,
          actions.npmiRemoveMetricFilter({metric: 'nPMI@test'})
        );
        expect(nextState.metricFilters).toEqual({
          'nPMI@second': {
            max: 1.0,
            min: -1.0,
            includeNaN: false,
          },
          'nPMI@third': {
            max: 1.0,
            min: -1.0,
            includeNaN: false,
          },
        });
        expect(nextState.metricArithmetic).toEqual([
          {kind: ArithmeticKind.METRIC, metric: 'nPMI@second'},
          {kind: ArithmeticKind.OPERATOR, operator: Operator.AND},
          {kind: ArithmeticKind.METRIC, metric: 'nPMI@third'},
        ]);
      });

      it('removes a metric filter in the middle', () => {
        const state = createNpmiState({
          metricFilters: {
            'nPMI@test': {
              max: 0.3,
              min: -1.0,
              includeNaN: true,
            },
            'nPMI@second': {
              max: 1.0,
              min: -1.0,
              includeNaN: false,
            },
            'nPMI@third': {
              max: 1.0,
              min: -1.0,
              includeNaN: false,
            },
          },
          metricArithmetic: [
            {kind: ArithmeticKind.METRIC, metric: 'nPMI@test'},
            {kind: ArithmeticKind.OPERATOR, operator: Operator.AND},
            {kind: ArithmeticKind.METRIC, metric: 'nPMI@second'},
            {kind: ArithmeticKind.OPERATOR, operator: Operator.AND},
            {kind: ArithmeticKind.METRIC, metric: 'nPMI@third'},
          ],
        });
        const nextState = reducers(
          state,
          actions.npmiRemoveMetricFilter({metric: 'nPMI@second'})
        );
        expect(nextState.metricFilters).toEqual({
          'nPMI@test': {
            max: 0.3,
            min: -1.0,
            includeNaN: true,
          },
          'nPMI@third': {
            max: 1.0,
            min: -1.0,
            includeNaN: false,
          },
        });
        expect(nextState.metricArithmetic).toEqual([
          {kind: ArithmeticKind.METRIC, metric: 'nPMI@test'},
          {kind: ArithmeticKind.OPERATOR, operator: Operator.AND},
          {kind: ArithmeticKind.METRIC, metric: 'nPMI@third'},
        ]);
      });

      it('does not remove anything if the filter is not active', () => {
        const state = createNpmiState({
          metricFilters: {
            'nPMI@test': {
              max: 0.3,
              min: -1.0,
              includeNaN: true,
            },
            'nPMI@second': {
              max: 1.0,
              min: -1.0,
              includeNaN: false,
            },
            'nPMI@third': {
              max: 1.0,
              min: -1.0,
              includeNaN: false,
            },
          },
          metricArithmetic: [
            {kind: ArithmeticKind.METRIC, metric: 'nPMI@test'},
            {kind: ArithmeticKind.OPERATOR, operator: Operator.AND},
            {kind: ArithmeticKind.METRIC, metric: 'nPMI@second'},
            {kind: ArithmeticKind.OPERATOR, operator: Operator.AND},
            {kind: ArithmeticKind.METRIC, metric: 'nPMI@third'},
          ],
        });
        const nextState = reducers(
          state,
          actions.npmiRemoveMetricFilter({metric: 'nPMI@inactive'})
        );
        expect(nextState.metricFilters).toEqual({
          'nPMI@test': {
            max: 0.3,
            min: -1.0,
            includeNaN: true,
          },
          'nPMI@second': {
            max: 1.0,
            min: -1.0,
            includeNaN: false,
          },
          'nPMI@third': {
            max: 1.0,
            min: -1.0,
            includeNaN: false,
          },
        });
        expect(nextState.metricArithmetic).toEqual([
          {kind: ArithmeticKind.METRIC, metric: 'nPMI@test'},
          {kind: ArithmeticKind.OPERATOR, operator: Operator.AND},
          {kind: ArithmeticKind.METRIC, metric: 'nPMI@second'},
          {kind: ArithmeticKind.OPERATOR, operator: Operator.AND},
          {kind: ArithmeticKind.METRIC, metric: 'nPMI@third'},
        ]);
      });
    });

    describe('Change a Filter', () => {
      it('changes a metric filter', () => {
        const state = createNpmiState({
          metricFilters: {
            'nPMI@test': {
              max: 0.3,
              min: -1.0,
              includeNaN: true,
            },
            'nPMI@second': {
              max: 1.0,
              min: -1.0,
              includeNaN: false,
            },
            'nPMI@third': {
              max: 1.0,
              min: -1.0,
              includeNaN: false,
            },
          },
        });
        const nextState = reducers(
          state,
          actions.npmiMetricFilterChanged({
            metric: 'nPMI@third',
            max: 0.5,
            min: -0.5,
            includeNaN: false,
          })
        );
        expect(nextState.metricFilters).toEqual({
          'nPMI@test': {
            max: 0.3,
            min: -1.0,
            includeNaN: true,
          },
          'nPMI@second': {
            max: 1.0,
            min: -1.0,
            includeNaN: false,
          },
          'nPMI@third': {
            max: 0.5,
            min: -0.5,
            includeNaN: false,
          },
        });
      });

      it('does not change anything if not in metric filters', () => {
        const state = createNpmiState({
          metricFilters: {
            'nPMI@test': {
              max: 0.3,
              min: -1.0,
              includeNaN: true,
            },
            'nPMI@second': {
              max: 1.0,
              min: -1.0,
              includeNaN: false,
            },
            'nPMI@third': {
              max: 1.0,
              min: -1.0,
              includeNaN: false,
            },
          },
        });
        const nextState = reducers(
          state,
          actions.npmiMetricFilterChanged({
            metric: 'nPMI@inactive',
            max: 0.5,
            min: -0.5,
            includeNaN: false,
          })
        );
        expect(nextState.metricFilters).toEqual({
          'nPMI@test': {
            max: 0.3,
            min: -1.0,
            includeNaN: true,
          },
          'nPMI@second': {
            max: 1.0,
            min: -1.0,
            includeNaN: false,
          },
          'nPMI@third': {
            max: 1.0,
            min: -1.0,
            includeNaN: false,
          },
        });
      });
    });
  });

  describe('Annotation Sort', () => {
    it('changes the metric by which to sort', () => {
      const state = createNpmiState();
      const nextState = reducers(
        state,
        actions.npmiAnnotationSortChanged({metric: 'test'})
      );
      expect(nextState.sort).toEqual({
        metric: 'test',
        order: SortOrder.DESCENDING,
      });
    });

    it('changes the sort from up to down', () => {
      const state = createNpmiState({
        sort: {metric: 'test', order: SortOrder.DESCENDING},
      });
      const nextState = reducers(
        state,
        actions.npmiAnnotationSortChanged({metric: 'test'})
      );
      expect(nextState.sort).toEqual({
        metric: 'test',
        order: SortOrder.ASCENDNG,
      });
    });

    it('changes the similarity sort', () => {
      const state = createNpmiState();
      const nextState = reducers(
        state,
        actions.npmiSimilaritySortChanged({annotation: 'test'})
      );
      expect(nextState.sort).toEqual({
        metric: 'test',
        order: SortOrder.SIMILAR,
      });
    });

    it('changes the sort from similar to dissimilar', () => {
      const state = createNpmiState({
        sort: {metric: 'test', order: SortOrder.SIMILAR},
      });
      const nextState = reducers(
        state,
        actions.npmiSimilaritySortChanged({annotation: 'test'})
      );
      expect(nextState.sort).toEqual({
        metric: 'test',
        order: SortOrder.DISSIMILAR,
      });
    });

    it('changes the sort from dissimilar to similar', () => {
      const state = createNpmiState({
        sort: {metric: 'test', order: SortOrder.DISSIMILAR},
      });
      const nextState = reducers(
        state,
        actions.npmiSimilaritySortChanged({annotation: 'test'})
      );
      expect(nextState.sort).toEqual({
        metric: 'test',
        order: SortOrder.SIMILAR,
      });
    });
  });

  describe('UI Preferences', () => {
    it('changes the active view from default to embeddings', () => {
      const state = createNpmiState();
      const nextState = reducers(
        state,
        actions.npmiEmbeddingsViewToggled({metric: 'test'})
      );
      expect(nextState.viewActive).toBe(ViewActive.EMBEDDINGS);
      expect(nextState.embeddingsMetric).toBe('test');
    });

    it('changes the active view from embeddings to default ', () => {
      const state = createNpmiState({
        viewActive: ViewActive.EMBEDDINGS,
        embeddingsMetric: 'test',
      });
      const nextState = reducers(
        state,
        actions.npmiEmbeddingsViewToggled({metric: 'test'})
      );
      expect(nextState.viewActive).toBe(ViewActive.DEFAULT);
      expect(nextState.embeddingsMetric).toBe('');
    });

    it('hides the parallel coordinates view', () => {
      const state = createNpmiState();
      const nextState = reducers(
        state,
        actions.npmiToggleParallelCoordinatesExpanded()
      );
      expect(nextState.pcExpanded).toBeFalse();
    });

    it('shows the hidden parallel coordinates view', () => {
      const state = createNpmiState({pcExpanded: false});
      const nextState = reducers(
        state,
        actions.npmiToggleParallelCoordinatesExpanded()
      );
      expect(nextState.pcExpanded).toBeTrue();
    });

    it('hides the annotations list', () => {
      const state = createNpmiState();
      const nextState = reducers(
        state,
        actions.npmiToggleAnnotationsExpanded()
      );
      expect(nextState.annotationsExpanded).toBeFalse();
    });

    it('shows the hidden annotations list', () => {
      const state = createNpmiState({annotationsExpanded: false});
      const nextState = reducers(
        state,
        actions.npmiToggleAnnotationsExpanded()
      );
      expect(nextState.annotationsExpanded).toBeTrue();
    });

    it('hides the sidebar', () => {
      const state = createNpmiState();
      const nextState = reducers(state, actions.npmiToggleSidebarExpanded());
      expect(nextState.sidebarExpanded).toBeFalse();
    });

    it('shows the hidden sidebar', () => {
      const state = createNpmiState({sidebarExpanded: false});
      const nextState = reducers(state, actions.npmiToggleSidebarExpanded());
      expect(nextState.sidebarExpanded).toBeTrue();
    });

    it('hides the count values', () => {
      const state = createNpmiState();
      const nextState = reducers(state, actions.npmiShowCountsToggled());
      expect(nextState.showCounts).toBeFalse();
    });

    it('shows the hidden count values', () => {
      const state = createNpmiState({showCounts: false});
      const nextState = reducers(state, actions.npmiShowCountsToggled());
      expect(nextState.showCounts).toBeTrue();
    });

    it('shows the hidden annotations', () => {
      const state = createNpmiState();
      const nextState = reducers(
        state,
        actions.npmiShowHiddenAnnotationsToggled()
      );
      expect(nextState.showHiddenAnnotations).toBeTrue();
    });

    it('hides the display of hidden annotations', () => {
      const state = createNpmiState({showHiddenAnnotations: true});
      const nextState = reducers(
        state,
        actions.npmiShowHiddenAnnotationsToggled()
      );
      expect(nextState.showHiddenAnnotations).toBeFalse();
    });

    it('changes the sidebar width', () => {
      const state = createNpmiState();
      const nextState = reducers(
        state,
        actions.npmiSidebarWidthChanged({sidebarWidth: 500})
      );
      expect(nextState.sidebarWidth).toBe(500);
    });

    it('changes the embeddings sidebar width', () => {
      const state = createNpmiState();
      const nextState = reducers(
        state,
        actions.npmiEmbeddingsSidebarWidthChanged({sidebarWidth: 300})
      );
      expect(nextState.embeddingsSidebarWidth).toBe(300);
    });

    it('hides the embeddings sidebar', () => {
      const state = createNpmiState();
      const nextState = reducers(
        state,
        actions.npmiEmbeddingsSidebarExpandedToggled()
      );
      expect(nextState.embeddingsSidebarExpanded).toBeFalse();
    });

    it('shows the hidden embeddings sidebar', () => {
      const state = createNpmiState({embeddingsSidebarExpanded: false});
      const nextState = reducers(
        state,
        actions.npmiEmbeddingsSidebarExpandedToggled()
      );
      expect(nextState.embeddingsSidebarExpanded).toBeTrue();
    });
  });
});
