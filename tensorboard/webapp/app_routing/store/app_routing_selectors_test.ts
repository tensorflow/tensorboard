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

import {buildRoute} from '../testing';
import {RouteKind} from '../types';

import * as selectors from './app_routing_selectors';
import {buildAppRoutingState, buildStateFromAppRoutingState} from './testing';

describe('app_routing_selectors', () => {
  describe('getActiveRoute', () => {
    beforeEach(() => {
      selectors.getActiveRoute.release();
    });

    it('returns activeRoute', () => {
      const state = buildStateFromAppRoutingState(
        buildAppRoutingState({
          activeRoute: buildRoute({
            routeKind: RouteKind.EXPERIMENT,
            pathname: '/experiment/234',
            params: {
              experimentId: '234',
            },
            queryParams: [],
            navigationOptions: {
              replaceState: false,
            },
          }),
        })
      );

      expect(selectors.getActiveRoute(state)).toEqual({
        routeKind: RouteKind.EXPERIMENT,
        pathname: '/experiment/234',
        params: {
          experimentId: '234',
        },
        queryParams: [],
        navigationOptions: {
          replaceState: false,
        },
      });
    });
  });

  describe('getRouteKind', () => {
    beforeEach(() => {
      selectors.getRouteKind.release();
    });

    it('returns routeKind of activeRoute', () => {
      const state = buildStateFromAppRoutingState(
        buildAppRoutingState({
          activeRoute: buildRoute({
            routeKind: RouteKind.EXPERIMENT,
            pathname: '/experiment/234',
            params: {
              experimentId: '234',
            },
            queryParams: [],
          }),
        })
      );

      expect(selectors.getRouteKind(state)).toBe(RouteKind.EXPERIMENT);
    });
  });

  describe('getRouteParams', () => {
    beforeEach(() => {
      selectors.getRouteParams.release();
    });

    it('returns param of activeRoute', () => {
      const state = buildStateFromAppRoutingState(
        buildAppRoutingState({
          activeRoute: buildRoute({
            routeKind: RouteKind.EXPERIMENT,
            pathname: '/experiment/234',
            params: {
              experimentId: '234',
            },
            queryParams: [],
          }),
        })
      );

      expect(selectors.getRouteParams(state)).toEqual({
        experimentId: '234',
      });
    });
  });

  describe('getExperimentIdToAliasMap', () => {
    beforeEach(() => {
      selectors.getExperimentIdToAliasMap.release();
    });

    it('returns a map of id to alias for COMPARE route', () => {
      const state = buildStateFromAppRoutingState(
        buildAppRoutingState({
          activeRoute: buildRoute({
            routeKind: RouteKind.COMPARE_EXPERIMENT,
            // exp2 maps to two experiment ids. This is illegal but FE should not
            // break because of it.
            pathname: '/compare/exp1:123,exp2:234,exp2:345',
            params: {
              experimentIds: 'exp1:123,exp2:234,exp2:345',
            },
            queryParams: [],
          }),
        })
      );

      expect(selectors.getExperimentIdToAliasMap(state)).toEqual({
        123: 'exp1',
        234: 'exp2',
        345: 'exp2',
      });
    });

    it('returns an empty map for non-compare route', () => {
      const state = buildStateFromAppRoutingState(
        buildAppRoutingState({
          activeRoute: buildRoute({
            routeKind: RouteKind.UNKNOWN,
            pathname: '/foob',
            params: {},
            queryParams: [],
          }),
        })
      );

      expect(selectors.getExperimentIdToAliasMap(state)).toEqual({});
    });
  });
});
