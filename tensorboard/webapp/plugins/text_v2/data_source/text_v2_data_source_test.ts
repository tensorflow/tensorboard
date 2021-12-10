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
import {TextV2ServerDataSource} from './text_v2_server_data_source';

describe('tb_server_data_source', () => {
  describe('TextV2ServerDataSource', () => {
    let dataSource: TextV2ServerDataSource;
    let httpMock: HttpTestingController;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [TBHttpClientTestingModule],
        providers: [TextV2ServerDataSource],
      }).compileComponents();

      httpMock = TestBed.inject(HttpTestingController);
      dataSource = TestBed.inject(TextV2ServerDataSource);
    });

    describe('fetchRunToTag', () => {
      it('fetches from correct endpoint', () => {
        dataSource.fetchRunToTag().subscribe(jasmine.createSpy());
        httpMock.expectOne('data/plugin/text_v2/tags');
      });

      it('converts object to a map', () => {
        const spy = jasmine.createSpy();
        dataSource.fetchRunToTag().subscribe(spy);
        httpMock.expectOne('data/plugin/text_v2/tags').flush({
          run1: ['tag1', 'tag2'],
        });

        expect(spy).toHaveBeenCalledWith(new Map([['run1', ['tag1', 'tag2']]]));
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
