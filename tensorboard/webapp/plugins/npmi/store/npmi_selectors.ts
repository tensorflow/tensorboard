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

import {createSelector, createFeatureSelector} from '@ngrx/store';
import {
  NPMI_FEATURE_KEY,
  NpmiState,
  LoadState,
  AnnotationListing,
  MetricListing,
  ValueListing,
  State,
  SummaryListing,
} from './npmi_types';

// HACK: These imports are for type inference.
// https://github.com/bazelbuild/rules_nodejs/issues/1013
/** @typehack */ import * as _typeHackSelector from '@ngrx/store/src/selector';
/** @typehack */ import * as _typeHackStore from '@ngrx/store/store';

const selectNpmiState = createFeatureSelector<State, NpmiState>(
  NPMI_FEATURE_KEY
);

export const getAnnotationsData = createSelector(
  selectNpmiState,
  (state: NpmiState): AnnotationListing => {
    return state.annotationsData;
  }
);

export const getAnnotationsLoaded = createSelector(
  selectNpmiState,
  (state: NpmiState): LoadState => {
    return state.annotationsLoaded;
  }
);

export const getMetricsData = createSelector(
  selectNpmiState,
  (state: NpmiState): MetricListing => {
    return state.metricsData;
  }
);

export const getCountMetricsData = createSelector(
  selectNpmiState,
  (state: NpmiState): MetricListing => {
    return state.countMetricsData;
  }
);

export const getNpmiMetricsData = createSelector(
  selectNpmiState,
  (state: NpmiState): MetricListing => {
    return state.npmiMetricsData;
  }
);

export const getMetricsLoaded = createSelector(
  selectNpmiState,
  (state: NpmiState): LoadState => {
    return state.metricsLoaded;
  }
);

export const getValuesData = createSelector(
  selectNpmiState,
  (state: NpmiState): ValueListing => {
    return state.valuesData;
  }
);

export const getCountValuesData = createSelector(
  selectNpmiState,
  (state: NpmiState): ValueListing => {
    return state.countValuesData;
  }
);

export const getNpmiValuesData = createSelector(
  selectNpmiState,
  (state: NpmiState): ValueListing => {
    return state.npmiValuesData;
  }
);

export const getValuesLoaded = createSelector(
  selectNpmiState,
  (state: NpmiState): LoadState => {
    return state.valuesLoaded;
  }
);

export const getCountData = createSelector(
  selectNpmiState,
  (state: NpmiState): SummaryListing => {
    return state.countData;
  }
);
