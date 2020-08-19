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
import {Action, createReducer, on} from '@ngrx/store';

import * as actions from '../actions';
import {
  NpmiState,
  DataLoadState,
  MetricListing,
  SortingOrder,
  ArithmeticElement,
  Operator,
} from './npmi_types';
import * as metricType from '../util/metric_type';

// HACK: These imports are for type inference.
// https://github.com/bazelbuild/rules_nodejs/issues/1013
/** @typehack */ import * as _typeHackStore from '@ngrx/store/store';

const initialState: NpmiState = {
  pluginDataLoaded: {
    state: DataLoadState.NOT_LOADED,
    lastLoadedTimeInMs: null,
  },
  annotationData: {},
  runToMetrics: {},
  selectedAnnotations: [],
  flaggedAnnotations: [],
  hiddenAnnotations: [],
  annotationsRegex: '',
  metricsRegex: '',
  metricArithmetic: [],
  metricFilters: {},
  sorting: {
    metric: '',
    order: SortingOrder.DOWN,
  },
  pcExpanded: true,
  annotationsExpanded: true,
  sidebarExpanded: true,
  showCounts: true,
  showHiddenAnnotations: false,
  sidebarWidth: 300,
};

const reducer = createReducer(
  initialState,
  on(
    actions.npmiPluginDataRequested,
    (state: NpmiState): NpmiState => {
      return {
        ...state,
        pluginDataLoaded: {
          ...state.pluginDataLoaded,
          state: DataLoadState.LOADING,
        },
      };
    }
  ),
  on(
    actions.npmiPluginDataRequestFailed,
    (state: NpmiState): NpmiState => {
      return {
        ...state,
        pluginDataLoaded: {
          ...state.pluginDataLoaded,
          state: DataLoadState.FAILED,
        },
      };
    }
  ),
  on(
    actions.npmiPluginDataLoaded,
    (state: NpmiState, {annotationData, metrics}): NpmiState => {
      const runToMetrics: MetricListing = {};
      for (const key in metrics) {
        // Init Metrics Data
        runToMetrics[key] = [];
        for (const value of metrics[key]) {
          if (metricType.metricIsNpmi(value)) {
            runToMetrics[key].push(value);
          }
        }
      }
      return {
        ...state,
        runToMetrics: runToMetrics,
        annotationData: annotationData,
        pluginDataLoaded: {
          state: DataLoadState.LOADED,
          lastLoadedTimeInMs: Date.now(),
        },
      };
    }
  ),
  on(
    actions.addSelectedAnnotations,
    (state: NpmiState, {annotations}): NpmiState => {
      let addedAnnotations: string[] = annotations.filter(
        (annotation) => !state.selectedAnnotations.includes(annotation)
      );
      return {
        ...state,
        selectedAnnotations: [
          ...state.selectedAnnotations,
          ...addedAnnotations,
        ],
      };
    }
  ),
  on(
    actions.removeSelectedAnnotation,
    (state: NpmiState, {annotation}): NpmiState => {
      let annotationIndex = state.selectedAnnotations.indexOf(annotation);
      return {
        ...state,
        selectedAnnotations: [
          ...state.selectedAnnotations.slice(0, annotationIndex),
          ...state.selectedAnnotations.slice(annotationIndex + 1),
        ],
      };
    }
  ),
  on(
    actions.setSelectedAnnotations,
    (state: NpmiState, {annotations}): NpmiState => {
      return {
        ...state,
        selectedAnnotations: annotations,
      };
    }
  ),
  on(
    actions.clearSelectedAnnotations,
    (state: NpmiState): NpmiState => {
      return {
        ...state,
        selectedAnnotations: [],
      };
    }
  ),
  on(
    actions.flagAnnotations,
    (state: NpmiState, {annotations}): NpmiState => {
      let notFlagged: string[] = annotations.filter(
        (annotation) => !state.flaggedAnnotations.includes(annotation)
      );
      if (notFlagged.length === 0) {
        // If all annotations are already flagged, user wants to remove them
        const filteredFlags = state.flaggedAnnotations.filter(
          (annotation) => !annotations.includes(annotation)
        );
        return {
          ...state,
          flaggedAnnotations: filteredFlags,
        };
      } else {
        // User wants to add to flagged annotations
        return {
          ...state,
          flaggedAnnotations: [...state.flaggedAnnotations, ...notFlagged],
        };
      }
    }
  ),
  on(
    actions.hideAnnotations,
    (state: NpmiState, {annotations}): NpmiState => {
      let notHidden: string[] = annotations.filter(
        (annotation) => !state.hiddenAnnotations.includes(annotation)
      );
      if (notHidden.length === 0) {
        // If all annotations are already hidden, user wants to remove them
        const filteredHidden = state.hiddenAnnotations.filter(
          (annotation) => !annotations.includes(annotation)
        );
        return {
          ...state,
          hiddenAnnotations: filteredHidden,
        };
      } else {
        // User wants to add to flagged annotations
        return {
          ...state,
          hiddenAnnotations: [...state.hiddenAnnotations, ...notHidden],
        };
      }
    }
  ),
  on(
    actions.annotationsRegexChanged,
    (state: NpmiState, {regex}): NpmiState => {
      return {
        ...state,
        annotationsRegex: regex,
      };
    }
  ),
  on(
    actions.metricsRegexChanged,
    (state: NpmiState, {regex}): NpmiState => {
      return {
        ...state,
        metricsRegex: regex,
      };
    }
  ),
  on(
    actions.addMetricFilter,
    (state: NpmiState, {metric}): NpmiState => {
      // Only add if not already in active filters
      const filter = state.metricFilters[metric];
      if (filter === undefined) {
        // Add so that arithmetic is still correct
        let newContent: ArithmeticElement[] = [];
        if (state.metricArithmetic.length !== 0) {
          newContent.push({kind: 'operator', operator: Operator.AND});
        }
        newContent.push({kind: 'metric', metric: metric});
        return {
          ...state,
          metricArithmetic: [...state.metricArithmetic, ...newContent],
          metricFilters: {
            ...state.metricFilters,
            [metric]: {
              max: 1.0,
              min: -1.0,
              includeNaN: false,
            },
          },
        };
      } else {
        return state;
      }
    }
  ),
  on(
    actions.removeMetricFilter,
    (state: NpmiState, {metric}): NpmiState => {
      if (state.metricFilters[metric] !== undefined) {
        // Remove the correct elements of the arithmetic as well
        let arithmeticIndex = 0;
        let startSlice = 0;
        let endSlice = 2;
        let {[metric]: value, ...map} = state.metricFilters;
        for (let index in state.metricArithmetic) {
          const element = state.metricArithmetic[index];
          if (element.kind === 'metric') {
            if (element.metric === metric) {
              arithmeticIndex = parseInt(index);
            }
          }
        }
        if (arithmeticIndex !== 0) {
          startSlice = arithmeticIndex - 1;
          endSlice = arithmeticIndex + 1;
        }
        return {
          ...state,
          metricArithmetic: [
            ...state.metricArithmetic.slice(0, startSlice),
            ...state.metricArithmetic.slice(endSlice),
          ],
          metricFilters: map,
        };
      } else {
        return state;
      }
    }
  ),
  on(
    actions.changeMetricFilter,
    (state: NpmiState, {metric, max, min, includeNaN}): NpmiState => {
      return {
        ...state,
        metricFilters: {
          ...state.metricFilters,
          [metric]: {
            max: max,
            min: min,
            includeNaN: includeNaN,
          },
        },
      };
    }
  ),
  on(
    actions.changeAnnotationSorting,
    (state: NpmiState, {sorting}): NpmiState => {
      return {
        ...state,
        sorting,
      };
    }
  ),
  on(
    actions.togglePCExpanded,
    (state: NpmiState): NpmiState => {
      return {
        ...state,
        pcExpanded: !state.pcExpanded,
      };
    }
  ),
  on(
    actions.toggleAnnotationsExpanded,
    (state: NpmiState): NpmiState => {
      return {
        ...state,
        annotationsExpanded: !state.annotationsExpanded,
      };
    }
  ),
  on(
    actions.toggleSidebarExpanded,
    (state: NpmiState): NpmiState => {
      return {
        ...state,
        sidebarExpanded: !state.sidebarExpanded,
      };
    }
  ),

  on(
    actions.toggleShowCounts,
    (state: NpmiState): NpmiState => {
      return {
        ...state,
        showCounts: !state.showCounts,
      };
    }
  ),
  on(
    actions.toggleShowHiddenAnnotations,
    (state: NpmiState): NpmiState => {
      return {
        ...state,
        showHiddenAnnotations: !state.showHiddenAnnotations,
      };
    }
  ),
  on(
    actions.changeSidebarWidth,
    (state: NpmiState, {sidebarWidth}): NpmiState => {
      return {
        ...state,
        sidebarWidth,
      };
    }
  )
);

export function reducers(state: NpmiState, action: Action) {
  return reducer(state, action);
}
