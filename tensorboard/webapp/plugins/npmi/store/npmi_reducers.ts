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
import * as metricType from '../util/metric_type';
import {
  ArithmeticElement,
  ArithmeticKind,
  DataLoadState,
  MetricListing,
  NpmiState,
  Operator,
  SortOrder,
  ViewActive,
} from './npmi_types';

const initialState: NpmiState = {
  pluginDataLoaded: {
    state: DataLoadState.NOT_LOADED,
    lastLoadedTimeInMs: null,
  },
  annotationData: {},
  embeddingDataSet: undefined,
  runToMetrics: {},
  selectedAnnotations: [],
  flaggedAnnotations: [],
  hiddenAnnotations: [],
  annotationsRegex: '',
  metricsRegex: '',
  metricArithmetic: [],
  metricFilters: {},
  sort: {
    metric: '',
    order: SortOrder.DESCENDING,
  },
  pcExpanded: true,
  annotationsExpanded: true,
  sidebarExpanded: true,
  showCounts: true,
  showHiddenAnnotations: false,
  sidebarWidth: 300,
  viewActive: ViewActive.DEFAULT,
  embeddingsMetric: '',
  embeddingsSidebarWidth: 500,
  embeddingsSidebarExpanded: true,
};

const reducer = createReducer(
  initialState,
  on(actions.npmiPluginDataRequested, (state: NpmiState): NpmiState => {
    return {
      ...state,
      pluginDataLoaded: {
        ...state.pluginDataLoaded,
        state: DataLoadState.LOADING,
      },
    };
  }),
  on(actions.npmiPluginDataRequestFailed, (state: NpmiState): NpmiState => {
    return {
      ...state,
      pluginDataLoaded: {
        ...state.pluginDataLoaded,
        state: DataLoadState.FAILED,
      },
    };
  }),
  on(
    actions.npmiPluginDataLoaded,
    (
      state: NpmiState,
      {annotationData, metrics, embeddingDataSet}
    ): NpmiState => {
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
        embeddingDataSet: embeddingDataSet,
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
  on(actions.npmiClearSelectedAnnotations, (state: NpmiState): NpmiState => {
    return {
      ...state,
      selectedAnnotations: [],
    };
  }),
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
  on(actions.npmiAddMetricFilter, (state: NpmiState, {metric}): NpmiState => {
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
        order: SortOrder.DESCENDING,
      },
    };
  }),
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
    actions.npmiMetricFilterChanged,
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
    actions.npmiAnnotationSortChanged,
    (state: NpmiState, {metric}): NpmiState => {
      const newSort = {
        metric: metric,
        order: SortOrder.DESCENDING,
      };
      if (
        state.sort.metric === metric &&
        state.sort.order === SortOrder.DESCENDING
      ) {
        newSort.order = SortOrder.ASCENDNG;
      }
      return {
        ...state,
        sort: newSort,
      };
    }
  ),
  on(
    actions.npmiSimilaritySortChanged,
    (state: NpmiState, {annotation}): NpmiState => {
      const newSort = {
        metric: annotation,
        order: SortOrder.SIMILAR,
      };
      if (
        state.sort.metric === annotation &&
        state.sort.order === SortOrder.SIMILAR
      ) {
        newSort.order = SortOrder.DISSIMILAR;
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
  on(actions.npmiToggleAnnotationsExpanded, (state: NpmiState): NpmiState => {
    return {
      ...state,
      annotationsExpanded: !state.annotationsExpanded,
    };
  }),
  on(actions.npmiToggleSidebarExpanded, (state: NpmiState): NpmiState => {
    return {
      ...state,
      sidebarExpanded: !state.sidebarExpanded,
    };
  }),
  on(actions.npmiShowCountsToggled, (state: NpmiState): NpmiState => {
    return {
      ...state,
      showCounts: !state.showCounts,
    };
  }),
  on(
    actions.npmiShowHiddenAnnotationsToggled,
    (state: NpmiState): NpmiState => {
      return {
        ...state,
        showHiddenAnnotations: !state.showHiddenAnnotations,
      };
    }
  ),
  on(
    actions.npmiEmbeddingsViewToggled,
    (state: NpmiState, {metric}): NpmiState => {
      let viewActive = ViewActive.EMBEDDINGS;
      let newMetric = metric;
      if (metric === state.embeddingsMetric) {
        viewActive = ViewActive.DEFAULT;
        newMetric = '';
      }
      return {
        ...state,
        viewActive: viewActive,
        embeddingsMetric: newMetric,
      };
    }
  ),
  on(
    actions.npmiSidebarWidthChanged,
    (state: NpmiState, {sidebarWidth}): NpmiState => {
      return {
        ...state,
        sidebarWidth,
      };
    }
  ),
  on(
    actions.npmiEmbeddingsSidebarWidthChanged,
    (state: NpmiState, {sidebarWidth}): NpmiState => {
      return {
        ...state,
        embeddingsSidebarWidth: sidebarWidth,
      };
    }
  ),
  on(
    actions.npmiEmbeddingsSidebarExpandedToggled,
    (state: NpmiState): NpmiState => {
      return {
        ...state,
        embeddingsSidebarExpanded: !state.embeddingsSidebarExpanded,
      };
    }
  ),
  on(
    actions.embeddingDataSetChanged,
    (state: NpmiState, {dataSet}): NpmiState => {
      return {
        ...state,
        embeddingDataSet: dataSet,
      };
    }
  )
);

export function reducers(state: NpmiState, action: Action) {
  return reducer(state, action);
}
