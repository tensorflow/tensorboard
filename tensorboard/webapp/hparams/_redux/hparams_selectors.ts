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
import {DiscreteFilter, HparamAndMetricSpec, IntervalFilter} from '../types';
import {combineHparamAndMetricSpecs} from './hparams_selectors_utils';
import {HparamsState, HPARAMS_FEATURE_KEY} from './types';
import {
  combineDefaultHparamFilters,
  combineDefaultMetricFilters,
  getIdFromExperimentIds,
} from './utils';

const getHparamsState =
  createFeatureSelector<HparamsState>(HPARAMS_FEATURE_KEY);

const getHparamsDefaultFiltersForExperiments = createSelector(
  getHparamsState,
  (
    state: HparamsState,
    experimentIds: string[]
  ): Map<string, DiscreteFilter | IntervalFilter> => {
    const defaultFilterMaps: Array<
      Map<string, DiscreteFilter | IntervalFilter>
    > = [];

    for (const experimentId of experimentIds) {
      if (!state.specs[experimentId]) {
        continue;
      }

      defaultFilterMaps.push(state.specs[experimentId].hparam.defaultFilters);
    }

    return combineDefaultHparamFilters(defaultFilterMaps);
  }
);

export const getHparamFilterMap = createSelector(
  getHparamsDefaultFiltersForExperiments,
  getHparamsState,
  (
    combinedDefaultfilterMap,
    hparamState,
    experimentIds: string[]
  ): Map<string, IntervalFilter | DiscreteFilter> => {
    const id = getIdFromExperimentIds(experimentIds);
    const otherFilter = hparamState.filters[id];

    return new Map([
      ...combinedDefaultfilterMap,
      ...(otherFilter?.hparams ?? []),
    ]);
  }
);

const getMetricsDefaultFiltersForExperiments = createSelector(
  getHparamsState,
  (
    state: HparamsState,
    experimentIds: string[]
  ): Map<string, IntervalFilter> => {
    const defaultFilterMaps: Array<Map<string, IntervalFilter>> = [];

    for (const experimentId of experimentIds) {
      if (!state.specs[experimentId]) {
        continue;
      }

      defaultFilterMaps.push(state.specs[experimentId].metric.defaultFilters);
    }

    return combineDefaultMetricFilters(defaultFilterMaps);
  }
);

export const getMetricFilterMap = createSelector(
  getMetricsDefaultFiltersForExperiments,
  getHparamsState,
  (
    defaultfilterMap,
    hparamState,
    experimentIds: string[]
  ): Map<string, IntervalFilter> => {
    const id = getIdFromExperimentIds(experimentIds);
    const otherFilter = hparamState.filters[id];

    return new Map([...defaultfilterMap, ...(otherFilter?.metrics ?? [])]);
  }
);

/**
 * Returns Observable that emits hparams and metrics specs of experiments.
 */
export const getExperimentsHparamsAndMetricsSpecs = createSelector(
  getHparamsState,
  (
    state: HparamsState,
    props: {experimentIds: string[]}
  ): HparamAndMetricSpec => {
    return combineHparamAndMetricSpecs(
      ...(props.experimentIds
        .map((eid) => {
          const data = state.specs[eid];
          if (!data) return null;
          return {
            hparams: data.hparam.specs,
            metrics: data.metric.specs,
          };
        })
        .filter(Boolean) as HparamAndMetricSpec[])
    );
  }
);
