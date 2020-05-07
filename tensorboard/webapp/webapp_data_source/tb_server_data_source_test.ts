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

import {TBServerDataSource} from './tb_server_data_source';
import {
  TBHttpClientTestingModule,
  HttpTestingController,
} from './tb_http_client_testing';

describe('tb_server_data_source', () => {
  describe('TBServerDataSource', () => {
    let dataSource: TBServerDataSource;
    let httpMock: HttpTestingController;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [TBHttpClientTestingModule],
        providers: [TBServerDataSource],
      }).compileComponents();

      httpMock = TestBed.inject(HttpTestingController);
      dataSource = TestBed.inject(TBServerDataSource);
    });

    describe('fetchPluginsListing', () => {
      it('fetches from "data/plugins_listing"', () => {
        dataSource.fetchPluginsListing([]).subscribe(jasmine.createSpy());
        httpMock.expectOne('data/plugins_listing');
      });

      it('passes query parameter, "experimentalPlugin"', () => {
        dataSource
          .fetchPluginsListing(['foo', 'bar'])
          .subscribe(jasmine.createSpy());
        httpMock.expectOne(
          'data/plugins_listing?experimentalPlugin=foo&experimentalPlugin=bar'
        );
      });
    });
  });
});
