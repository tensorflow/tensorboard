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
  NPMIState,
  LoadState,
  AnnotationListing,
  MetricListing,
  ValueListing,
  State,
} from './npmi_types';

// HACK: These imports are for type inference.
// https://github.com/bazelbuild/rules_nodejs/issues/1013
/** @typehack */ import * as _typeHackSelector from '@ngrx/store/src/selector';
/** @typehack */ import * as _typeHackStore from '@ngrx/store/store';

const selectNPMIState = createFeatureSelector<State, NPMIState>(
  NPMI_FEATURE_KEY
);

export const getAnnotationsData = createSelector(
  selectNPMIState,
  (state: NPMIState): AnnotationListing => {
    return state.annotationsData;
  }
);

export const getAnnotationsLoaded = createSelector(
  selectNPMIState,
  (state: NPMIState): LoadState => {
    return state.annotationsLoaded;
  }
);

export const getMetricsData = createSelector(
  selectNPMIState,
  (state: NPMIState): MetricListing => {
    return state.metricsData;
  }
);

export const getCountMetricsData = createSelector(
  selectNPMIState,
  (state: NPMIState): MetricListing => {
    return state.countMetricsData;
  }
);

export const getNpmiMetricsData = createSelector(
  selectNPMIState,
  (state: NPMIState): MetricListing => {
    return state.npmiMetricsData;
  }
);

export const getMetricsLoaded = createSelector(
  selectNPMIState,
  (state: NPMIState): LoadState => {
    return state.metricsLoaded;
  }
);

export const getValuesData = createSelector(
  selectNPMIState,
  (state: NPMIState): ValueListing => {
    return state.valuesData;
  }
);

export const getCountValuesData = createSelector(
  selectNPMIState,
  (state: NPMIState): ValueListing => {
    return state.countValuesData;
  }
);

export const getNpmiValuesData = createSelector(
  selectNPMIState,
  (state: NPMIState): ValueListing => {
    return state.npmiValuesData;
  }
);

export const getValuesLoaded = createSelector(
  selectNPMIState,
  (state: NPMIState): LoadState => {
    return state.valuesLoaded;
  }
);
