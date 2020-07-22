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

import {TBServerDataSource} from './tb_server_data_source';
import {
  TBHttpClientTestingModule,
  HttpTestingController,
} from './tb_http_client_testing';

describe('tb_server_data_source', () => {
  describe('TBServerDataSource', () => {
    let dataSource: TBServerDataSource;
    let httpMock: HttpTestingController;
    let tbBackend: any;

    beforeEach(async () => {
      tbBackend = {
        tf_backend: {
          runsStore: {
            refresh: jasmine.createSpy().and.callFake(() => Promise.resolve()),
          },
          environmentStore: {
            refresh: jasmine.createSpy().and.callFake(() => Promise.resolve()),
          },
        },
      };

      const createElementSpy = spyOn(
        document,
        'createElement'
      ).and.callThrough();

      createElementSpy.withArgs('tf-backend').and.returnValue(tbBackend);

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

    describe('fetchRuns', () => {
      it('fetches from "data/runs"', fakeAsync(() => {
        const results = jasmine.createSpy();
        dataSource.fetchRuns().subscribe(results);

        httpMock.expectOne('data/runs').flush(['foo', 'bar']);
        // Flush the promise in the microtask.
        flush();

        expect(results).toHaveBeenCalledWith([
          {id: 'foo', name: 'foo'},
          {id: 'bar', name: 'bar'},
        ]);
      }));

      it('calls the polymer API to refresh the polymer store, too', () => {
        dataSource.fetchRuns().subscribe(() => {});
        expect(tbBackend.tf_backend.runsStore.refresh).toHaveBeenCalled();
      });
    });

    describe('fetchEnvironment', () => {
      it('calls the polymer API to refresh the polymer store', () => {
        dataSource.fetchEnvironment().subscribe(() => {});
        expect(
          tbBackend.tf_backend.environmentStore.refresh
        ).toHaveBeenCalled();
      });
    });
  });
});
