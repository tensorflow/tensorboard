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
/**
 * @fileoverview Helper for reducers to maintain namespaced state.
 *
 * A "namespace", in this context, is a logical grouping of routes/points in
 * browser history. As a user navigates in the app, from one route to another,
 * they may be navigating within the same namespace or navigating between
 * different namespaces.
 *
 * "Namespaced state", then, is state that is tied to the lifetime of namespaces.
 * This state may need to be swapped out to cache, reset, or swapped in from
 * cache as user navigates from one namespace to another.
 *
 * This helper manages namespaced state by determining when namespaced state
 * needs to be swapped into cache, reset, and swapped out of cache. At a high
 * level, it listens for user navigations and applies the following rules:
 *
 *   * As a user navigates within a namespace, namespaced state is neither
 *     swapped in from / out to cache nor reset. (Thus changes to state by
 *     reducers accumulate over time)
 *
 *   * When a user navigates from one namespace to a new namespace, then the
 *     previous namespace's state is cached and next namespace's state is created
 *     new -- the state is essentially reset. (Thus subsequent changes to state
 *     by reducers are on the newly-reset state)
 *
 *   * When user navigates from one namespace to an existing namespace, then the
 *     previous namespace's state is cached and the next namespaces' state is
 *     swapped out from cache. (Thus subsequent changes to state by reducers are
 *     on the uncached state.)
 *
 *
 * Clients should never peek into or modify the property,
 * `privateNamespacedState`.
 *
 * For discussion, please refer to:
 *   * The original route-based namespace design: docs/design/route-contexted-state.md.
 *   * The new time-based namespace design: http://go/tb-timespaced-state
 */

import {ActionReducer, createReducer, on} from '@ngrx/store';
import {navigated} from './actions';
import {Route} from './types';

// `privateNamespacedState` loosely typed only for ease of writing tests.
// Otherwise, all the reducers that have namespaced state have to change the test
// to create an object that satisfies the typing.
// In practice, it always has value because of `initialState`.
interface PrivateState<NamespacedState> {
  privateNamespacedState?: {
    [namespaceId: string]: NamespacedState;
  };
}

/**
 * NamespaceContextedState is all of a feature/reducer's defined State
 * subdivided into NamespacedState and NonNamespacedState.
 *
 * Example usage:
 * type ReducerState = NamespaceContextedState<
 *     {myNamespacedState: number},
 *     {nonNamespacedState: string},
 * >;
 */
export type NamespaceContextedState<
  NamespacedState extends {},
  NonNamespacedState extends {}
> = NonNamespacedState & NamespacedState & PrivateState<NamespacedState>;

/**
 * Utility for managing namespaced state. It returns namespace-contexted
 * `initialState` and `reducers` that help manage the namespaced state.
 *
 * An optional `onNavigated` function allows more fine-grained changes to state
 * based on the routes information. Instead of listening to `navigated` action
 * on feature reducers, we should implement this `onNavigated` function, which
 * guarantees that the implementation runs after route completely navigated.
 * It guarantees that the change happens after namespaced state has
 * been properly cached or reset, if appropriate. Note that this callback may be
 * called even when namespace is not changed -- not all navigations to Routes
 * lead to namespaces changes.
 *
 * Example usage:
 *
 * const {initialState, reducers: namespacedReducers} =
 *    createNamespaceContextedState(
 *        {myNamespacedState: 0},
 *        {nonNamespacedState: 'one'},
 *        (state, oldRoute, newRoute) => {
 *          // Perform more complex state transformations based on route kind
 *          // or the set of experiments.
 *          if (!areSameRouteKindAndExperiments(oldRoute, newRoute)) {
 *            return {myState: 'one'};
 *          }
 *          return state;
 *        }
 *    );
 *
 * export const reducers = composeReducers(routeReducers, reducer);
 */
export function createNamespaceContextedState<
  NamespacedState extends {},
  NonNamespacedState extends {}
>(
  namespacedInitialState: NamespacedState,
  nonNamespacedInitialState: NonNamespacedState,
  onNavigated?: (
    state: NamespaceContextedState<NamespacedState, NonNamespacedState>,
    oldRoute: Route | null,
    newRoute: Route
  ) => NamespaceContextedState<NamespacedState, NonNamespacedState>
): {
  initialState: NamespaceContextedState<NamespacedState, NonNamespacedState>;
  reducers: ActionReducer<
    NamespaceContextedState<NamespacedState, NonNamespacedState>
  >;
} {
  type FullState = NamespaceContextedState<NamespacedState, NonNamespacedState>;
  const keys = Object.keys(namespacedInitialState) as Array<
    keyof NamespacedState
  >;

  const initialState: FullState = {
    ...namespacedInitialState,
    ...nonNamespacedInitialState,
    privateNamespacedState: {},
  };

  /**
   * Updates namespaced state to match key `afterNamespaceId`. Takes existing
   * namespaced state and caches it using key `beforeNamespaceId`.
   */
  function updateNamespacedState(
    state: FullState,
    beforeNamespaceId: string | null,
    afterNamespaceId: string
  ) {
    let nextContextedStateCache: {
      [namespaceId: string]: NamespacedState;
    } = {...state.privateNamespacedState};

    if (beforeNamespaceId) {
      // Swap out namespaced state to cache, keyed by beforeNamespaceId.
      const namespacedStateToCache = {} as NamespacedState;
      for (const key of keys) {
        namespacedStateToCache[key] = (state as NamespacedState)[key];
      }
      nextContextedStateCache = {
        ...nextContextedStateCache,
        [beforeNamespaceId]: namespacedStateToCache,
      };
    }

    // Update namespaced state to reflect afterNamespaceId.
    let nextNamespacedState = {};
    // Note: state.privateNamespacedState always exists in practice except
    // for in tests.
    if (state.privateNamespacedState?.[afterNamespaceId]) {
      // Swap in existing state since it already exists in the cache.
      nextNamespacedState = state.privateNamespacedState[afterNamespaceId];
    } else if (beforeNamespaceId) {
      // Reset to initial state since we had a cache miss and this is not
      // initial load.
      //
      // Note: We don't reset to initial state on initial load because we
      // assume the state already has values from bootstrapping deeplinks and
      // we should not overwrite the values.
      nextNamespacedState = namespacedInitialState;
    }

    return {
      ...state,
      ...nextNamespacedState,
      privateNamespacedState: nextContextedStateCache,
    };
  }

  // Although we are supposed to type S as `FullState`, it throws type error
  // when specifying a reducer that takes ActionReducer<FullState, Action>.
  // We workaround it with `any`.
  const reducers = createReducer<any>(
    initialState as any,
    on(
      navigated,
      (
        state: FullState,
        {before, after, beforeNamespaceId, afterNamespaceId}
      ): FullState => {
        let nextFullState: FullState = state;
        if (beforeNamespaceId !== afterNamespaceId) {
          // Namespaces have changed. Update namespaced state.
          nextFullState = updateNamespacedState(
            state,
            beforeNamespaceId,
            afterNamespaceId
          );
        }

        if (onNavigated) {
          nextFullState = onNavigated(nextFullState, before, after);
        }

        return nextFullState;
      }
    )
  );

  return {
    initialState,
    reducers,
  };
}
