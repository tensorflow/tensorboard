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

import * as actions from '../actions';
import {buildRoute} from '../testing';
import {RouteKind} from '../types';

import * as appRoutingReducers from './app_routing_reducers';
import {buildAppRoutingState} from './testing';

describe('app_routing_reducers', () => {
  describe('navigating', () => {
    it('sets the new route onto activeRoute', () => {
      const state = buildAppRoutingState({
        activeRoute: null,
        nextRoute: null,
      });

      const nextState = appRoutingReducers.reducers(
        state,
        actions.navigating({
          after: buildRoute({
            routeKind: RouteKind.EXPERIMENT,
            pathname: '/experiment/234',
            params: {
              experimentId: '234',
            },
            queryParams: [],
            navigationOptions: {
              replaceState: true,
            },
          }),
        })
      );

      expect(nextState.nextRoute).toEqual(
        buildRoute({
          routeKind: RouteKind.EXPERIMENT,
          pathname: '/experiment/234',
          params: {
            experimentId: '234',
          },
          queryParams: [],
          navigationOptions: {
            replaceState: true,
          },
        })
      );
    });
  });

  describe('navigated', () => {
    it('sets the new route onto activeRoute', () => {
      const state = buildAppRoutingState({
        activeRoute: null,
      });

      const nextState = appRoutingReducers.reducers(
        state,
        actions.navigated({
          before: null,
          after: buildRoute({
            routeKind: RouteKind.EXPERIMENT,
            pathname: '/experiment/234',
            params: {
              experimentId: '234',
            },
            queryParams: [],
            navigationOptions: {
              replaceState: true,
            },
          }),
        })
      );

      expect(nextState.activeRoute).toEqual(
        buildRoute({
          routeKind: RouteKind.EXPERIMENT,
          pathname: '/experiment/234',
          params: {
            experimentId: '234',
          },
          queryParams: [],
          navigationOptions: {
            replaceState: true,
          },
        })
      );
    });
  });

  describe('routeConfigLoaded', () => {
    it('sets registered route kinds in the state', () => {
      const state = buildAppRoutingState({
        registeredRouteKeys: new Set(),
      });

      const nextState = appRoutingReducers.reducers(
        state,
        actions.routeConfigLoaded({
          routeKinds: new Set([
            RouteKind.COMPARE_EXPERIMENT,
            RouteKind.UNKNOWN,
          ]),
        })
      );

      expect(nextState.registeredRouteKeys).toEqual(
        new Set([RouteKind.COMPARE_EXPERIMENT, RouteKind.UNKNOWN])
      );
    });

    it('replaces existing registered route kinds', () => {
      const state = buildAppRoutingState({
        registeredRouteKeys: new Set([RouteKind.EXPERIMENTS]),
      });

      const nextState = appRoutingReducers.reducers(
        state,
        actions.routeConfigLoaded({
          routeKinds: new Set([RouteKind.UNKNOWN]),
        })
      );

      expect(nextState.registeredRouteKeys).toEqual(
        new Set([RouteKind.UNKNOWN])
      );
    });
  });
});
