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

import {RouteContextedState} from '../../app_routing/route_contexted_reducer_helper';
import {LoadState} from '../../types/data';
import {SortDirection} from '../../types/ui';
import {
  HparamSpec,
  HparamValue,
  MetricSpec,
} from '../data_source/runs_data_source_types';
import {DiscreteFilter, IntervalFilter, SortKey} from '../types';

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
type HparamName = string;
type MetricName = string;

export interface HparamAndMetricSpec {
  hparams: HparamSpec[];
  metrics: MetricSpec[];
}

export type ExperimentToHparamAndMetricSpec = Record<
  ExperimentId,
  HparamAndMetricSpec
>;

/**
 * Interface that describes shape of the `data` state in the runs feature.
 */
export interface RunsDataState {
  runIds: Record<ExperimentId, RunId[]>;
  runIdToExpId: Record<RunId, ExperimentId>;
  runMetadata: Record<RunId, Run>;
  runsLoadState: Record<ExperimentId, LoadState>;
  hparamAndMetricSpec: ExperimentToHparamAndMetricSpec;
  // Run selection is tied to a list of experimentIds which is somewhat related
  // to route but not strictly. For instance, if we want to render the
  // run-selector in both experiment list and dashboard routes sharing the
  // state, they need to share a key.
  selectionState: Map<string, Map<RunId, boolean>>;
}

export interface RunsUiRoutefulState {
  paginationOption: {pageIndex: number; pageSize: number};
  regexFilter: string;
  sort: {key: SortKey | null; direction: SortDirection};

  // Each route may keep track of its own hparam/metric filter values that
  // overrides the default filters.
  hparamFilters: Map<HparamName, DiscreteFilter | IntervalFilter>;
  metricFilters: Map<MetricName, IntervalFilter>;
  runColorOverride: Map<RunId, string>;
}

export interface RunsUiRoutelessState {
  hparamDefaultFilters: Map<HparamName, DiscreteFilter | IntervalFilter>;
  metricDefaultFilters: Map<MetricName, IntervalFilter>;
  defaultRunColor: Map<RunId, string>;
}

/**
 * Interface that describes shape of the `ui` state in the runs feature.
 */
export type RunsUiState = RouteContextedState<
  RunsUiRoutefulState,
  RunsUiRoutelessState
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
export const MAX_NUM_RUNS_TO_ENABLE_BY_DEFAULT = 40;
