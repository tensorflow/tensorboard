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
import {
  buildAppRoutingState,
  buildStateFromAppRoutingState,
} from '../app_routing/store/testing';
import {buildRoute} from '../app_routing/testing';
import {RouteKind} from '../app_routing/types';
import {buildRunsState, buildStateFromRunsState} from '../runs/store/testing';
import {
  getExperimentIdsFromRoute,
  getRouteId,
  getRunSelectionMap,
} from '../selectors';

import {getCurrentRouteRunSelection} from './ui_selectors';

describe('ui_selectors test', () => {
  beforeEach(() => {
    // Clear memoization in the internal selectors.
    getExperimentIdsFromRoute.release();
    getRouteId.release();
    getRunSelectionMap.release();
    getCurrentRouteRunSelection.release();
  });

  describe('#getCurrentRouteRunSelection', () => {
    it('returns selection map of current eid', () => {
      const state = {
        ...buildStateFromAppRoutingState(
          buildAppRoutingState({
            activeRoute: buildRoute({
              routeKind: RouteKind.COMPARE_EXPERIMENT,
              pathname: '/compare/exp1:123,exp2:234/',
              params: {experimentIds: 'exp1:123,exp2:234'},
            }),
          })
        ),
        ...buildStateFromRunsState(
          buildRunsState({
            selectionState: new Map([
              [
                '["123","234"]',
                new Map([
                  ['r1', true],
                  ['r2', false],
                ]),
              ],
            ]),
          })
        ),
      };

      expect(getCurrentRouteRunSelection(state)).toEqual(
        new Map([
          ['r1', true],
          ['r2', false],
        ])
      );
    });

    it('returns null if current route does not have experimentIds', () => {
      const state = {
        ...buildStateFromAppRoutingState(
          buildAppRoutingState({
            activeRoute: buildRoute({
              routeKind: RouteKind.UNKNOWN,
              pathname: '/foobar/234',
              params: {},
            }),
          })
        ),
        ...buildStateFromRunsState(
          buildRunsState({
            selectionState: new Map([
              [
                '["234"]',
                new Map([
                  ['r1', true],
                  ['r2', false],
                ]),
              ],
            ]),
          })
        ),
      };

      expect(getCurrentRouteRunSelection(state)).toBeNull();
    });
  });
});
