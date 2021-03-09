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

import {
  HparamsValueType,
  DomainType,
  HparamSpec,
  MetricSpec,
  DiscreteFilter,
  DatasetType,
  IntervalFilter,
} from '../types';
import {
  HparamsMetricsAndFilters,
  HparamsState,
  HPARAMS_FEATURE_KEY,
  State,
} from './hparams_types';

export function buildHparam(
  override: Partial<HparamsMetricsAndFilters['hparam']> = {}
): HparamsMetricsAndFilters['hparam'] {
  return {
    specs: [],
    filters: new Map(),
    defaultFilters: new Map(),
    ...override,
  };
}

export function buildMetric(
  override: Partial<HparamsMetricsAndFilters['metric']> = {}
): HparamsMetricsAndFilters['metric'] {
  return {
    specs: [],
    filters: new Map(),
    defaultFilters: new Map(),
    ...override,
  };
}
export function buildHparamsState(
  dataOverride?: Partial<HparamsState['data']>
): HparamsState {
  return {
    data: {
      ...dataOverride,
    } as Record<string, HparamsMetricsAndFilters>,
  };
}

export function buildStateFromHparamsState(hparamsState: HparamsState): State {
  return {[HPARAMS_FEATURE_KEY]: hparamsState};
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
