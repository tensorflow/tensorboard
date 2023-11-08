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
import {RunsDataSource} from './runs_data_source_types';

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
});
