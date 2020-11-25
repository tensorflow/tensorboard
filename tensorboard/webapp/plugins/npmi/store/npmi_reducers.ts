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
  SortOrder,
  ArithmeticElement,
  Operator,
  ArithmeticKind,
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
  embeddingData: {},
  selectedAnnotations: [],
  flaggedAnnotations: [],
  hiddenAnnotations: [],
  annotationsRegex: '',
  metricsRegex: '',
  metricArithmetic: [],
  metricFilters: {},
  sort: {
    metric: '',
    order: SortOrder.DOWN,
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
    (state: NpmiState, {annotationData, metrics, embeddingData}): NpmiState => {
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
        embeddingData: embeddingData,
        pluginDataLoaded: {
          state: DataLoadState.LOADED,
          lastLoadedTimeInMs: Date.now(),
        },
      };
    }
  ),
  on(
    actions.npmiToggleSelectedAnnotations,
    (state: NpmiState, {annotations}): NpmiState => {
      const combinedSelectedAnnotations = new Set([
        ...state.selectedAnnotations,
        ...annotations,
      ]);
      if (
        combinedSelectedAnnotations.size === state.selectedAnnotations.length
      ) {
        // If all annotations are already flagged, user wants to remove them
        for (const annotation of annotations) {
          combinedSelectedAnnotations.delete(annotation);
        }
      }
      return {
        ...state,
        selectedAnnotations: [...combinedSelectedAnnotations],
      };
    }
  ),
  on(
    actions.npmiSetSelectedAnnotations,
    (state: NpmiState, {annotations}): NpmiState => {
      return {
        ...state,
        selectedAnnotations: annotations,
      };
    }
  ),
  on(
    actions.npmiClearSelectedAnnotations,
    (state: NpmiState): NpmiState => {
      return {
        ...state,
        selectedAnnotations: [],
      };
    }
  ),
  on(
    actions.npmiToggleAnnotationFlags,
    (state: NpmiState, {annotations}): NpmiState => {
      const combinedFlaggedAnnotations = new Set([
        ...state.flaggedAnnotations,
        ...annotations,
      ]);
      if (combinedFlaggedAnnotations.size === state.flaggedAnnotations.length) {
        // If all annotations are already flagged, user wants to remove them
        for (const annotation of annotations) {
          combinedFlaggedAnnotations.delete(annotation);
        }
      }
      return {
        ...state,
        flaggedAnnotations: [...combinedFlaggedAnnotations],
        selectedAnnotations: [],
      };
    }
  ),
  on(
    actions.npmiToggleAnnotationsHidden,
    (state: NpmiState, {annotations}): NpmiState => {
      const combinedHiddenAnnotations = new Set([
        ...state.hiddenAnnotations,
        ...annotations,
      ]);
      if (combinedHiddenAnnotations.size === state.hiddenAnnotations.length) {
        // If all annotations are already flagged, user wants to remove them
        for (const annotation of annotations) {
          combinedHiddenAnnotations.delete(annotation);
        }
      }
      return {
        ...state,
        hiddenAnnotations: [...combinedHiddenAnnotations],
        selectedAnnotations: [],
      };
    }
  ),
  on(
    actions.npmiAnnotationsRegexChanged,
    (state: NpmiState, {regex}): NpmiState => {
      return {
        ...state,
        annotationsRegex: regex,
      };
    }
  ),
  on(
    actions.npmiMetricsRegexChanged,
    (state: NpmiState, {regex}): NpmiState => {
      return {
        ...state,
        metricsRegex: regex,
      };
    }
  ),
  on(
    actions.npmiAddMetricFilter,
    (state: NpmiState, {metric}): NpmiState => {
      // Only add if not already in active filters
      if (state.metricFilters[metric]) {
        return state;
      }
      // Add so that arithmetic is still correct
      const newContent: ArithmeticElement[] = [];
      if (state.metricArithmetic.length !== 0) {
        newContent.push({
          kind: ArithmeticKind.OPERATOR,
          operator: Operator.AND,
        });
      }
      newContent.push({kind: ArithmeticKind.METRIC, metric: metric});
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
        sort: {
          metric,
          order: SortOrder.DOWN,
        },
      };
    }
  ),
  on(
    actions.npmiRemoveMetricFilter,
    (state: NpmiState, {metric}): NpmiState => {
      if (!state.metricFilters[metric]) {
        return state;
      }
      // Remove the correct elements of the arithmetic as well
      let arithmeticIndex = 0;
      let startSlice = 0;
      let endSlice = 2;
      const {[metric]: value, ...map} = state.metricFilters;
      for (const index in state.metricArithmetic) {
        const element = state.metricArithmetic[index];
        if (element.kind === ArithmeticKind.METRIC) {
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
    }
  ),
  on(
    actions.npmiChangeMetricFilter,
    (state: NpmiState, {metric, max, min, includeNaN}): NpmiState => {
      if (!state.metricFilters[metric]) {
        return state;
      }
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
    actions.npmiChangeAnnotationSort,
    (state: NpmiState, {metric}): NpmiState => {
      const newSort = {
        metric: metric,
        order: SortOrder.DOWN,
      };
      if (state.sort.metric === metric && state.sort.order === SortOrder.DOWN) {
        newSort.order = SortOrder.UP;
      }
      return {
        ...state,
        sort: newSort,
      };
    }
  ),
  on(
    actions.npmiToggleParallelCoordinatesExpanded,
    (state: NpmiState): NpmiState => {
      return {
        ...state,
        pcExpanded: !state.pcExpanded,
      };
    }
  ),
  on(
    actions.npmiToggleAnnotationsExpanded,
    (state: NpmiState): NpmiState => {
      return {
        ...state,
        annotationsExpanded: !state.annotationsExpanded,
      };
    }
  ),
  on(
    actions.npmiToggleSidebarExpanded,
    (state: NpmiState): NpmiState => {
      return {
        ...state,
        sidebarExpanded: !state.sidebarExpanded,
      };
    }
  ),

  on(
    actions.npmiToggleShowCounts,
    (state: NpmiState): NpmiState => {
      return {
        ...state,
        showCounts: !state.showCounts,
      };
    }
  ),
  on(
    actions.npmiToggleShowHiddenAnnotations,
    (state: NpmiState): NpmiState => {
      return {
        ...state,
        showHiddenAnnotations: !state.showHiddenAnnotations,
      };
    }
  ),
  on(
    actions.npmiChangeSidebarWidth,
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
