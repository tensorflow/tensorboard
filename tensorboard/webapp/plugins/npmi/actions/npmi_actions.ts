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
import {createAction, props} from '@ngrx/store';
import {
  AnnotationDataListing,
  EmbeddingDataSet,
  MetricListing,
} from '../store/npmi_types';

/**
 * Actions for the NPMI Component.
 */
export const npmiLoaded = createAction('[NPMI] nPMI Loaded');

export const npmiPluginDataRequested = createAction(
  '[NPMI] nPMI Plugin Data Requested'
);

export const npmiPluginDataLoaded = createAction(
  '[NPMI] nPMI Plugin Data Loaded',
  props<{
    annotationData: AnnotationDataListing;
    metrics: MetricListing;
    embeddingDataSet: EmbeddingDataSet | undefined;
  }>()
);

export const npmiPluginDataRequestFailed = createAction(
  '[NPMI] nPMI Plugin Data Request Failed'
);

export const npmiToggleSelectedAnnotations = createAction(
  '[NPMI] Adding/Removing Annotations to/from Selected',
  props<{annotations: string[]}>()
);

export const npmiSetSelectedAnnotations = createAction(
  '[NPMI] Annotations Set',
  props<{annotations: string[]}>()
);

export const npmiClearSelectedAnnotations = createAction(
  '[NPMI] Clearing the Annotation Selection'
);

export const npmiToggleAnnotationFlags = createAction(
  '[NPMI] Adding/Removing Annotations to/from Flagged',
  props<{annotations: string[]}>()
);

export const npmiToggleAnnotationsHidden = createAction(
  '[NPMI] Adding/Removing Annotations to/from Hidden',
  props<{annotations: string[]}>()
);

export const npmiAnnotationsRegexChanged = createAction(
  '[NPMI] Annotations Regex Changed',
  props<{regex: string}>()
);

export const npmiMetricsRegexChanged = createAction(
  '[NPMI] Metrics Regex Changed',
  props<{regex: string}>()
);

export const npmiAddMetricFilter = createAction(
  '[NPMI] Metric Filter Added',
  props<{metric: string}>()
);

export const npmiRemoveMetricFilter = createAction(
  '[NPMI] Metric Filter Removed',
  props<{metric: string}>()
);

export const npmiMetricFilterChanged = createAction(
  '[NPMI] Metric Filter Changed',
  props<{metric: string; max: number; min: number; includeNaN: boolean}>()
);

export const npmiAnnotationSortChanged = createAction(
  '[NPMI] Annotation Sort Changed',
  props<{metric: string}>()
);

export const npmiSimilaritySortChanged = createAction(
  '[NPMI] Similarity Sort Changed',
  props<{annotation: string}>()
);

export const npmiToggleParallelCoordinatesExpanded = createAction(
  '[NPMI] Toggle PC Expanded'
);

export const npmiToggleAnnotationsExpanded = createAction(
  '[NPMI] Toggle Annotations Expanded'
);

export const npmiToggleSidebarExpanded = createAction(
  '[NPMI] Toggle Sidebar Expanded'
);

export const npmiShowCountsToggled = createAction('[NPMI] Show Counts Toggled');

export const npmiShowHiddenAnnotationsToggled = createAction(
  '[NPMI] Show Hidden Annotations Toggled'
);

export const npmiEmbeddingsViewToggled = createAction(
  '[NPMI] Embeddings View Toggled',
  props<{metric: string}>()
);

export const npmiSidebarWidthChanged = createAction(
  '[NPMI] Sidebar Width Changed',
  props<{sidebarWidth: number}>()
);

export const npmiEmbeddingsSidebarWidthChanged = createAction(
  '[NPMI] Embeddings Sidebar Width Changed',
  props<{sidebarWidth: number}>()
);

export const npmiEmbeddingsSidebarExpandedToggled = createAction(
  '[NPMI] Embeddings Sidebar Expanded Toggled'
);

export const embeddingDataSetChanged = createAction(
  '[NPMI] Change Embedding DataSet',
  props<{dataSet: EmbeddingDataSet}>()
);
