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
  TBHttpClientTestingModule,
  HttpTestingController,
} from '../../../webapp_data_source/tb_http_client_testing';

import {TextV2DataSource} from './text_v2_data_source';

describe('tb_server_data_source', () => {
  describe('TextV2DataSource', () => {
    let dataSource: TextV2DataSource;
    let httpMock: HttpTestingController;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [TBHttpClientTestingModule],
        providers: [TextV2DataSource],
      }).compileComponents();

      httpMock = TestBed.inject(HttpTestingController);
      dataSource = TestBed.inject(TextV2DataSource);
    });

    describe('fetchRunToTag', () => {
      it('fetches from correct endpoint', () => {
        dataSource.fetchRunToTag().subscribe(jasmine.createSpy());
        httpMock.expectOne('data/plugin/text_v2/tags');
      });
    });

    describe('fetchTextData', () => {
      it('fetches from correct endpoint', () => {
        dataSource
          .fetchTextData('runName', 'tagName')
          .subscribe(jasmine.createSpy());
        httpMock.expectOne('data/plugin/text_v2/text?run=runName&tag=tagName');
      });

      it('reshapes response into frontend data structure', () => {
        const spy = jasmine.createSpy();
        dataSource.fetchTextData('runName', 'tagName').subscribe(spy);
        httpMock
          .expectOne('data/plugin/text_v2/text?run=runName&tag=tagName')
          .flush([
            {
              original_shape: [1],
              step: 3,
              string_array: [['foo']],
              wall_time: 123,
              truncated: false,
            },
          ]);

        expect(spy).toHaveBeenCalledWith([
          {
            originalShape: [1],
            step: 3,
            stringArray: [['foo']],
            wallTimeInMs: 123000,
            truncated: false,
          },
        ]);
      });
    });
  });
});
