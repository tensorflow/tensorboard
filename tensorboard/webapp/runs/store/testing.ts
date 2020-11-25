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
import {
  DatasetType,
  HparamSpec,
  HparamsValueType,
  MetricSpec,
} from '../data_source/runs_data_source_types';
import {DiscreteFilter, DomainType, IntervalFilter} from '../types';

import {
  Run,
  RUNS_FEATURE_KEY,
  RunsDataState,
  RunsState,
  RunsUiState,
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
      hparamAndMetricSpec: {},
      selectionState: new Map(),
      ...dataOverride,
    },
    ui: {
      paginationOption: {pageIndex: 0, pageSize: 0},
      regexFilter: '',
      sort: {column: null, direction: SortDirection.UNSET},
      defaultRunColor: new Map(),
      runColorOverride: new Map(),
      hparamFilters: new Map(),
      metricFilters: new Map(),
      hparamDefaultFilters: new Map(),
      metricDefaultFilters: new Map(),
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

export function buildHparamSpec(
  override: Partial<HparamSpec> = {}
): HparamSpec {
  return {
    description: '',
    displayName: 'Sample Param',
    domain: {type: DomainType.INTERVAL, minValue: 0, maxValue: 1},
    name: 'sample_param',
    type: HparamsValueType.DATA_TYPE_FLOAT64,
    ...override,
  };
}

export function buildMetricSpec(
  override: Partial<MetricSpec> = {}
): MetricSpec {
  return {
    tag: 'tag',
    displayName: 'Tag',
    description: 'This is a tags',
    datasetType: DatasetType.DATASET_TRAINING,
    ...override,
  };
}

export function buildDiscreteFilter(
  override: Partial<DiscreteFilter> = {}
): DiscreteFilter {
  return {
    type: DomainType.DISCRETE,
    includeUndefined: true,
    possibleValues: [1, 10, 100],
    filterValues: [1, 100],
    ...override,
  };
}

export function buildIntervalFilter(
  override: Partial<IntervalFilter> = {}
): IntervalFilter {
  return {
    type: DomainType.INTERVAL,
    includeUndefined: true,
    minValue: 0,
    maxValue: 100,
    filterLowerValue: 5,
    filterUpperValue: 10,
    ...override,
  };
}
