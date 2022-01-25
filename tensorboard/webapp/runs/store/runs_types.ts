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
 * @fileoverview Types of experiments that come from the backend.
 */

import {NamespaceContextedState} from '../../app_routing/namespaced_state_reducer_helper';
import {LoadState} from '../../types/data';
import {SortDirection} from '../../types/ui';
import {HparamValue} from '../data_source/runs_data_source_types';
import {GroupBy, GroupByKey, SortKey} from '../types';

export {Domain, DomainType} from '../data_source/runs_data_source_types';

/**
 * Metadata about a run.
 */
export interface Run {
  id: string;
  name: string;
  startTime: number;
  hparams: null | HparamValue[];
  metrics: null | Array<{tag: string; value: number}>;
}

/**
 * Key used to namespace the experiments reducer.
 */
export const RUNS_FEATURE_KEY = 'runs';

export type ExperimentId = string;
export type RunId = string;

export interface RunsDataNamespacedState {
  defaultRunColorIdForGroupBy: Map<RunId, number>;
  // Monotonically increasing opaque id that uniquely identifies color that can
  // be used as an index, starting from 0. -1 is a reversed to denote no matches
  // or colorless entries.
  groupKeyToColorId: Map<string, number>;
  // Hex color string user has picked for a run.
  runColorOverrideForGroupBy: Map<RunId, string>;
  initialGroupBy: GroupBy;
  userSetGroupByKey: GroupByKey | null;
  colorGroupRegexString: string;
  regexFilter: string;
}

export interface RunsDataNonNamespacedState {
  runIds: Record<ExperimentId, RunId[]>;
  runIdToExpId: Record<RunId, ExperimentId>;
  runMetadata: Record<RunId, Run>;
  runsLoadState: Record<ExperimentId, LoadState>;
}

/**
 * Interface that describes shape of the `data` state in the runs feature.
 */
export type RunsDataState = NamespaceContextedState<
  RunsDataNamespacedState,
  RunsDataNonNamespacedState
>;

export interface RunsUiNamespacedState {
  paginationOption: {pageIndex: number; pageSize: number};
  sort: {key: SortKey | null; direction: SortDirection};
  /**
   * Indicates whether the run is selected.
   */
  selectionState: Map<RunId, boolean>;
}

export interface RunsUiNonNamespacedState {}

/**
 * Interface that describes shape of the `ui` state in the runs feature.
 */
export type RunsUiState = NamespaceContextedState<
  RunsUiNamespacedState,
  RunsUiNonNamespacedState
>;

/**
 * Interface that describes state structure of the runs reducer.
 */
export interface RunsState {
  data: RunsDataState;
  ui: RunsUiState;
}

/**
 * Fragment of application state with the RunsState.
 */
export interface State {
  [RUNS_FEATURE_KEY]?: RunsState;
}

/**
 * When runs selector was never modified by user and there are less than or
 * equal to MAX_NUM_RUNS_TO_ENABLE_BY_DEFAULT in an experiment, we default
 * select all runs.
 */
export const MAX_NUM_RUNS_TO_ENABLE_BY_DEFAULT = 500;
