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
import {DeepLinkGroup, RouteKind} from '../types';
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
            params: {
              experimentId: '234',
            },
          }),
        })
      );

      expect(selectors.getActiveRoute(state)).toEqual({
        routeKind: RouteKind.EXPERIMENT,
        params: {
          experimentId: '234',
        },
      });
    });
  });

  describe('getActiveNamespaceId', () => {
    beforeEach(() => {
      selectors.getActiveNamespaceId.release();
    });

    it('returns activeNamespaceId', () => {
      const state = buildStateFromAppRoutingState(
        buildAppRoutingState({
          activeNamespaceId: 'namespace1',
        })
      );

      expect(selectors.getActiveNamespaceId(state)).toEqual('namespace1');
    });
  });

  describe('getRehydratedDeepLinks', () => {
    beforeEach(() => {
      selectors.getRehydratedDeepLinks.release();
    });

    it('returns knownNamespaceIds', () => {
      const state = buildStateFromAppRoutingState(
        buildAppRoutingState({
          rehydratedDeepLinks: [
            {namespaceId: 'n1', deepLinkGroup: DeepLinkGroup.EXPERIMENTS},
            {namespaceId: 'n2', deepLinkGroup: DeepLinkGroup.DASHBOARD},
          ],
        })
      );

      expect(selectors.getRehydratedDeepLinks(state)).toEqual([
        {namespaceId: 'n1', deepLinkGroup: DeepLinkGroup.EXPERIMENTS},
        {namespaceId: 'n2', deepLinkGroup: DeepLinkGroup.DASHBOARD},
      ]);
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
            params: {
              experimentId: '234',
            },
          }),
        })
      );

      expect(selectors.getRouteKind(state)).toBe(RouteKind.EXPERIMENT);
    });

    it('returns `NOT_SET` is it does not have an active route', () => {
      const state = buildStateFromAppRoutingState(
        buildAppRoutingState({
          activeRoute: null,
        })
      );

      expect(selectors.getRouteKind(state)).toBe(RouteKind.NOT_SET);
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
            params: {
              experimentId: '234',
            },
          }),
        })
      );

      expect(selectors.getRouteParams(state)).toEqual({
        experimentId: '234',
      });
    });
  });

  describe('getExperimentIdToExperimentAliasMap', () => {
    beforeEach(() => {
      selectors.getExperimentIdToExperimentAliasMap.release();
    });

    it('returns a map of id to alias for COMPARE route', () => {
      const state = buildStateFromAppRoutingState(
        buildAppRoutingState({
          activeRoute: buildRoute({
            routeKind: RouteKind.COMPARE_EXPERIMENT,
            // exp2 maps to two experiment ids. This is illegal but FE should not
            // break because of it.
            params: {
              experimentIds: 'exp1:123,exp2:234,exp2:345',
            },
          }),
        })
      );

      expect(selectors.getExperimentIdToExperimentAliasMap(state)).toEqual({
        123: {aliasText: 'exp1', aliasNumber: 1},
        234: {aliasText: 'exp2', aliasNumber: 2},
        345: {aliasText: 'exp2', aliasNumber: 3},
      });
    });

    it('returns a map of id to alias for CARD route', () => {
      const state = buildStateFromAppRoutingState(
        buildAppRoutingState({
          activeRoute: buildRoute({
            routeKind: RouteKind.CARD,
            params: {
              experimentIds: 'exp1:123,exp2:234,exp2:345',
            },
          }),
        })
      );

      expect(selectors.getExperimentIdToExperimentAliasMap(state)).toEqual({
        123: {aliasText: 'exp1', aliasNumber: 1},
        234: {aliasText: 'exp2', aliasNumber: 2},
        345: {aliasText: 'exp2', aliasNumber: 3},
      });
    });

    it('returns an empty map for CARD route with single experiment', () => {
      const state = buildStateFromAppRoutingState(
        buildAppRoutingState({
          activeRoute: buildRoute({
            routeKind: RouteKind.CARD,
            params: {
              experimentIds: '1234',
            },
          }),
        })
      );

      expect(selectors.getExperimentIdToExperimentAliasMap(state)).toEqual({});
    });

    it('returns an empty map for non-compare route', () => {
      const state = buildStateFromAppRoutingState(
        buildAppRoutingState({
          activeRoute: buildRoute({
            routeKind: RouteKind.UNKNOWN,
            params: {},
          }),
        })
      );

      expect(selectors.getExperimentIdToExperimentAliasMap(state)).toEqual({});
    });
  });

  describe('getRegisteredRouteKinds', () => {
    beforeEach(() => {
      selectors.getRegisteredRouteKinds.release();
    });

    it('returns registered routes', () => {
      const state = buildStateFromAppRoutingState(
        buildAppRoutingState({
          registeredRouteKeys: new Set([RouteKind.UNKNOWN]),
        })
      );

      expect(selectors.getRegisteredRouteKinds(state)).toEqual(
        new Set([RouteKind.UNKNOWN])
      );
    });
  });
});
