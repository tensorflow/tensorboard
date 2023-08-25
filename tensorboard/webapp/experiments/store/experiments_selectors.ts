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
import {Experiment} from '../types';
import {
  ExperimentsDataState,
  ExperimentsState,
  EXPERIMENTS_FEATURE_KEY,
} from './experiments_types';
import {getExperimentIdsFromRoute} from '../../app_routing/store/app_routing_selectors';

const getExperimentsState = createFeatureSelector<ExperimentsState>(
  EXPERIMENTS_FEATURE_KEY
);

const getDataState = createSelector(
  getExperimentsState,
  (state): ExperimentsDataState => {
    return state.data;
  }
);

/**
 * Returns Observable that emits an experiment.
 */
export const getExperiment = createSelector(
  getDataState,
  (
    state: ExperimentsDataState,
    props: {experimentId: string}
  ): Experiment | null => {
    const {experimentId} = props;
    return state.experimentMap[experimentId] || null;
  }
);

/**
 * Returns the names of all experiments present on the current dashboard.
 */
export const getDashboardExperimentNames = createSelector(
  getDataState,
  getExperimentIdsFromRoute,
  (
    state: ExperimentsDataState,
    experimentIds: string[] | null
  ): Record<string, string> =>
    (experimentIds ?? [])
      .map((experimentId) => state.experimentMap[experimentId])
      .filter(Boolean)
      .reduce((map, experiment) => {
        map[experiment.id] = experiment.name;
        return map;
      }, {} as Record<string, string>)
);
