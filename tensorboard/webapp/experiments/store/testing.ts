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
import {Experiment} from '../types';
import {
  ExperimentsDataState,
  ExperimentsState,
  EXPERIMENTS_FEATURE_KEY,
  State,
} from './experiments_types';

/**
 * Builds an experiment from default. Can override fields by providing
 * `override`.
 */
export function buildExperiment(override?: Partial<Experiment>): Experiment {
  return {
    id: '1',
    name: 'Default Experiment',
    start_time: 1,
    ...override,
  };
}

export function buildExperimentState(
  override?: Partial<ExperimentsDataState>
): ExperimentsState {
  return {
    data: {
      experimentMap: {},
      ...override,
    },
  };
}

/**
 * Get application state from an experiment state.
 */
export function buildStateFromExperimentsState(
  experimentsState: ExperimentsState
): State {
  return {[EXPERIMENTS_FEATURE_KEY]: experimentsState};
}
