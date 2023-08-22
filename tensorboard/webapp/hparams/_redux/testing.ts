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

import {DeepPartial} from '../../util/types';
import {
  DatasetType,
  DiscreteFilter,
  DomainType,
  HparamSpec,
  HparamValue,
  HparamsValueType,
  IntervalFilter,
  MetricSpec,
  MetricsValue,
  RunStatus,
  Session,
  SessionGroup,
} from '../_types';
import {
  HparamsMetricsAndFilters,
  HparamsState,
  HPARAMS_FEATURE_KEY,
  State,
} from './types';
import {getIdFromExperimentIds} from './utils';

export function buildSpecs(
  experimentId: string,
  override: Partial<HparamsMetricsAndFilters> = {}
): Record<string, HparamsMetricsAndFilters> {
  const {
    hparam = {
      specs: [],
      defaultFilters: new Map(),
    },
    metric = {
      specs: [],
      defaultFilters: new Map(),
    },
  } = override;

  return {
    [experimentId]: {hparam, metric},
  };
}

export function buildFilterState(
  experimentIds: string[],
  override: Partial<HparamsState['filters'][string]> = {}
): HparamsState['filters'] {
  const {hparams = new Map(), metrics = new Map()} = override;

  return {
    [getIdFromExperimentIds(experimentIds)]: {
      hparams,
      metrics,
    },
  };
}

export function buildHparamsState(
  overrides: DeepPartial<HparamsState> = {}
): HparamsState {
  return {
    specs: {
      ...overrides.specs,
    } as Record<string, HparamsMetricsAndFilters>,
    filters: {
      ...overrides.filters,
    } as HparamsState['filters'],
    dashboardSpecs: {
      hparams: overrides.dashboardSpecs?.hparams ?? [],
      metrics: overrides.dashboardSpecs?.metrics ?? [],
    },
    dashboardSessionGroups: overrides.dashboardSessionGroups ?? [],
    dashboardFilters: {
      hparams: overrides.dashboardFilters?.hparams ?? new Map(),
      metrics: overrides.dashboardFilters?.metrics ?? new Map(),
    },
  } as HparamsState;
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
    name: {
      ...override?.name,
      tag: 'metric',
      group: 'some group',
    },
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

export function buildMetricsValue(
  override: DeepPartial<MetricsValue> = {}
): MetricsValue {
  return {
    trainingStep: 0,
    value: 1,
    wallTimeSecs: 123,
    ...override,
    name: {
      tag: override.name?.tag ?? 'someTag',
      group: override.name?.group ?? 'someGroup',
    },
  };
}

export function buildHparamValue(override: Partial<HparamValue>): HparamValue {
  return {
    name: 'some_hparam',
    value: 4,
    ...override,
  };
}

export function buildSession(override: DeepPartial<Session> = {}): Session {
  return {
    name: 'someExperiment/someRun',
    modelUri: '',
    monitorUrl: '',
    startTimeSecs: 123,
    endTimeSecs: 456,
    status: RunStatus.STATUS_UNKNOWN,
    ...override,
    metricValues: [...(override.metricValues ?? [])].map(buildMetricsValue),
  };
}

export function buildSessionGroup(
  override: DeepPartial<SessionGroup>
): SessionGroup {
  return {
    name: 'some_session_group',
    ...override,
    hparams: {
      ...override.hparams,
    } as any,
    sessions: (override.sessions ?? []).map(buildSession),
  };
}
