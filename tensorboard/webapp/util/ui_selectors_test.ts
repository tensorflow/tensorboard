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
import {CHART_COLOR_PALLETE, NON_MATCHED_COLOR} from './colors';
import {getCurrentRouteRunSelection, getRunColorMap} from './ui_selectors';

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

    it('filters runs based on regex', () => {
      const state = {
        ...buildStateFromAppRoutingState(
          buildAppRoutingState({
            activeRoute: buildRoute({
              routeKind: RouteKind.EXPERIMENT,
              pathname: '/experiment/234/',
              params: {experimentId: '234'},
            }),
          })
        ),
        ...buildStateFromRunsState(
          buildRunsState({
            selectionState: new Map([
              [
                '["234"]',
                new Map([
                  ['run1', true],
                  ['run2', true],
                  ['run3', false],
                ]),
              ],
            ]),
            regexFilter: 'n1',
          })
        ),
      };

      expect(getCurrentRouteRunSelection(state)).toEqual(
        new Map([
          ['run1', true],
          ['run2', false],
          ['run3', false],
        ])
      );
    });
  });

  describe('#getRunColorMap', () => {
    it('returns color from color id from the default PALETTE', () => {
      const state = {
        ...buildStateFromRunsState(
          buildRunsState({
            defaultRunColorIdForGroupBy: new Map([
              ['234/run1', 0],
              ['234/run2', 0],
              ['234/run3', 1],
            ]),
            runColorOverrideForGroupBy: new Map(),
          })
        ),
      };

      expect(getRunColorMap(state)).toEqual({
        '234/run1': CHART_COLOR_PALLETE[0],
        '234/run2': CHART_COLOR_PALLETE[0],
        '234/run3': CHART_COLOR_PALLETE[1],
      });
    });

    it('sets NON_MATCHED_COLOR when id is -1', () => {
      const state = {
        ...buildStateFromRunsState(
          buildRunsState({
            defaultRunColorIdForGroupBy: new Map([
              ['234/run1', -1],
              ['234/run2', 0],
            ]),
            runColorOverrideForGroupBy: new Map(),
          })
        ),
      };

      expect(getRunColorMap(state)).toEqual({
        '234/run1': NON_MATCHED_COLOR,
        '234/run2': CHART_COLOR_PALLETE[0],
      });
    });

    it('returns runColorOverride one if it is present', () => {
      const state = {
        ...buildStateFromRunsState(
          buildRunsState({
            defaultRunColorIdForGroupBy: new Map([
              ['234/run1', -1],
              ['234/run2', 0],
            ]),
            runColorOverrideForGroupBy: new Map([['234/run1', '#aaa']]),
          })
        ),
      };

      expect(getRunColorMap(state)).toEqual({
        '234/run1': '#aaa',
        '234/run2': CHART_COLOR_PALLETE[0],
      });
    });

    it('cycles color palette even if ids are high', () => {
      const length = [...CHART_COLOR_PALLETE.keys()].length;
      const state = {
        ...buildStateFromRunsState(
          buildRunsState({
            defaultRunColorIdForGroupBy: new Map([
              ['234/run1', length * 2 + 1],
              ['234/run2', length * 2 + 5],
              ['234/run3', length * 10 + 1],
            ]),
            runColorOverrideForGroupBy: new Map(),
          })
        ),
      };

      expect(getRunColorMap(state)).toEqual({
        '234/run1': CHART_COLOR_PALLETE[1],
        '234/run2': CHART_COLOR_PALLETE[5],
        '234/run3': CHART_COLOR_PALLETE[1],
      });
    });
  });
});
