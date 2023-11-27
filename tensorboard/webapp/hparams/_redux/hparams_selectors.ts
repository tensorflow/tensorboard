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
import {HparamsState, HPARAMS_FEATURE_KEY, HparamFilter} from './types';
import {hparamSpecToDefaultFilter} from './utils';

const getHparamsState =
  createFeatureSelector<HparamsState>(HPARAMS_FEATURE_KEY);

export const getDashboardHparamsAndMetricsSpecs = createSelector(
  getHparamsState,
  (state: HparamsState) => {
    return state.dashboardSpecs;
  }
);

export const getDashboardSessionGroups = createSelector(
  getHparamsState,
  (state: HparamsState) => {
    return state.dashboardSessionGroups;
  }
);

export const getDashboardDefaultHparamFilters = createSelector(
  getDashboardHparamsAndMetricsSpecs,
  (specs): Map<string, HparamFilter> => {
    const hparams = new Map(
      specs.hparams.map((hparamSpec) => {
        return [hparamSpec.name, hparamSpecToDefaultFilter(hparamSpec)];
      })
    );

    return hparams;
  }
);

export const getDashboardHparamFilterMap = createSelector(
  getHparamsState,
  (state) => {
    return state.dashboardFilters.hparams;
  }
);

export const getDashboardMetricsFilterMap = createSelector(
  getHparamsState,
  (state) => {
    return state.dashboardFilters.metrics;
  }
);
