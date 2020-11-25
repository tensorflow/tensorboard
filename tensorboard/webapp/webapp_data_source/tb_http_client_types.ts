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
import {HttpHeaders, HttpParams} from '@angular/common/http';
import {Observable} from 'rxjs';

export interface HttpOptions {
  headers?: HttpHeaders;
  params?: HttpParams | {[paramKey: string]: string | string[]};
}

export type GetOptions = HttpOptions;
export type PostOptions = HttpOptions;
export type PutOptions = HttpOptions;
export type DeleteOptions = HttpOptions;

export interface TBHttpClientInterface {
  get<ResponseType>(
    path: string,
    option?: GetOptions
  ): Observable<ResponseType>;

  post<ResponseType>(
    path: string,
    body: any,
    options?: PostOptions
  ): Observable<ResponseType>;

  put<ResponseType>(
    path: string,
    body: any,
    options?: PutOptions
  ): Observable<ResponseType>;

  delete<ResponseType>(
    path: string,
    options?: DeleteOptions
  ): Observable<ResponseType>;
}
