/* Copyright 2023 The TensorFlow Authors. All Rights Reserved.

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
import {TestBed} from '@angular/core/testing';
import {
  HttpTestingController,
  TBHttpClientTestingModule,
} from '../../webapp_data_source/tb_http_client_testing';
import {HparamsDataSource} from './hparams_data_source';
import {
  BackendHparamsValueType,
  DatasetType,
  DomainType,
  SessionGroup,
  BackendHparamSpec,
  BackendHparamsExperimentResponse,
  BackendListSessionGroupResponse,
  RunStatus,
} from '../types';
import {buildHparamSpec} from './testing';

describe('HparamsDataSource Test', () => {
  let httpMock: HttpTestingController;
  let dataSource: HparamsDataSource;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TBHttpClientTestingModule],
      providers: [HparamsDataSource],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    dataSource = TestBed.inject(HparamsDataSource);
  });

  describe('fetchExperimentInfo', () => {
    it('uses /experiment when a single experiment id is provided', () => {
      const returnValue = jasmine.createSpy();
      dataSource.fetchExperimentInfo(['eid'], 0).subscribe(returnValue);
      httpMock
        .expectOne('/experiment/eid/data/plugin/hparams/experiment')
        .flush(createHparamsExperimentResponse());
      expect(returnValue).toHaveBeenCalled();
    });

    it('uses /compare when a multiple experiment ids are provided', () => {
      const returnValue = jasmine.createSpy();
      dataSource
        .fetchExperimentInfo(['eid1', 'eid2'], 0)
        .subscribe(returnValue);
      httpMock
        .expectOne('/compare/0:eid1,1:eid2/data/plugin/hparams/experiment')
        .flush(createHparamsExperimentResponse());
      expect(returnValue).toHaveBeenCalled();
    });

    it('maps interval and discrete domains to domain', () => {
      const returnValue = jasmine.createSpy();
      dataSource.fetchExperimentInfo(['eid'], 0).subscribe(returnValue);
      httpMock
        .expectOne('/experiment/eid/data/plugin/hparams/experiment')
        .flush(createHparamsExperimentResponse());
      expect(returnValue).toHaveBeenCalledWith([
        {
          description: 'describes hparams one',
          displayName: 'hparams one',
          name: 'hparams1',
          type: BackendHparamsValueType.DATA_TYPE_STRING,
          domain: {
            type: DomainType.INTERVAL,
            minValue: -100,
            maxValue: 100,
          },
          differs: true,
        },
        {
          description: 'describes hparams two',
          displayName: 'hparams two',
          name: 'hparams2',
          type: BackendHparamsValueType.DATA_TYPE_BOOL,
          domain: {
            type: DomainType.DISCRETE,
            values: ['foo', 'bar', 'baz'],
          },
          differs: true,
        },
      ]);
    });

    it('treats missing domains as discrete domains', () => {
      const returnValue = jasmine.createSpy();
      dataSource.fetchExperimentInfo(['eid'], 0).subscribe(returnValue);
      httpMock
        .expectOne('/experiment/eid/data/plugin/hparams/experiment')
        .flush(createHparamsExperimentNoDomainResponse());
      expect(returnValue).toHaveBeenCalledWith([
        {
          description: 'describes hparams one',
          displayName: 'hparams one',
          name: 'hparams1',
          type: BackendHparamsValueType.DATA_TYPE_STRING,
          domain: {
            type: DomainType.DISCRETE,
            values: [],
          },
          differs: false,
        },
        {
          description: 'describes hparams two',
          displayName: 'hparams two',
          name: 'hparams2',
          type: BackendHparamsValueType.DATA_TYPE_BOOL,
          domain: {
            type: DomainType.DISCRETE,
            values: ['foo', 'bar', 'baz'],
          },
          differs: true,
        },
      ]);
    });

    it('sets hparamsLimit and includeMetrics', () => {
      dataSource.fetchExperimentInfo(['eid'], 100).subscribe();
      const actual = httpMock.expectOne(
        '/experiment/eid/data/plugin/hparams/experiment'
      );
      expect(actual.request.body.hparamsLimit).toEqual(100);
      expect(actual.request.body.includeMetrics).toBeFalse();
    });
  });

  describe('fetchSessionGroups', () => {
    it('uses /experiment when a single experiment id is provided', () => {
      const returnValue = jasmine.createSpy();
      dataSource.fetchSessionGroups(['eid'], []).subscribe(returnValue);
      httpMock
        .expectOne('/experiment/eid/data/plugin/hparams/session_groups')
        .flush(createHparamsListSessionGroupResponse());
      expect(returnValue).toHaveBeenCalled();
    });

    it('uses /compare when a multiple experiment ids are provided', () => {
      const returnValue = jasmine.createSpy();
      dataSource
        .fetchSessionGroups(['eid1', 'eid2'], [])
        .subscribe(returnValue);
      httpMock
        .expectOne('/compare/0:eid1,1:eid2/data/plugin/hparams/session_groups')
        .flush(createHparamsListSessionGroupResponse());
      expect(returnValue).toHaveBeenCalled();
    });

    it('renames Session.name in single experiment view', () => {
      let sessionGroups: SessionGroup[] = [];
      const callback = (resp: SessionGroup[]) => {
        sessionGroups = resp;
      };
      dataSource.fetchSessionGroups(['eid'], []).subscribe(callback);
      httpMock
        .expectOne('/experiment/eid/data/plugin/hparams/session_groups')
        .flush(createHparamsListSessionGroupResponse());
      expect(sessionGroups.length).toEqual(2);
      expect(sessionGroups[0].sessions[0].name).toEqual('eid/run_name_1');
    });

    it('renames Session.name to runId in comparison view', () => {
      let sessionGroups: SessionGroup[] = [];
      const callback = (resp: SessionGroup[]) => {
        sessionGroups = resp;
      };
      dataSource.fetchSessionGroups(['eid1', 'eid2'], []).subscribe(callback);

      const response = createHparamsListSessionGroupResponse();
      // This is the format expected in comparison view.
      response.sessionGroups[0].sessions[0].name = '[1] 0/run_name_1';
      response.sessionGroups[1].sessions[0].name = '[2] 1/run_name_2';
      httpMock
        .expectOne('/compare/0:eid1,1:eid2/data/plugin/hparams/session_groups')
        .flush(response);
      expect(sessionGroups.length).toEqual(2);
      expect(sessionGroups[0].sessions[0].name).toEqual('eid1/run_name_1');
      expect(sessionGroups[1].sessions[0].name).toEqual('eid2/run_name_2');
    });

    it('adds hparams as colParams', () => {
      dataSource
        .fetchSessionGroups(
          ['eid'],
          [
            buildHparamSpec({name: 'hparam1'}),
            buildHparamSpec({name: 'hparam2'}),
          ]
        )
        .subscribe();
      const actual = httpMock.expectOne(
        '/experiment/eid/data/plugin/hparams/session_groups'
      );
      expect(actual.request.body.colParams).toEqual([
        {hparam: 'hparam1', includeInResult: true},
        {hparam: 'hparam2', includeInResult: true},
      ]);
    });
  });
});

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
        differs: true,
      },
      {
        description: 'describes hparams two',
        displayName: 'hparams two',
        name: 'hparams2',
        type: BackendHparamsValueType.DATA_TYPE_BOOL,
        domainDiscrete: ['foo', 'bar', 'baz'],
        differs: true,
      },
    ],
    metricInfos: [],
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
        differs: false,
      } as BackendHparamSpec,
      {
        description: 'describes hparams two',
        displayName: 'hparams two',
        name: 'hparams2',
        type: BackendHparamsValueType.DATA_TYPE_BOOL,
        domainDiscrete: ['foo', 'bar', 'baz'],
        differs: true,
      },
    ],
    metricInfos: [],
    name: 'experiment name',
    timeCreatedSecs: 1337,
    user: 'user name',
  };
}
