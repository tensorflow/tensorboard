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
import {Store} from '@ngrx/store';
import {MockStore} from '@ngrx/store/testing';

import {State} from '../feature_flag/store/feature_flag_types';
import {
  getIsFeatureFlagsLoaded,
  getIsInColab,
} from '../feature_flag/store/feature_flag_selectors';
import {TBFeatureFlagTestingModule} from './tb_feature_flag_testing';
import {
  HttpTestingController,
  TBHttpClientTestingModule,
} from './tb_http_client_testing';
import {TBHttpClient} from './tb_http_client';

describe('TBHttpClient', () => {
  let tbHttpClient: TBHttpClient;
  let httpMock: HttpTestingController;
  let store: MockStore<State>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TBFeatureFlagTestingModule, TBHttpClientTestingModule],
      providers: [TBHttpClient],
    }).compileComponents();

    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    httpMock = TestBed.inject(HttpTestingController);
    tbHttpClient = TestBed.inject(TBHttpClient);
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

  it('converts POST requests to GET when in Colab', () => {
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
});
