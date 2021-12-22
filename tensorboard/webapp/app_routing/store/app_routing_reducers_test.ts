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
    it('sets nextRoute', () => {
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
        })
      );
    });
  });

  describe('navigated', () => {
    it('sets activeRoute and activeNamespaceId', () => {
      const state = buildAppRoutingState({
        activeRoute: null,
        activeNamespaceId: null,
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
          }),
          beforeNamespaceId: null,
          afterNamespaceId: 'namespace1',
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
        })
      );
      expect(nextState.activeNamespaceId).toEqual('namespace1');
    });

    it('adds to knownNamespaceIds', () => {
      const originalKnownNamespaceIds = new Set<string>(['n1', 'n2']);
      const state = buildAppRoutingState({
        knownNamespaceIds: originalKnownNamespaceIds,
      });

      const nextState = appRoutingReducers.reducers(
        state,
        actions.navigated({
          before: null,
          after: buildRoute(),
          beforeNamespaceId: null,
          afterNamespaceId: 'n3',
        })
      );

      expect(nextState.knownNamespaceIds).toEqual(
        new Set<string>(['n1', 'n2', 'n3'])
      );
      expect(nextState.knownNamespaceIds).not.toBe(originalKnownNamespaceIds);
    });

    it('does not create new knownNamespaceIds when no changes necessary', () => {
      const originalKnownNamespaceIds = new Set<string>(['n1', 'n2']);
      const state = buildAppRoutingState({
        knownNamespaceIds: originalKnownNamespaceIds,
      });

      const nextState = appRoutingReducers.reducers(
        state,
        actions.navigated({
          before: null,
          after: buildRoute(),
          beforeNamespaceId: null,
          afterNamespaceId: 'n2',
        })
      );

      expect(nextState.knownNamespaceIds).toEqual(
        new Set<string>(['n1', 'n2'])
      );
      expect(nextState.knownNamespaceIds).toBe(originalKnownNamespaceIds);
    });
  });

  describe('routeConfigLoaded', () => {
    it('sets registeredRouteKeys', () => {
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

    it('replaces existing registeredRouteKeys', () => {
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
