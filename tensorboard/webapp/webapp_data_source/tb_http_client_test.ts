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
import {HttpHeaders} from '@angular/common/http';
import {TestBed} from '@angular/core/testing';
import {Store} from '@ngrx/store';
import {MockStore} from '@ngrx/store/testing';
import {
  AppRootProvider,
  TestableAppRootProvider,
} from '../app_routing/app_root';
import {
  getIsFeatureFlagsLoaded,
  getIsInColab,
} from '../feature_flag/store/feature_flag_selectors';
import {State} from '../feature_flag/store/feature_flag_types';
import {TBFeatureFlagTestingModule} from './tb_feature_flag_testing';
import {TBHttpClient, XSRF_REQUIRED_HEADER} from './tb_http_client';
import {
  HttpTestingController,
  TBHttpClientTestingModule,
} from './tb_http_client_testing';

describe('TBHttpClient', () => {
  let tbHttpClient: TBHttpClient;
  let httpMock: HttpTestingController;
  let store: MockStore<State>;
  let appRootProvider: TestableAppRootProvider;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TBFeatureFlagTestingModule, TBHttpClientTestingModule],
      providers: [
        TBHttpClient,
        {provide: AppRootProvider, useClass: TestableAppRootProvider},
      ],
    }).compileComponents();

    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    httpMock = TestBed.inject(HttpTestingController);
    tbHttpClient = TestBed.inject(TBHttpClient);
    appRootProvider = TestBed.inject(
      AppRootProvider
    ) as TestableAppRootProvider;
  });

  afterEach(() => {
    store?.resetSelectors();
  });

  it('waits for feature flags before making POST request', () => {
    const body = new FormData();
    body.append('formKey', 'value');
    store.overrideSelector(getIsFeatureFlagsLoaded, false);
    tbHttpClient.post('foo', body).subscribe(jasmine.createSpy());
    httpMock.expectNone('foo');

    store.overrideSelector(getIsFeatureFlagsLoaded, true);
    store.refreshState();
    httpMock.expectOne((req) => {
      return (
        req.method === 'POST' &&
        req.urlWithParams === 'foo' &&
        JSON.stringify(req.body) === JSON.stringify(body)
      );
    });
  });

  it('makes POST requests when not in Colab', () => {
    const body = new FormData();
    body.append('formKey', 'value');
    store.overrideSelector(getIsFeatureFlagsLoaded, true);
    store.overrideSelector(getIsInColab, false);
    tbHttpClient.post('foo', body).subscribe(jasmine.createSpy());
    httpMock.expectOne((req) => {
      return (
        req.method === 'POST' &&
        req.urlWithParams === 'foo' &&
        JSON.stringify(req.body) === JSON.stringify(body)
      );
    });
  });

  describe('converts POST requests to GET when in Colab', () => {
    it('using form data', () => {
      const body = new FormData();
      body.append('formKey', 'value');
      store.overrideSelector(getIsFeatureFlagsLoaded, true);
      store.overrideSelector(getIsInColab, true);
      tbHttpClient.post('foo', body).subscribe(jasmine.createSpy());
      httpMock.expectOne((req) => {
        return (
          req.method === 'GET' &&
          req.urlWithParams === 'foo?formKey=value' &&
          !req.body
        );
      });
    });

    it('using json', () => {
      const body = {key: 'value'};
      store.overrideSelector(getIsFeatureFlagsLoaded, true);
      store.overrideSelector(getIsInColab, true);
      tbHttpClient.post('foo', body).subscribe(jasmine.createSpy());
      httpMock.expectOne((req) => {
        return (
          req.method === 'GET' &&
          req.urlWithParams === 'foo?key=value' &&
          !req.body
        );
      });
    });

    it('sets body as a serialized query param when serializeUnder is set', () => {
      const body = {key: 'value', foo: [1, 2, 3]};
      store.overrideSelector(getIsFeatureFlagsLoaded, true);
      store.overrideSelector(getIsInColab, true);
      tbHttpClient
        .post('foo', body, {}, 'request')
        .subscribe(jasmine.createSpy());
      httpMock.expectOne((req) => {
        return (
          req.method === 'GET' &&
          req.urlWithParams ===
            'foo?request=%7B%22key%22:%22value%22,%22foo%22:%5B1,2,3%5D%7D' &&
          !req.body
        );
      });
    });
  });

  describe('for XSRF headers', () => {
    it('does not attach anything to GET requests', () => {
      tbHttpClient.get('/').subscribe();
      httpMock.expectOne((req) => !req.headers.has(XSRF_REQUIRED_HEADER));
    });
    it('attaches custom header to POST requests', () => {
      tbHttpClient.post('/', new FormData()).subscribe();
      httpMock.expectOne((req) => req.headers.has(XSRF_REQUIRED_HEADER));
    });
    it('attaches custom header to POST requests sent as GETs due to Colab', () => {
      store.overrideSelector(getIsFeatureFlagsLoaded, true);
      store.overrideSelector(getIsInColab, true);
      tbHttpClient.post('/', new FormData()).subscribe();
      httpMock.expectOne(
        (req) => req.method === 'GET' && req.headers.has(XSRF_REQUIRED_HEADER)
      );
    });
    it('attaches custom header to PUT requests', () => {
      tbHttpClient.put('/', new FormData()).subscribe();
      httpMock.expectOne((req) => req.headers.has(XSRF_REQUIRED_HEADER));
    });
    it('attaches custom header to DELETE requests', () => {
      tbHttpClient.delete('/').subscribe();
      httpMock.expectOne((req) => req.headers.has(XSRF_REQUIRED_HEADER));
    });
    it('does not clobber unrelated headers', () => {
      tbHttpClient
        .delete('/', {headers: new HttpHeaders('X-Unrelated: 1')})
        .subscribe();
      httpMock.expectOne((req) => req.headers.has('X-Unrelated'));
    });
  });

  it('prefixes absolute paths with the app-root', () => {
    appRootProvider.setAppRoot('/my-path-prefix/');

    tbHttpClient.get('/').subscribe();
    httpMock.expectOne((req) => req.urlWithParams === '/my-path-prefix/');

    tbHttpClient.get('/foo').subscribe();
    httpMock.expectOne((req) => req.urlWithParams === '/my-path-prefix/foo');

    tbHttpClient.get('/foo/2').subscribe();
    httpMock.expectOne((req) => req.urlWithParams === '/my-path-prefix/foo/2');
  });

  it('does not prefix relative paths and URLs with the app-root', () => {
    appRootProvider.setAppRoot('/my-path-prefix/');

    tbHttpClient.get('foo').subscribe();
    httpMock.expectOne((req) => req.urlWithParams === 'foo');

    tbHttpClient.get('foo/2').subscribe();
    httpMock.expectOne((req) => req.urlWithParams === 'foo/2');

    tbHttpClient.get('./foo').subscribe();
    httpMock.expectOne((req) => req.urlWithParams === './foo');
  });
});
