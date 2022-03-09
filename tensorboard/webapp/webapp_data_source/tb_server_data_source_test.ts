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
import {PluginsListFailureCode} from '../core/types';
import {
  HttpTestingController,
  TBHttpClientTestingModule,
} from './tb_http_client_testing';
import {TBServerDataSource, TBServerError} from './tb_server_data_source';

describe('tb_server_data_source', () => {
  describe('TBServerDataSource', () => {
    let dataSource: TBServerDataSource;
    let httpMock: HttpTestingController;
    let tbBackend: any;

    beforeEach(async () => {
      tbBackend = {
        tf_backend: {
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

      it('handles "data/plugins_listing" failures', fakeAsync(() => {
        const results = jasmine.createSpy();
        const error = jasmine.createSpy();
        dataSource.fetchPluginsListing([]).subscribe(results, error);

        httpMock
          .expectOne('data/plugins_listing')
          .error(new ErrorEvent('FakeError'), {status: 501});
        // Flush the promise in the microtask.
        flush();

        expect(results).not.toHaveBeenCalled();
        expect(error).toHaveBeenCalledWith(
          new TBServerError(PluginsListFailureCode.UNKNOWN)
        );
      }));
    });

    describe('fetchEnvironment', () => {
      it('fetches from "data/environment"', fakeAsync(() => {
        const results = jasmine.createSpy();
        dataSource.fetchEnvironment().subscribe(results);

        httpMock.expectOne('data/environment').flush({
          data_location: '/dev/null',
          window_title: 'my_environment_test',
        });
        // Flush the promise in the microtask.
        flush();

        expect(results).toHaveBeenCalledWith({
          data_location: '/dev/null',
          window_title: 'my_environment_test',
        });
      }));

      it('calls the polymer API to refresh the polymer store', () => {
        dataSource.fetchEnvironment().subscribe(() => {});
        expect(
          tbBackend.tf_backend.environmentStore.refresh
        ).toHaveBeenCalled();
      });

      it('handles "data/environment" failures', fakeAsync(() => {
        const results = jasmine.createSpy();
        const error = jasmine.createSpy();
        dataSource.fetchEnvironment().subscribe(results, error);

        httpMock
          .expectOne('data/environment')
          .error(new ErrorEvent('FakeError'), {status: 444});
        // Flush the promise in the microtask.
        flush();

        expect(results).not.toHaveBeenCalled();
        expect(error).toHaveBeenCalledWith(
          new TBServerError(PluginsListFailureCode.UNKNOWN)
        );
      }));
    });

    describe('handleError', () => {
      it('handles 404 failures as NOT_FOUND', fakeAsync(() => {
        const error = jasmine.createSpy();
        dataSource
          .fetchPluginsListing([])
          .subscribe(jasmine.createSpy(), error);

        httpMock
          .expectOne('data/plugins_listing')
          .error(new ErrorEvent('FakeError'), {status: 404});
        // Flush the promise in the microtask.
        flush();

        expect(error).toHaveBeenCalledWith(
          new TBServerError(PluginsListFailureCode.NOT_FOUND)
        );
      }));

      it('handles 403 failures as PERMISSION_DENIED', fakeAsync(() => {
        const error = jasmine.createSpy();
        dataSource
          .fetchPluginsListing([])
          .subscribe(jasmine.createSpy(), error);

        httpMock
          .expectOne('data/plugins_listing')
          .error(new ErrorEvent('FakeError'), {status: 403});
        // Flush the promise in the microtask.
        flush();

        expect(error).toHaveBeenCalledWith(
          new TBServerError(PluginsListFailureCode.PERMISSION_DENIED)
        );
      }));

      it('handles other failures as UNKNOWN', fakeAsync(() => {
        const error = jasmine.createSpy();
        dataSource
          .fetchPluginsListing([])
          .subscribe(jasmine.createSpy(), error);

        httpMock
          .expectOne('data/plugins_listing')
          .error(new ErrorEvent('FakeError'), {status: 500});
        // Flush the promise in the microtask.
        flush();

        expect(error).toHaveBeenCalledWith(
          new TBServerError(PluginsListFailureCode.UNKNOWN)
        );
      }));
    });
  });
});
