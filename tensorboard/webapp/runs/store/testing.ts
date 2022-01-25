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
/**
 * @fileoverview Testing utility for testing runs.
 */

import {SortDirection} from '../../types/ui';
import {GroupByKey} from '../types';
import {
  Run,
  RunsDataState,
  RunsState,
  RunsUiState,
  RUNS_FEATURE_KEY,
  State,
} from './runs_types';

/**
 * Builds an experiment from default. Can override fields by providing
 * `override`.
 */
export function buildRun(override?: Partial<Run>): Run {
  return {
    id: '1',
    name: 'Default Run',
    startTime: 1,
    hparams: null,
    metrics: null,
    ...override,
  };
}

/**
 * Builds a runs state.
 */
export function buildRunsState(
  dataOverride?: Partial<RunsDataState>,
  uiOverride?: Partial<RunsUiState>
): RunsState {
  return {
    data: {
      runIds: {},
      runIdToExpId: {},
      runMetadata: {},
      runsLoadState: {},
      runColorOverrideForGroupBy: new Map(),
      defaultRunColorIdForGroupBy: new Map(),
      groupKeyToColorId: new Map(),
      initialGroupBy: {key: GroupByKey.RUN},
      userSetGroupByKey: null,
      colorGroupRegexString: '',
      regexFilter: '',
      ...dataOverride,
    },
    ui: {
      paginationOption: {pageIndex: 0, pageSize: 0},
      sort: {key: null, direction: SortDirection.UNSET},
      selectionState: new Map(),
      ...uiOverride,
    },
  };
}

/**
 * Get application state from a runs state.
 */
export function buildStateFromRunsState(runsState: RunsState): State {
  return {[RUNS_FEATURE_KEY]: runsState};
}
