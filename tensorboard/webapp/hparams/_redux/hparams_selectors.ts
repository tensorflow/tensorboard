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
import {createFeatureSelector, createSelector} from '@ngrx/store';

import {DiscreteFilter, IntervalFilter} from '../types';
import {
  HparamsMetricsAndFilters,
  HparamsState,
  HPARAMS_FEATURE_KEY,
  State,
} from './hparams_types';

/** @typehack */ import * as _typeHackNgrxStoreStore from '@ngrx/store/store';

const getHparamsState = createFeatureSelector<State, HparamsState>(
  HPARAMS_FEATURE_KEY
);

const getHparamsForExperiment = createSelector(
  getHparamsState,
  (
    state: HparamsState,
    experimentId: string
  ): HparamsMetricsAndFilters | undefined => {
    return state.data[experimentId];
  }
);

// Cheap identity selectors to skip recomputing selectors.
const getHparamDefaultFilter = createSelector(
  getHparamsForExperiment,
  (
    data: HparamsMetricsAndFilters | undefined
  ): Map<string, IntervalFilter | DiscreteFilter> => {
    if (!data) return new Map();
    return data.hparam.defaultFilters;
  }
);

const getHparamFilter = createSelector(
  getHparamsForExperiment,
  (
    data: HparamsMetricsAndFilters | undefined
  ): Map<string, IntervalFilter | DiscreteFilter> => {
    if (!data) return new Map();
    return data.hparam.filters;
  }
);

const getMetricDefaultFilter = createSelector(
  getHparamsForExperiment,
  (data: HparamsMetricsAndFilters | undefined): Map<string, IntervalFilter> => {
    if (!data) return new Map();
    return data.metric.defaultFilters;
  }
);

const getMetricFilter = createSelector(
  getHparamsForExperiment,
  (data: HparamsMetricsAndFilters | undefined): Map<string, IntervalFilter> => {
    if (!data) return new Map();
    return data.metric.filters;
  }
);

/**
 * Returns Observable that emits map of hparam name to filter values.
 */
export const getHparamFilterMap = createSelector(
  getHparamDefaultFilter,
  getHparamFilter,
  (
    defaultFilterMap,
    filterMap
  ): Map<string, IntervalFilter | DiscreteFilter> => {
    return new Map([...defaultFilterMap, ...filterMap]);
  }
);

/**
 * Returns Observable that emits map of metric tag to filter values.
 */
export const getMetricFilterMap = createSelector(
  getMetricDefaultFilter,
  getMetricFilter,
  (defaultFilterMap, filterMap): Map<string, IntervalFilter> => {
    return new Map([...defaultFilterMap, ...filterMap]);
  }
);
