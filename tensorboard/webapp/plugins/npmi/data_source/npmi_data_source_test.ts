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
import {TestBed} from '@angular/core/testing';
import {
  HttpTestingController,
  TBHttpClientTestingModule,
} from '../../../webapp_data_source/tb_http_client_testing';

import {NpmiHttpServerDataSource} from './npmi_data_source';

describe('runs_data_source', () => {
  let httpMock: HttpTestingController;
  let dataSource: NpmiHttpServerDataSource;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TBHttpClientTestingModule],
      providers: [NpmiHttpServerDataSource],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    dataSource = TestBed.inject(NpmiHttpServerDataSource);
  });

  describe('fetch data', () => {
    it(
      'calls /annotations, /metrics, and /values to return map of annotation ' +
        'to ValueData and map of runId to metrics',
      () => {
        const returnValue = jasmine.createSpy();
        dataSource.fetchData().subscribe(returnValue);
        httpMock.expectOne('data/plugin/npmi/annotations').flush({
          run_1: ['annotation_1', 'annotation_2'],
          run_2: ['annotation_2', 'annotation_3'],
        });
        httpMock.expectOne('data/plugin/npmi/metrics').flush({
          run_1: ['count@test', 'nPMI@test'],
          run_2: ['count@test', 'nPMI@test'],
        });
        httpMock.expectOne('data/plugin/npmi/values').flush({
          run_1: [
            [1000, 0.2618],
            [15298, -0.74621],
          ],
          run_2: [
            [3598, 0.135],
            [8327, -0.1572],
          ],
        });

        expect(returnValue).toHaveBeenCalledWith({
          annotationData: {
            annotation_1: [
              {
                nPMIValue: 0.2618,
                countValue: 1000,
                annotation: 'annotation_1',
                metric: 'test',
                run: 'run_1',
              },
            ],
            annotation_2: [
              {
                nPMIValue: -0.74621,
                countValue: 15298,
                annotation: 'annotation_2',
                metric: 'test',
                run: 'run_1',
              },
              {
                nPMIValue: 0.135,
                countValue: 3598,
                annotation: 'annotation_2',
                metric: 'test',
                run: 'run_2',
              },
            ],
            annotation_3: [
              {
                nPMIValue: -0.1572,
                countValue: 8327,
                annotation: 'annotation_3',
                metric: 'test',
                run: 'run_2',
              },
            ],
          },
          metrics: {
            run_1: ['count@test', 'nPMI@test'],
            run_2: ['count@test', 'nPMI@test'],
          },
        });
      }
    );

    it('does not break when responses is empty', () => {
      const returnValue = jasmine.createSpy();
      dataSource.fetchData().subscribe(returnValue);
      httpMock.expectOne('data/plugin/npmi/annotations').flush({});
      httpMock.expectOne('data/plugin/npmi/metrics').flush({});
      httpMock.expectOne('data/plugin/npmi/values').flush({});

      expect(returnValue).toHaveBeenCalledWith({
        annotationData: {},
        metrics: {},
      });
    });

    it('returns empty data when backend responds with 400', () => {
      const returnValue = jasmine.createSpy();
      dataSource.fetchData().subscribe(returnValue);
      httpMock
        .expectOne('data/plugin/npmi/annotations')
        .error(new ErrorEvent('400 error'), {status: 400});

      expect(returnValue).toHaveBeenCalledWith({
        annotationData: {},
        metrics: {},
      });
    });

    it('throws error when response is >= 500', () => {
      const returnValue = jasmine.createSpy();
      const errorValue = jasmine.createSpy();
      dataSource.fetchData().subscribe(returnValue, errorValue);
      httpMock
        .expectOne('data/plugin/npmi/values')
        .error(new ErrorEvent('501 Internal Server Error'), {status: 501});

      expect(returnValue).not.toHaveBeenCalled();
      expect(errorValue).toHaveBeenCalled();
    });
  });
});
