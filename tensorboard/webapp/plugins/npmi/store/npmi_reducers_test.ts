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
import {reducers} from './npmi_reducers';
import {DataLoadState, Operator, SortingOrder} from './npmi_types';
import {createNpmiState} from '../testing';

describe('npmi_reducers', () => {
  describe('Data loading', () => {
    it('sets pluginDataLoaded to loading on requesting Data', () => {
      const state = createNpmiState();
      const nextState = reducers(state, actions.npmiPluginDataRequested());
      expect(nextState.pluginDataLoaded.state).toBe(DataLoadState.LOADING);
      expect(nextState.pluginDataLoaded.lastLoadedTimeInMs).toBeNull();
    });

    it('set pluginDataLoaded to failed on request failure', () => {
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

    it('sets pluginDataLoaded & plugin Data on successful load', () => {
      const state = createNpmiState();
      const t0 = Date.now();
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
    });

    it('overrides existing annotations on successful annotations loading', () => {
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
    });
  });

  describe('Annotation Selection', () => {
    it('select annotations without duplicates', () => {
      const state = createNpmiState({
        selectedAnnotations: ['annotation_1'],
      });
      const nextState = reducers(
        state,
        actions.npmiAddSelectedAnnotations({
          annotations: ['annotation_1', 'annotation_2'],
        })
      );
      expect(nextState.selectedAnnotations).toEqual([
        'annotation_1',
        'annotation_2',
      ]);
    });

    it('remove a selected annotation', () => {
      const state = createNpmiState({
        selectedAnnotations: ['annotation_1', 'annotation_2'],
      });
      const nextState = reducers(
        state,
        actions.npmiRemoveSelectedAnnotation({annotation: 'annotation_1'})
      );
      expect(nextState.selectedAnnotations).toEqual(['annotation_2']);
    });

    it('set the selected annotations', () => {
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

    it('clear selected annotations', () => {
      const state = createNpmiState({
        selectedAnnotations: ['annotation_1', 'annotation_2'],
      });
      const nextState = reducers(state, actions.npmiClearSelectedAnnotations());
      expect(nextState.selectedAnnotations).toEqual([]);
    });
  });

  describe('Annotation Flagging', () => {
    it('flag annotations with no annotation flagged', () => {
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

    it('flagging annotations with some already flagged', () => {
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

    it('all annotations flagged => remove them', () => {
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
    it('hide annotations with no annotation hidden', () => {
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

    it('hiding annotations with some already hidden', () => {
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

    it('all annotations hidden => remove them', () => {
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
    it('annotation regex changes', () => {
      const state = createNpmiState({annotationsRegex: 'test'});
      const nextState = reducers(
        state,
        actions.npmiAnnotationsRegexChanged({regex: 'new_regex'})
      );
      expect(nextState.annotationsRegex).toBe('new_regex');
    });

    it('metrics regex changes', () => {
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
      it('adding new metric filter with none present', () => {
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
          {kind: 'metric', metric: 'nPMI@test'},
        ]);
      });

      it('adding new metric filter after the first one', () => {
        const state = createNpmiState({
          metricFilters: {
            'nPMI@test': {
              max: 0.3,
              min: -1.0,
              includeNaN: true,
            },
          },
          metricArithmetic: [{kind: 'metric', metric: 'nPMI@test'}],
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
          {kind: 'metric', metric: 'nPMI@test'},
          {kind: 'operator', operator: Operator.AND},
          {kind: 'metric', metric: 'nPMI@second'},
        ]);
      });
    });

    describe('Removing Filters', () => {
      it('removing last remaining metric filter', () => {
        const state = createNpmiState({
          metricFilters: {
            'nPMI@test': {
              max: 0.3,
              min: -1.0,
              includeNaN: true,
            },
          },
          metricArithmetic: [{kind: 'metric', metric: 'nPMI@test'}],
        });
        const nextState = reducers(
          state,
          actions.npmiRemoveMetricFilter({metric: 'nPMI@test'})
        );
        expect(nextState.metricFilters).toEqual({});
        expect(nextState.metricArithmetic).toEqual([]);
      });

      it('removing the first metric filter of more', () => {
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
            {kind: 'metric', metric: 'nPMI@test'},
            {kind: 'operator', operator: Operator.AND},
            {kind: 'metric', metric: 'nPMI@second'},
            {kind: 'operator', operator: Operator.AND},
            {kind: 'metric', metric: 'nPMI@third'},
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
          {kind: 'metric', metric: 'nPMI@second'},
          {kind: 'operator', operator: Operator.AND},
          {kind: 'metric', metric: 'nPMI@third'},
        ]);
      });

      it('removing a metric filter in the middle', () => {
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
            {kind: 'metric', metric: 'nPMI@test'},
            {kind: 'operator', operator: Operator.AND},
            {kind: 'metric', metric: 'nPMI@second'},
            {kind: 'operator', operator: Operator.AND},
            {kind: 'metric', metric: 'nPMI@third'},
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
          {kind: 'metric', metric: 'nPMI@test'},
          {kind: 'operator', operator: Operator.AND},
          {kind: 'metric', metric: 'nPMI@third'},
        ]);
      });
    });

    describe('Change a Filter', () => {
      it('change a metric filter', () => {
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
          actions.npmiChangeMetricFilter({
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
    });
  });

  describe('Annotation Sorting', () => {
    it('change sorting', () => {
      const state = createNpmiState();
      const nextState = reducers(
        state,
        actions.npmiChangeAnnotationSorting({
          sorting: {metric: 'test', order: SortingOrder.UP},
        })
      );
      expect(nextState.sorting).toEqual({
        metric: 'test',
        order: SortingOrder.UP,
      });
    });
  });

  describe('UI Preferences', () => {
    it('hide PC', () => {
      const state = createNpmiState();
      const nextState = reducers(
        state,
        actions.npmiToggleParallelCoordinatesExpanded()
      );
      expect(nextState.pcExpanded).toBeFalse();
    });

    it('show hidden PC', () => {
      const state = createNpmiState({pcExpanded: false});
      const nextState = reducers(
        state,
        actions.npmiToggleParallelCoordinatesExpanded()
      );
      expect(nextState.pcExpanded).toBeTrue();
    });

    it('hide annotations list', () => {
      const state = createNpmiState();
      const nextState = reducers(
        state,
        actions.npmiToggleAnnotationsExpanded()
      );
      expect(nextState.annotationsExpanded).toBeFalse();
    });

    it('show hidden annotations list', () => {
      const state = createNpmiState({annotationsExpanded: false});
      const nextState = reducers(
        state,
        actions.npmiToggleAnnotationsExpanded()
      );
      expect(nextState.annotationsExpanded).toBeTrue();
    });

    it('hide sidebar', () => {
      const state = createNpmiState();
      const nextState = reducers(state, actions.npmiToggleSidebarExpanded());
      expect(nextState.sidebarExpanded).toBeFalse();
    });

    it('show hidden sidebar', () => {
      const state = createNpmiState({sidebarExpanded: false});
      const nextState = reducers(state, actions.npmiToggleSidebarExpanded());
      expect(nextState.sidebarExpanded).toBeTrue();
    });

    it('hide counts', () => {
      const state = createNpmiState();
      const nextState = reducers(state, actions.npmiToggleShowCounts());
      expect(nextState.showCounts).toBeFalse();
    });

    it('show counts', () => {
      const state = createNpmiState({showCounts: false});
      const nextState = reducers(state, actions.npmiToggleShowCounts());
      expect(nextState.showCounts).toBeTrue();
    });

    it('show hidden annotations', () => {
      const state = createNpmiState();
      const nextState = reducers(
        state,
        actions.npmiToggleShowHiddenAnnotations()
      );
      expect(nextState.showHiddenAnnotations).toBeTrue();
    });

    it('dont show hidden annotations', () => {
      const state = createNpmiState({showHiddenAnnotations: true});
      const nextState = reducers(
        state,
        actions.npmiToggleShowHiddenAnnotations()
      );
      expect(nextState.showHiddenAnnotations).toBeFalse();
    });

    it('change sidebar width', () => {
      const state = createNpmiState();
      const nextState = reducers(
        state,
        actions.npmiChangeSidebarWidth({sidebarWidth: 500})
      );
      expect(nextState.sidebarWidth).toBe(500);
    });
  });
});
