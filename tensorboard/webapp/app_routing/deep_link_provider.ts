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
 *
 * TensorBoard router considers the URL as a view. A subset of state
 * gets projected onto it, just like a HTML input element. The
 * DeepLinkProvider provides state that would be projected onto the
 * "view" and, inversely, read state from the "view".
 *
 * Since the state to be reflected onto the URL bar differs by a
 * route, we have a DeepLinkProvider per route.
 */
@Injectable()
export abstract class DeepLinkProvider {
  /**
   * Returns an Observable that the app router will listen to.  The router
   * should respond to each emission by updating the URL query params with the
   * new values. The emitted query params should fully replace the query params
   * in the URL, rather than be appended to them.
   *
   * @param store The ngrx store containing the state of the app.
   * @return An observable which will emit the query parameters to update
   *     the URL.
   */
  abstract serializeStateToQueryParams(
    store: Store<State>
  ): Observable<SerializableQueryParams>;

  /**
   * When the URL changes, the router dispatches a `stateRehydratedFromUrl`
   * action [1], and calls this method to generate the action's payload.
   * Specifically, the result of this method becomes the `partialState`
   * field on the payload.
   *
   * [1] webapp/app_routing/actions/app_routing_actions.ts
   *
   * @param queryParams TensorBoard URL SeralizableQueryParams that should be used
   *     to update the app state.
   * @return A JS object to be packaged within the `stateRehydratedFromUrl`
   *    action sufficient that the reducer should be able to update the State.
   */
  abstract deserializeQueryParams(queryParams: SerializableQueryParams): object;
}
