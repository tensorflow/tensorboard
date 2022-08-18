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
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {select, Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {first, switchMap} from 'rxjs/operators';
import {getFeatureFlagsToSendToServer} from '../store/feature_flag_selectors';
import {State as FeatureFlagState} from '../store/feature_flag_types';
import {FEATURE_FLAGS_HEADER_NAME} from './const';

/**
 * HttpInterceptor for injecting feature flags into each HTTP request
 * originating from the Angular TensorBoard code base.
 */
@Injectable()
export class FeatureFlagHttpInterceptor implements HttpInterceptor {
  constructor(private readonly store: Store<FeatureFlagState>) {}

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    return this.store.pipe(
      select(getFeatureFlagsToSendToServer),
      first(),
      switchMap((featureFlags) => {
        // Add feature flags to the headers.
        request = request.clone({
          headers: request.headers.set(
            FEATURE_FLAGS_HEADER_NAME,
            JSON.stringify(featureFlags)
          ),
        });
        // Delegate to next Interceptor.
        return next.handle(request);
      })
    );
  }
}
