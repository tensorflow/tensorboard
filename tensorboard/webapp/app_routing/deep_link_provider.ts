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
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';

import {State} from '../app_state';

import {SerializableQueryParams} from './types';

/**
 * The `DeepLinkProvider` interface standardizes the relationship between the
 * app state and the URL parameters.  It is expected that when either an update
 * to the URL parameters should change app state, or, in the other direction,
 * when an update to the state should cause a change in the URL parameters,
 * that logic should be invoked through a `DeepLinkProvider`.
 */
@Injectable()
export abstract class DeepLinkProvider {

  /**
   * Modifies the URL to match the state of the app.
   * @param store The ngrx store containing the state of the app.
   * @return An observable which will emit the query parameters matching the state.
   */
  abstract serializeStateToQueryParams(
    store: Store<State>
  ): Observable<SerializableQueryParams>;

  /**
   * Given the query params, updates the ngrx state to match.
   * @param queryParams TensorBoard URL SeralizableQueryParams that should be used
   *     to update the app state.
   * @return A JS object describing a patch that should be made to the ngrx state.
   */
  abstract deserializeQueryParams(queryParams: SerializableQueryParams): object;
}
