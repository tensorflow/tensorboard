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
import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {filter, mergeMap, take, withLatestFrom} from 'rxjs/operators';

import {AppRootProvider} from '../app_routing/app_root';

// Intentionally import directly from feature_flag/, not the hourglass
// AppState/selectors. AppState depends on code from feature directories that
// use TBHttpClient themselves, so we avoid a possible circular dependency.
import {State} from '../feature_flag/store/feature_flag_types';
import {
  getIsFeatureFlagsLoaded,
  getIsInColab,
} from '../feature_flag/store/feature_flag_selectors';

import {
  DeleteOptions,
  GetOptions,
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
    body: FormData,
    options: PostOptions = {}
  ): Observable<ResponseType> {
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
            headers: options.headers,
            params: convertFormDataToObject(body),
          });
        } else {
          return this.http.post<ResponseType>(resolvedPath, body, options);
        }
      })
    );
  }

  put<ResponseType>(
    path: string,
    body: any,
    options: PutOptions = {}
  ): Observable<ResponseType> {
    return this.http.put<ResponseType>(
      this.resolveAppRoot(path),
      body,
      options
    );
  }

  delete<ResponseType>(
    path: string,
    options: DeleteOptions = {}
  ): Observable<ResponseType> {
    return this.http.delete<ResponseType>(this.resolveAppRoot(path), options);
  }
}
