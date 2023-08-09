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
import {Injectable} from '@angular/core';
import {Observable, of} from 'rxjs';
import {
  BackendHparamsExperimentResponse,
  BackendHparamsValueType,
  BackendListSessionGroupResponse,
  DatasetType,
  HparamSpec,
  RunStatus,
} from './runs_backend_types';
import {
  DomainType,
  HparamsAndMetadata,
  Run,
  RunsDataSource,
} from './runs_data_source_types';

export function buildHparamsAndMetadata(
  override: Partial<HparamsAndMetadata>
): HparamsAndMetadata {
  return {
    hparamSpecs: [
      {
        description: 'This is a hyper parameter',
        displayName: 'Param 1',
        domain: {type: DomainType.INTERVAL, minValue: 0, maxValue: 1},
        name: 'param',
        type: BackendHparamsValueType.DATA_TYPE_UNSET,
      },
    ],
    metricSpecs: [
      {
        name: {
          tag: 'metric',
          group: 'some group',
        },
        tag: 'metric',
        displayName: 'Metric',
        description: 'This is a metric',
        datasetType: DatasetType.DATASET_TRAINING,
      },
    ],
    runToHparamsAndMetrics: {},
    ...override,
  };
}

@Injectable()
export class TestingRunsDataSource implements RunsDataSource {
  fetchRuns(experimentId: string): Observable<Run[]> {
    return of([]);
  }

  fetchHparamsMetadata(experimentId: string): Observable<HparamsAndMetadata> {
    return of({
      hparamSpecs: [],
      metricSpecs: [],
      runToHparamsAndMetrics: {},
    });
  }
}

export function provideTestingRunsDataSource() {
  return [
    TestingRunsDataSource,
    {provide: RunsDataSource, useExisting: TestingRunsDataSource},
  ];
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
      } as HparamSpec,
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
