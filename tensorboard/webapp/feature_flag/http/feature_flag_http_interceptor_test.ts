/* Copyright 2022 The TensorFlow Authors. All Rights Reserved.

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

import {HttpClient, HttpHeaders, HTTP_INTERCEPTORS} from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {provideMockActions} from '@ngrx/effects/testing';
import {Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {of} from 'rxjs';
import {getFeatureFlags} from '../store/feature_flag_selectors';
import {State as FeatureFlagState} from '../store/feature_flag_types';
import {buildFeatureFlag} from '../testing';
import {FEATURE_FLAGS_HEADER_NAME} from './const';
import {FeatureFlagHttpInterceptor} from './feature_flag_http_interceptor';

describe('FeatureFlagHttpInterceptor', () => {
  let store: MockStore<FeatureFlagState>;
  let httpClient: HttpClient;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        provideMockActions(() => of()),
        provideMockStore(),
        {
          provide: HTTP_INTERCEPTORS,
          useClass: FeatureFlagHttpInterceptor,
          multi: true,
        },
      ],
    }).compileComponents();

    store = TestBed.inject<Store<FeatureFlagState>>(
      Store
    ) as MockStore<FeatureFlagState>;
    store.overrideSelector(getFeatureFlags, buildFeatureFlag());

    // Note that we do not test FeatureFlagHttpInterceptor directly. We instead
    // test it indirectly by firing Http requests and examining the final
    // request recorded by the HttpTestingController.
    httpClient = TestBed.inject(HttpClient);
  });

  it('injects feature flags into the HTTP request', () => {
    store.overrideSelector(getFeatureFlags, buildFeatureFlag({inColab: true}));
    httpClient.get('/data/hello').subscribe();
    const request = TestBed.inject(HttpTestingController).expectOne(
      '/data/hello'
    );
    expect(request.request.headers).toEqual(
      new HttpHeaders().set(
        FEATURE_FLAGS_HEADER_NAME,
        JSON.stringify(buildFeatureFlag({inColab: true}))
      )
    );
  });
});
