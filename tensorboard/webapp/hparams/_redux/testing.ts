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
  BackendHparamSpec,
  BackendHparamsExperimentResponse,
  BackendHparamsValueType,
  BackendListSessionGroupResponse,
  DatasetType,
  DiscreteFilter,
  DomainType,
  HparamSpec,
  HparamsValueType,
  IntervalFilter,
  MetricSpec,
  RunStatus,
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
  specOverrides?: Partial<HparamsState['specs']>,
  filterOverrides?: Partial<HparamsState['filters']>
): HparamsState {
  return {
    specs: {
      ...specOverrides,
    } as Record<string, HparamsMetricsAndFilters>,
    filters: {
      ...filterOverrides,
    } as HparamsState['filters'],
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

export function createHparamsListSessionGroupResponse(): BackendListSessionGroupResponse {
  return {
    sessionGroups: [
      {
        name: 'session_id_1',
        hparams: {
          hparams1: -100,
          hparams2: 'bar',
        },
        sessions: [
          {
            endTimeSecs: 0,
            metricValues: [
              {
                name: {
                  group: '',
                  tag: 'metrics1',
                },
                trainingStep: 1000,
                value: 1,
                wallTimeSecs: 0,
              },
            ],
            modelUri: '',
            monitorUrl: '',
            name: 'run_name_1',
            startTimeSecs: 0,
            status: RunStatus.STATUS_SUCCESS,
          },
        ],
      },
      {
        name: 'session_id_2',
        hparams: {
          hparams1: 100,
          hparams2: 'foo',
        },
        sessions: [
          {
            endTimeSecs: 0,
            metricValues: [
              {
                name: {
                  group: 'train',
                  tag: 'metrics1',
                },
                trainingStep: 2000,
                value: 0.1,
                wallTimeSecs: 0,
              },
              {
                name: {
                  group: 'test',
                  tag: 'metrics1',
                },
                trainingStep: 5000,
                value: 0.6,
                wallTimeSecs: 0,
              },
            ],
            modelUri: '',
            monitorUrl: '',
            name: 'run_name_2',
            startTimeSecs: 0,
            status: RunStatus.STATUS_SUCCESS,
          },
          {
            endTimeSecs: 0,
            metricValues: [
              {
                name: {
                  group: 'train',
                  tag: 'metrics1',
                },
                trainingStep: 10000,
                value: 0.3,
                wallTimeSecs: 0,
              },
              {
                name: {
                  group: 'train',
                  tag: 'metrics2',
                },
                trainingStep: 10000,
                value: 0,
                wallTimeSecs: 0,
              },
            ],
            modelUri: '',
            monitorUrl: '',
            name: 'run_name_2',
            startTimeSecs: 0,
            status: RunStatus.STATUS_RUNNING,
          },
        ],
      },
    ],
    totalSize: 2,
  };
}

export function createHparamsExperimentResponse(): BackendHparamsExperimentResponse {
  return {
    description: 'some description',
    hparamInfos: [
      {
        description: 'describes hparams one',
        displayName: 'hparams one',
        name: 'hparams1',
        type: BackendHparamsValueType.DATA_TYPE_STRING,
        domainInterval: {minValue: -100, maxValue: 100},
      },
      {
        description: 'describes hparams two',
        displayName: 'hparams two',
        name: 'hparams2',
        type: BackendHparamsValueType.DATA_TYPE_BOOL,
        domainDiscrete: ['foo', 'bar', 'baz'],
      },
    ],
    metricInfos: [
      {
        name: {
          group: '',
          tag: 'metrics1',
        },
        displayName: 'Metrics One',
        description: 'describe metrics one',
        datasetType: DatasetType.DATASET_UNKNOWN,
      },
      {
        name: {
          group: 'group',
          tag: 'metrics2',
        },
        displayName: 'Metrics Two',
        description: 'describe metrics two',
        datasetType: DatasetType.DATASET_TRAINING,
      },
    ],
    name: 'experiment name',
    timeCreatedSecs: 1337,
    user: 'user name',
  };
}

export function createHparamsExperimentNoDomainResponse(): BackendHparamsExperimentResponse {
  return {
    description: 'some description',
    hparamInfos: [
      {
        description: 'describes hparams one',
        displayName: 'hparams one',
        name: 'hparams1',
        type: BackendHparamsValueType.DATA_TYPE_STRING,
      } as BackendHparamSpec,
      {
        description: 'describes hparams two',
        displayName: 'hparams two',
        name: 'hparams2',
        type: BackendHparamsValueType.DATA_TYPE_BOOL,
        domainDiscrete: ['foo', 'bar', 'baz'],
      },
    ],
    metricInfos: [
      {
        name: {
          group: '',
          tag: 'metrics1',
        },
        displayName: 'Metrics One',
        description: 'describe metrics one',
        datasetType: DatasetType.DATASET_UNKNOWN,
      },
      {
        name: {
          group: 'group',
          tag: 'metrics2',
        },
        displayName: 'Metrics Two',
        description: 'describe metrics two',
        datasetType: DatasetType.DATASET_TRAINING,
      },
    ],
    name: 'experiment name',
    timeCreatedSecs: 1337,
    user: 'user name',
  };
}
