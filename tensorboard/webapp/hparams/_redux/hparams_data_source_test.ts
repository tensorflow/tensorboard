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
  createHparamsExperimentResponse,
  createHparamsListSessionGroupResponse,
} from './testing';
import {
  BackendHparamsValueType,
  DatasetType,
  DomainType,
  SessionGroup,
} from '../types';

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
      dataSource.fetchExperimentInfo(['eid']).subscribe(returnValue);
      httpMock
        .expectOne('/experiment/eid/data/plugin/hparams/experiment')
        .flush(createHparamsExperimentResponse());
      expect(returnValue).toHaveBeenCalled();
    });

    it('uses /compare when a multiple experiment ids are provided', () => {
      const returnValue = jasmine.createSpy();
      dataSource.fetchExperimentInfo(['eid1', 'eid2']).subscribe(returnValue);
      httpMock
        .expectOne(
          '/compare/eid1:eid1,eid2:eid2/data/plugin/hparams/experiment'
        )
        .flush(createHparamsExperimentResponse());
      expect(returnValue).toHaveBeenCalled();
    });

    it('maps interval and discrete domains to domain', () => {
      const returnValue = jasmine.createSpy();
      dataSource.fetchExperimentInfo(['eid']).subscribe(returnValue);
      httpMock
        .expectOne('/experiment/eid/data/plugin/hparams/experiment')
        .flush(createHparamsExperimentResponse());
      expect(returnValue).toHaveBeenCalledWith({
        hparams: [
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
          },
        ],
        metrics: [
          {
            name: {
              tag: 'metrics1',
              group: '',
            },
            tag: 'metrics1',
            displayName: 'Metrics One',
            description: 'describe metrics one',
            datasetType: DatasetType.DATASET_UNKNOWN,
          },
          {
            name: {
              tag: 'metrics2',
              group: 'group',
            },
            tag: 'metrics2',
            displayName: 'Metrics Two',
            description: 'describe metrics two',
            datasetType: DatasetType.DATASET_TRAINING,
          },
        ],
      });
    });
  });

  describe('fetchSessionGroups', () => {
    it('uses /experiment when a single experiment id is provided', () => {
      const returnValue = jasmine.createSpy();
      dataSource
        .fetchSessionGroups(['eid'], {hparams: [], metrics: []})
        .subscribe(returnValue);
      httpMock
        .expectOne('/experiment/eid/data/plugin/hparams/session_groups')
        .flush(createHparamsListSessionGroupResponse());
      expect(returnValue).toHaveBeenCalled();
    });

    it('uses /compare when a multiple experiment ids are provided', () => {
      const returnValue = jasmine.createSpy();
      dataSource
        .fetchSessionGroups(['eid1', 'eid2'], {hparams: [], metrics: []})
        .subscribe(returnValue);
      httpMock
        .expectOne(
          '/compare/eid1:eid1,eid2:eid2/data/plugin/hparams/session_groups'
        )
        .flush(createHparamsListSessionGroupResponse());
      expect(returnValue).toHaveBeenCalled();
    });

    it('does not rename Session.name in single experiment view', () => {
      let sessionGroups: SessionGroup[] = [];
      const callback = (resp: SessionGroup[]) => {
        sessionGroups = resp;
      };
      dataSource
        .fetchSessionGroups(['eid'], {hparams: [], metrics: []})
        .subscribe(callback);
      httpMock
        .expectOne('/experiment/eid/data/plugin/hparams/session_groups')
        .flush(createHparamsListSessionGroupResponse());
      expect(sessionGroups.length).toEqual(2);
      expect(sessionGroups[0].sessions[0].name).toEqual('run_name_1');
    });

    it('renames Session.name to runId in comparison view', () => {
      let sessionGroups: SessionGroup[] = [];
      const callback = (resp: SessionGroup[]) => {
        sessionGroups = resp;
      };
      dataSource
        .fetchSessionGroups(['eid1', 'eid2'], {hparams: [], metrics: []})
        .subscribe(callback);

      const response = createHparamsListSessionGroupResponse();
      // This is the format expected in comparison view.
      response.sessionGroups[0].sessions[0].name = '[1] eid1/run_name_1';
      httpMock
        .expectOne(
          '/compare/eid1:eid1,eid2:eid2/data/plugin/hparams/session_groups'
        )
        .flush(response);
      expect(sessionGroups.length).toEqual(2);
      expect(sessionGroups[0].sessions[0].name).toEqual('eid1/run_name_1');
    });
  });
});
