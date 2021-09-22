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
 * @fileoverview Reducer helper for maintaining states that are are associated
 * with a routeId.
 *
 * Each TensorBoard experiment/compare view is regarded as a
 * separate instance of "app" where no states are shared. As a result, a run
 * selection in an experiment/1 should differ from experiment/2. This module
 * facilitates maintaining such states.
 *
 * The helper helps maintain the route-dependent (or routeful) states by
 * maintaining a dictionary of routeId to the route-dependent states. It
 * abstracts routes by, upon navigation, storing current route-dependent state
 * in the dictionary and reading/applying the state for the new route from the
 * dictionary. When the dictionary is empty, it applies the initialState. Client
 * can assume the values of the non-"private" top-level properties appropriately
 * combine the values for route-independent state with state for the active
 * route.
 *
 * Clients should never peek into or modify the property,
 * `privateRouteContextedState`.
 *
 * For discussion, please refer to docs/design/route-contexted-state.md.
 */

import {ActionReducer, createReducer, on} from '@ngrx/store';

import {navigated} from './actions';
import {getRouteId} from './internal_utils';
import {Route} from './types';

// `privateRouteContextedState` loosely typed only for ease of writing tests.
// Otherwise, all the reducers that has routeful state has to change the test
// to create an object that satisfy the typing.
// During the runtime, it always has value because of `initialState`.
interface PrivateState<RoutefulState> {
  privateRouteContextedState?: {
    [routeId: string]: RoutefulState;
  };
}

/**
 * Complete type definition of route contexted state.
 *
 * Example usage:
 * type ReducerState = RouteContextedState<
 *     {myRoutefulState: number},
 *     {nonRoutefulState: string},
 * >;
 */
export type RouteContextedState<
  RoutefulState extends {},
  NonRoutefulState extends {}
> = NonRoutefulState & RoutefulState & PrivateState<RoutefulState>;

/**
 * Utility for managing routeful states. It returns route contexted
 * `initialState` and `reducers` that help manage the routeful state.
 *
 * An optional `onRouteIdChanged` function will modify the state after it
 * is loaded from the cache.
 *
 * Example usage:
 *
 * const {initialState, reducers: routeReducers} =
 *    createRouteContextedState(
 *        {myRoutefulState: 0},
 *        {nonRoutefulState: 'one'},
 *        (state) => {
 *          console.log('Reset state upon mounting a new route');
 *          return {myRoutefulState: 0, nonRoutefulState: 'one'};
 *        }
 *    );
 *
 * export const reducers = composeReducers(routeReducers, reducer);
 */
export function createRouteContextedState<
  RoutefulState extends {},
  NonRoutefulState extends {}
>(
  routefulInitialState: RoutefulState,
  nonRoutefulInitialState: NonRoutefulState,
  onRouteIdChanged?: (
    state: RouteContextedState<RoutefulState, NonRoutefulState>,
    newRoute: Route
  ) => RouteContextedState<RoutefulState, NonRoutefulState>
): {
  initialState: RouteContextedState<RoutefulState, NonRoutefulState>;
  reducers: ActionReducer<RouteContextedState<RoutefulState, NonRoutefulState>>;
} {
  type FullState = RouteContextedState<RoutefulState, NonRoutefulState>;
  const keys = Object.keys(routefulInitialState) as Array<keyof RoutefulState>;

  const initialState: FullState = {
    ...routefulInitialState,
    ...nonRoutefulInitialState,
    privateRouteContextedState: {},
  };

  // Although we are supposed to type S as `FullState`, it throws type error
  // when specifying a reducer that takes ActionReducer<FullState, Action>.
  // We workaround it with `any`.
  const reducers = createReducer<any>(
    initialState as any,
    on(navigated, (state: FullState, {before, after}): FullState => {
      const afterRouteId = getRouteId(after.routeKind, after.params);
      const beforeRouteId = before
        ? getRouteId(before.routeKind, before.params)
        : null;

      // When the routeIds are the same, do not modify the state.
      if (beforeRouteId === afterRouteId) {
        return state;
      }

      let nextContextedStateCache: {
        [routeId: string]: RoutefulState;
      } = {...state.privateRouteContextedState};

      if (beforeRouteId) {
        const currRoutefulState = {} as RoutefulState;
        for (const key of keys) {
          currRoutefulState[key] = (state as RoutefulState)[key];
        }
        nextContextedStateCache = {
          ...nextContextedStateCache,
          [beforeRouteId]: currRoutefulState,
        };
      }

      let nextRoutefulState =
        state.privateRouteContextedState &&
        state.privateRouteContextedState[afterRouteId]
          ? state.privateRouteContextedState[afterRouteId]
          : null;

      // Set `nextRoutefulState` to the initialState when `before`
      // is non-empty. On the initial load when `before` is null, the
      // `state` can already have values from bootstraping deeplinks and it
      // should not overwrite the values.
      if (beforeRouteId && nextRoutefulState === null) {
        nextRoutefulState = routefulInitialState;
      }

      const nextFullState: FullState = {
        ...state,
        ...nextRoutefulState,
        privateRouteContextedState: nextContextedStateCache,
      };

      if (onRouteIdChanged) {
        return onRouteIdChanged(nextFullState, after);
      }
      return nextFullState;
    })
  );

  return {
    initialState,
    reducers,
  };
}
