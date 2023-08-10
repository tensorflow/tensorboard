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
import {fakeAsync, flush, TestBed} from '@angular/core/testing';
import {
  HttpTestingController,
  TBHttpClientTestingModule,
} from '../../webapp_data_source/tb_http_client_testing';
import {TBRunsDataSource} from './runs_data_source';
import {DomainType, RunsDataSource} from './runs_data_source_types';
import {
  createHparamsExperimentNoDomainResponse,
  createHparamsExperimentResponse,
  createHparamsListSessionGroupResponse,
} from './testing';

import * as types from './runs_backend_types';

describe('TBRunsDataSource test', () => {
  let httpMock: HttpTestingController;
  let dataSource: RunsDataSource;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TBHttpClientTestingModule],
      providers: [{provide: RunsDataSource, useClass: TBRunsDataSource}],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    dataSource = TestBed.inject(RunsDataSource);
  });

  describe('fetchRuns', () => {
    it('fetches from "/experiment/${experimentId}/data/runs"', fakeAsync(() => {
      const results = jasmine.createSpy();
      dataSource.fetchRuns('exp1').subscribe(results);

      httpMock.expectOne('/experiment/exp1/data/runs').flush(['foo', 'bar']);
      // Flush the promise in the microtask.
      flush();

      expect(results).toHaveBeenCalledWith([
        {id: 'exp1/foo', name: 'foo', startTime: 0},
        {id: 'exp1/bar', name: 'bar', startTime: 0},
      ]);
    }));
  });

  describe('#fetchHparamsMetadata', () => {
    it(
      'calls /experiment and /session_groups to return map of run to ' +
        'hparams and metrics',
      () => {
        const returnValue = jasmine.createSpy();
        dataSource.fetchHparamsMetadata('eid').subscribe(returnValue);
        httpMock
          .expectOne('/experiment/eid/data/plugin/hparams/experiment')
          .flush(createHparamsExperimentResponse());
        httpMock
          .expectOne('/experiment/eid/data/plugin/hparams/session_groups')
          .flush(createHparamsListSessionGroupResponse());

        expect(returnValue).toHaveBeenCalledWith({
          hparamSpecs: [
            {
              description: 'describes hparams one',
              displayName: 'hparams one',
              name: 'hparams1',
              type: types.BackendHparamsValueType.DATA_TYPE_STRING,
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
              type: types.BackendHparamsValueType.DATA_TYPE_BOOL,
              domain: {
                type: DomainType.DISCRETE,
                values: ['foo', 'bar', 'baz'],
              },
            },
          ],
          metricSpecs: [
            {
              name: {
                tag: 'metrics1',
                group: '',
              },
              tag: 'metrics1',
              displayName: 'Metrics One',
              description: 'describe metrics one',
              datasetType: types.DatasetType.DATASET_UNKNOWN,
            },
            {
              name: {
                tag: 'metrics2',
                group: 'group',
              },
              tag: 'metrics2',
              displayName: 'Metrics Two',
              description: 'describe metrics two',
              datasetType: types.DatasetType.DATASET_TRAINING,
            },
          ],
          runToHparamsAndMetrics: {
            'eid/run_name_1': {
              hparams: [
                {name: 'hparams1', value: -100},
                {name: 'hparams2', value: 'bar'},
              ],
              metrics: [
                {
                  tag: 'metrics1',
                  trainingStep: 1000,
                  value: 1,
                },
              ],
            },
            'eid/run_name_2/test': {
              hparams: [
                {name: 'hparams1', value: 100},
                {name: 'hparams2', value: 'foo'},
              ],
              metrics: [
                {
                  tag: 'metrics1',
                  trainingStep: 5000,
                  value: 0.6,
                },
              ],
            },
            'eid/run_name_2/train': {
              hparams: [
                {name: 'hparams1', value: 100},
                {name: 'hparams2', value: 'foo'},
              ],
              metrics: [
                {
                  tag: 'metrics1',
                  trainingStep: 2000,
                  value: 0.1,
                },
                {
                  tag: 'metrics1',
                  trainingStep: 10000,
                  value: 0.3,
                },
                {
                  tag: 'metrics2',
                  trainingStep: 10000,
                  value: 0,
                },
              ],
            },
          },
        });
      }
    );

    it(
      'calls /experiment and /session_groups to return map of run to ' +
        'hparams and metrics with missing domain ranges',
      () => {
        const returnValue = jasmine.createSpy();
        dataSource.fetchHparamsMetadata('eid').subscribe(returnValue);
        httpMock
          .expectOne('/experiment/eid/data/plugin/hparams/experiment')
          .flush(createHparamsExperimentNoDomainResponse());
        httpMock
          .expectOne('/experiment/eid/data/plugin/hparams/session_groups')
          .flush(createHparamsListSessionGroupResponse());

        expect(returnValue).toHaveBeenCalledWith({
          hparamSpecs: [
            {
              description: 'describes hparams one',
              displayName: 'hparams one',
              name: 'hparams1',
              type: types.BackendHparamsValueType.DATA_TYPE_STRING,
              domain: {
                type: DomainType.INTERVAL,
                minValue: -Infinity,
                maxValue: Infinity,
              },
            },
            {
              description: 'describes hparams two',
              displayName: 'hparams two',
              name: 'hparams2',
              type: types.BackendHparamsValueType.DATA_TYPE_BOOL,
              domain: {
                type: DomainType.DISCRETE,
                values: ['foo', 'bar', 'baz'],
              },
            },
          ],
          metricSpecs: [
            {
              name: {
                tag: 'metrics1',
                group: '',
              },
              tag: 'metrics1',
              displayName: 'Metrics One',
              description: 'describe metrics one',
              datasetType: types.DatasetType.DATASET_UNKNOWN,
            },
            {
              name: {
                tag: 'metrics2',
                group: 'group',
              },
              tag: 'metrics2',
              displayName: 'Metrics Two',
              description: 'describe metrics two',
              datasetType: types.DatasetType.DATASET_TRAINING,
            },
          ],
          runToHparamsAndMetrics: {
            'eid/run_name_1': {
              hparams: [
                {name: 'hparams1', value: -100},
                {name: 'hparams2', value: 'bar'},
              ],
              metrics: [
                {
                  tag: 'metrics1',
                  trainingStep: 1000,
                  value: 1,
                },
              ],
            },
            'eid/run_name_2/test': {
              hparams: [
                {name: 'hparams1', value: 100},
                {name: 'hparams2', value: 'foo'},
              ],
              metrics: [
                {
                  tag: 'metrics1',
                  trainingStep: 5000,
                  value: 0.6,
                },
              ],
            },
            'eid/run_name_2/train': {
              hparams: [
                {name: 'hparams1', value: 100},
                {name: 'hparams2', value: 'foo'},
              ],
              metrics: [
                {
                  tag: 'metrics1',
                  trainingStep: 2000,
                  value: 0.1,
                },
                {
                  tag: 'metrics1',
                  trainingStep: 10000,
                  value: 0.3,
                },
                {
                  tag: 'metrics2',
                  trainingStep: 10000,
                  value: 0,
                },
              ],
            },
          },
        });
      }
    );

    it('does not break when responses is empty', () => {
      const returnValue = jasmine.createSpy();
      dataSource.fetchHparamsMetadata('eid').subscribe(returnValue);
      httpMock
        .expectOne('/experiment/eid/data/plugin/hparams/experiment')
        .flush({
          description: '',
          hparamInfos: [],
          metricInfos: [],
          name: '',
          timeCreatedSecs: 0,
          user: '',
        });
      httpMock
        .expectOne('/experiment/eid/data/plugin/hparams/session_groups')
        .flush({
          sessionGroups: [],
          totalSize: 0,
        });

      expect(returnValue).toHaveBeenCalledWith({
        hparamSpecs: [],
        metricSpecs: [],
        runToHparamsAndMetrics: {},
      });
    });

    it('returns empty hparams when backend responds with 400', () => {
      const returnValue = jasmine.createSpy();
      dataSource.fetchHparamsMetadata('eid').subscribe(returnValue);
      httpMock
        .expectOne('/experiment/eid/data/plugin/hparams/experiment')
        .error(new ErrorEvent('400 error'), {status: 400});

      expect(returnValue).toHaveBeenCalledWith({
        hparamSpecs: [],
        metricSpecs: [],
        runToHparamsAndMetrics: {},
      });
    });

    it('throws error when response is 404', () => {
      const returnValue = jasmine.createSpy();
      const errorValue = jasmine.createSpy();
      dataSource.fetchHparamsMetadata('eid').subscribe(returnValue, errorValue);
      httpMock
        .expectOne('/experiment/eid/data/plugin/hparams/experiment')
        .error(new ErrorEvent('404 error'), {status: 404});

      expect(returnValue).not.toHaveBeenCalled();
      expect(errorValue).toHaveBeenCalled();
    });
  });
});
