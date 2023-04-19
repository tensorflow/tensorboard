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
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {filter, mergeMap, take, withLatestFrom} from 'rxjs/operators';
import {AppRootProvider} from '../app_routing/app_root';
import {
  getIsFeatureFlagsLoaded,
  getIsInColab,
} from '../feature_flag/store/feature_flag_selectors';
// Intentionally import directly from feature_flag/, not the hourglass
// AppState/selectors. AppState depends on code from feature directories that
// use TBHttpClient themselves, so we avoid a possible circular dependency.
import {State} from '../feature_flag/store/feature_flag_types';
import {
  DeleteOptions,
  GetOptions,
  HttpOptions,
  PostOptions,
  PutOptions,
  TBHttpClientInterface,
} from './tb_http_client_types';

export {HttpErrorResponse} from '@angular/common/http';

function convertFormDataToObject(formData: FormData) {
  const result = {} as {[param: string]: string | string[]};
  for (const [key, value] of formData.entries()) {
    result[key] = value as string;
  }
  return result;
}

function bodyToParams(body: any | null, serializeUnder?: string) {
  if (!body) {
    return;
  }
  const params =
    body instanceof FormData ? convertFormDataToObject(body) : body;
  if (serializeUnder) {
    return {
      [serializeUnder]: JSON.stringify(params),
    };
  }
  return params;
}

export const XSRF_REQUIRED_HEADER = 'X-XSRF-Protected';

/**
 * Adds an XSRF header to the given request options.
 *
 * The input is not mutated.
 */
function withXsrfHeader(options: HttpOptions): HttpOptions {
  let headers = options.headers || new HttpHeaders();
  headers = headers.append(XSRF_REQUIRED_HEADER, '1');
  return {...options, headers};
}

@Injectable()
export class TBHttpClient implements TBHttpClientInterface {
  constructor(
    private readonly appRootProvider: AppRootProvider,
    private readonly http: HttpClient,
    private readonly store: Store<State>
  ) {}

  private resolveAppRoot(path: string): string {
    if (path.startsWith('/')) {
      return this.appRootProvider.getAbsPathnameWithAppRoot(path);
    }
    return path;
  }

  get<ResponseType>(
    path: string,
    options: GetOptions = {}
  ): Observable<ResponseType> {
    return this.http.get<ResponseType>(this.resolveAppRoot(path), options);
  }

  post<ResponseType>(
    path: string,
    // Angular's HttpClient is typed exactly this way.
    body: any | null,
    options: PostOptions | undefined = {},
    serializeUnder: string | undefined = undefined
  ): Observable<ResponseType> {
    options = withXsrfHeader(options);
    return this.store.select(getIsFeatureFlagsLoaded).pipe(
      filter((isLoaded) => Boolean(isLoaded)),
      take(1),
      withLatestFrom(this.store.select(getIsInColab)),
      mergeMap(([, isInColab]) => {
        const resolvedPath = this.resolveAppRoot(path);

        // Google-internal Colab does not support HTTP POST requests, so we fall
        // back to HTTP GET (even though public Colab supports POST)
        // See b/72932164.
        if (isInColab) {
          return this.http.get<ResponseType>(resolvedPath, {
            headers: options.headers ?? {},
            params: bodyToParams(body, serializeUnder),
          });
        } else {
          return this.http.post<ResponseType>(resolvedPath, body, options);
        }
      })
    );
  }

  put<ResponseType>(
    path: string,
    // Angular's HttpClient is typed exactly this way.
    body: any | null,
    options: PutOptions = {}
  ): Observable<ResponseType> {
    return this.http.put<ResponseType>(
      this.resolveAppRoot(path),
      body,
      withXsrfHeader(options)
    );
  }

  delete<ResponseType>(
    path: string,
    options: DeleteOptions = {}
  ): Observable<ResponseType> {
    return this.http.delete<ResponseType>(
      this.resolveAppRoot(path),
      withXsrfHeader(options)
    );
  }
}
