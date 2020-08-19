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
  MetricListing,
  AnnotationSorting,
} from '../store/npmi_types';

// HACK: Below import is for type inference.
// https://github.com/bazelbuild/rules_nodejs/issues/1013
/** @typehack */ import * as _typeHackModels from '@ngrx/store/src/models';

/**
 * Actions for the NPMI Component.
 */
export const npmiLoaded = createAction('[NPMI] nPMI Loaded');

export const npmiUnloaded = createAction('[NPMI] nPMI Unloaded');

export const npmiPluginDataRequested = createAction(
  '[NPMI] nPMI Plugin Data Requested'
);

export const npmiPluginDataLoaded = createAction(
  '[NPMI] nPMI Plugin Data Loaded',
  props<{
    annotationData: AnnotationDataListing;
    metrics: MetricListing;
  }>()
);

export const npmiPluginDataRequestFailed = createAction(
  '[NPMI] nPMI Plugin Data Request Failed'
);

export const addSelectedAnnotations = createAction(
  '[NPMI] Adding Annotations to Selected',
  props<{annotations: string[]}>()
);

export const removeSelectedAnnotation = createAction(
  '[NPMI] Annotation Removed from Selected',
  props<{annotation: string}>()
);

export const setSelectedAnnotations = createAction(
  '[NPMI] Annotations set',
  props<{annotations: string[]}>()
);

export const clearAnnotationSelection = createAction(
  '[NPMI] Clearing the Annotation Selection'
);

export const flagAnnotations = createAction(
  '[NPMI] Adding/Removing Annotations to/from Flagged',
  props<{annotations: string[]}>()
);

export const hideAnnotations = createAction(
  '[NPMI] Adding/Removing Annotations to/from Hidden',
  props<{annotations: string[]}>()
);

export const annotationsRegexChanged = createAction(
  '[NPMI] Annotations Regex Changed',
  props<{regex: string}>()
);

export const metricsRegexChanged = createAction(
  '[NPMI] Metrics Regex Changed',
  props<{regex: string}>()
);

export const addMetricFilter = createAction(
  '[NPMI] Metric Filter Added',
  props<{metric: string}>()
);

export const removeMetricFilter = createAction(
  '[NPMI] Metric Filter Removed',
  props<{metric: string}>()
);

export const changeMetricFilter = createAction(
  '[NPMI] Metric Filter Changed',
  props<{metric: string; max: number; min: number; includeNaN: boolean}>()
);

export const changeAnnotationSorting = createAction(
  '[NPMI] Change Annotation Sorting',
  props<{sorting: AnnotationSorting}>()
);

export const togglePCExpanded = createAction('[NPMI] Toggle PC Expanded');

export const toggleAnnotationsExpanded = createAction(
  '[NPMI] Toggle Annotations Expanded'
);

export const toggleSidebarExpanded = createAction(
  '[NPMI] Toggle Sidebar Expanded'
);

export const toggleShowCounts = createAction('[NPMI] Toggle Show Counts');

export const toggleShowHiddenAnnotations = createAction(
  '[NPMI] Toggle Show Hidden Annotations'
);

export const changeSidebarWidth = createAction(
  '[NPMI] Change Sidebar Width',
  props<{sidebarWidth: number}>()
);
