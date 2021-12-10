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
import {createSampleEmbeddingData} from '../testing';
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
    it('does not fetch if no experiment passed', () => {
      const returnValue = jasmine.createSpy();
      dataSource.fetchData([]).subscribe(returnValue);
      expect(returnValue).not.toHaveBeenCalled();
    });

    it(
      'calls /annotations, /metrics, /values and /embeddings to return map ' +
        'of annotation to ValueData and map of runId to metrics',
      () => {
        const returnValue = jasmine.createSpy();
        dataSource.fetchData(['exp1']).subscribe(returnValue);
        httpMock
          .expectOne('/experiment/exp1/data/plugin/npmi/annotations')
          .flush({
            run_1: ['annotation_1', 'annotation_2'],
            run_2: ['annotation_2', 'annotation_3'],
          });
        httpMock.expectOne('/experiment/exp1/data/plugin/npmi/metrics').flush({
          run_1: ['count@test', 'nPMI@test'],
          run_2: ['count@test', 'nPMI@test'],
        });
        httpMock.expectOne('/experiment/exp1/data/plugin/npmi/values').flush({
          run_1: [
            [1000, 0.2618],
            [15298, -0.74621],
          ],
          run_2: [
            [3598, 0.135],
            [8327, -0.1572],
          ],
        });
        httpMock
          .expectOne('/experiment/exp1/data/plugin/npmi/embeddings')
          .flush({
            run_1: [[0.5], [-0.2]],
            run_2: [[-0.2], [0.1]],
          });

        const embeddingData = createSampleEmbeddingData();

        expect(returnValue).toHaveBeenCalledWith({
          annotationData: {
            annotation_1: [
              {
                nPMIValue: 0.2618,
                countValue: 1000,
                annotation: 'annotation_1',
                metric: 'test',
                run: 'exp1/run_1',
              },
            ],
            annotation_2: [
              {
                nPMIValue: -0.74621,
                countValue: 15298,
                annotation: 'annotation_2',
                metric: 'test',
                run: 'exp1/run_1',
              },
              {
                nPMIValue: 0.135,
                countValue: 3598,
                annotation: 'annotation_2',
                metric: 'test',
                run: 'exp1/run_2',
              },
            ],
            annotation_3: [
              {
                nPMIValue: -0.1572,
                countValue: 8327,
                annotation: 'annotation_3',
                metric: 'test',
                run: 'exp1/run_2',
              },
            ],
          },
          metrics: {
            'exp1/run_1': ['count@test', 'nPMI@test'],
            'exp1/run_2': ['count@test', 'nPMI@test'],
          },
          embeddingDataSet: jasmine.objectContaining({
            ...embeddingData,
            shuffledDataIndices: jasmine.any(Object),
          }),
        });
      }
    );

    it('does not break when responses is empty', () => {
      const returnValue = jasmine.createSpy();
      dataSource.fetchData(['exp1']).subscribe(returnValue);
      httpMock
        .expectOne('/experiment/exp1/data/plugin/npmi/annotations')
        .flush({});
      httpMock.expectOne('/experiment/exp1/data/plugin/npmi/metrics').flush({});
      httpMock.expectOne('/experiment/exp1/data/plugin/npmi/values').flush({});
      httpMock
        .expectOne('/experiment/exp1/data/plugin/npmi/embeddings')
        .flush({});

      expect(returnValue).toHaveBeenCalledWith({
        annotationData: {},
        metrics: {},
        embeddingDataSet: undefined,
      });
    });

    it('returns empty data when backend responds with 400', () => {
      const returnValue = jasmine.createSpy();
      dataSource.fetchData(['exp1']).subscribe(returnValue);
      httpMock
        .expectOne('/experiment/exp1/data/plugin/npmi/annotations')
        .error(new ErrorEvent('400 error'), {status: 400});

      expect(returnValue).toHaveBeenCalledWith({
        annotationData: {},
        metrics: {},
        embeddingDataSet: undefined,
      });
    });

    it('throws error when response is >= 500', () => {
      const returnValue = jasmine.createSpy();
      const errorValue = jasmine.createSpy();
      dataSource.fetchData(['exp1']).subscribe(returnValue, errorValue);
      httpMock
        .expectOne('/experiment/exp1/data/plugin/npmi/values')
        .error(new ErrorEvent('501 Internal Server Error'), {status: 501});

      expect(returnValue).not.toHaveBeenCalled();
      expect(errorValue).toHaveBeenCalled();
    });
  });
});
