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
import {State} from '../app_state';
import {
  buildExperiment,
  buildExperimentState,
  buildStateFromExperimentsState,
} from '../experiments/store/testing';
import {
  buildFeatureFlag,
  buildFeatureFlagState as buildFeatureFlagState,
  buildState as buildStateFromFeatureFlagState,
} from '../feature_flag/store/testing';
import {
  buildRun,
  buildRunsState,
  buildStateFromRunsState,
} from '../runs/store/testing';
import {
  getExperiment,
  getExperimentIdsFromRoute,
  getExperimentIdToAliasMap,
  getRouteKind,
  getRunSelectionMap,
} from '../selectors';
import {
  buildColorPalette,
  createSettings as buildSettings,
  createSettingsState as buildSettingsState,
  createState as buildStateFromSettingsState,
} from '../settings/testing';
import {ColorPalette} from './colors';
import {getCurrentRouteRunSelection, getRunColorMap} from './ui_selectors';

describe('ui_selectors test', () => {
  beforeEach(() => {
    // Clear memoization in the internal selectors.
    getExperimentIdsFromRoute.release();
    getRunSelectionMap.release();
    getCurrentRouteRunSelection.release();
    getExperiment.release();
    getExperimentIdToAliasMap.release();
    getRouteKind.release();
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
          buildRunsState(
            {},
            {
              selectionState: new Map([
                ['r1', true],
                ['r2', false],
              ]),
            }
          )
        ),
        ...buildStateFromExperimentsState(
          buildExperimentState({
            experimentMap: {
              '123': buildExperiment({id: '123', name: 'Experiment 123'}),
              '234': buildExperiment({id: '234', name: 'Experiment 234'}),
            },
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
          buildRunsState(
            {},
            {
              selectionState: new Map([
                ['r1', true],
                ['r2', false],
              ]),
            }
          )
        ),
        ...buildStateFromExperimentsState(
          buildExperimentState({
            experimentMap: {
              '234': buildExperiment({id: '234', name: 'Experiment 234'}),
            },
          })
        ),
      };

      expect(getCurrentRouteRunSelection(state)).toBeNull();
    });

    describe('regex filter', () => {
      it('filters runs based on regex and run name', () => {
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
            buildRunsState(
              {
                runIds: {
                  '234': ['234/run1', '234/run2', '234/run3'],
                },
                runMetadata: {
                  '234/run1': buildRun({id: '234/run1', name: 'run1'}),
                  '234/run2': buildRun({id: '234/run2', name: 'run2'}),
                  '234/run3': buildRun({id: '234/run3', name: 'run3'}),
                },
                regexFilter: '^r.n[1]',
              },
              {
                selectionState: new Map([
                  ['234/run1', true],
                  ['234/run2', true],
                  ['234/run3', false],
                ]),
              }
            )
          ),
          ...buildStateFromExperimentsState(
            buildExperimentState({
              experimentMap: {
                '234': buildExperiment({id: '234', name: 'Experiment 234'}),
              },
            })
          ),
        };

        expect(getCurrentRouteRunSelection(state)).toEqual(
          new Map([
            ['234/run1', true],
            ['234/run2', false],
            ['234/run3', false],
          ])
        );
      });

      it('filters run name and alias in compare mode', () => {
        const state = {
          ...buildStateFromAppRoutingState(
            buildAppRoutingState({
              activeRoute: buildRoute({
                routeKind: RouteKind.COMPARE_EXPERIMENT,
                pathname: '/compare/apple:123,banana:234/',
                params: {experimentIds: 'apple:123,banana:234'},
              }),
            })
          ),
          ...buildStateFromRunsState(
            buildRunsState(
              {
                runIds: {
                  '123': ['123/run1', '123/run2', '123/run3'],
                  '234': ['234/run1', '234/run2', '234/run3'],
                },
                runMetadata: {
                  '123/run1': buildRun({id: '123/run1', name: 'run1'}),
                  '123/run2': buildRun({id: '123/run2', name: 'run2'}),
                  '123/run3': buildRun({id: '123/run3', name: 'run3'}),
                  '234/run1': buildRun({id: '234/run1', name: 'run1'}),
                  '234/run2': buildRun({id: '234/run2', name: 'run2'}),
                  '234/run3': buildRun({id: '234/run3', name: 'run3'}),
                },
                regexFilter: '^(apple/r..3|r.n[1])',
              },
              {
                selectionState: new Map([
                  ['123/run1', false],
                  ['123/run2', true],
                  ['123/run3', true],
                  ['234/run1', true],
                  ['234/run2', true],
                  ['234/run3', false],
                ]),
              }
            )
          ),
          ...buildStateFromExperimentsState(
            buildExperimentState({
              experimentMap: {
                '123': buildExperiment({id: '123', name: 'Experiment 123'}),
                '234': buildExperiment({id: '234', name: 'Experiment 234'}),
              },
            })
          ),
        };

        expect(getCurrentRouteRunSelection(state)).toEqual(
          new Map([
            // Inherits false from `selectionState`.
            ['123/run1', false],
            // legacy name = "apple/run2" and does not match `r.n[1]` and
            // `apple/r..3`.
            ['123/run2', false],
            // legacy name = "appple/run3" matches "apple/r..3".
            ['123/run3', true],
            // legacy name = "banana/run1". Inherits true + matches `r.n[1]`.
            ['234/run1', true],
            // legacy name = "banana/run2". Does not match `r.n[1]` and
            // `apple/r..3`.
            ['234/run2', false],
            // Inherits false from `selectionState`.
            ['234/run3', false],
          ])
        );
      });

      it('does not violently throw when an experiment metadata is null', () => {
        const state = {
          ...buildStateFromAppRoutingState(
            buildAppRoutingState({
              activeRoute: buildRoute({
                routeKind: RouteKind.COMPARE_EXPERIMENT,
                pathname: '/compare/apple:123,banana:234/',
                params: {experimentIds: 'apple:123,banana:234'},
              }),
            })
          ),
          ...buildStateFromRunsState(
            buildRunsState(
              {
                runIds: {
                  '123': ['123/run1', '123/run2'],
                  '234': ['234/run1', '234/run2'],
                },
                runMetadata: {
                  '123/run1': buildRun({id: '123/run1', name: 'run1'}),
                  '123/run2': buildRun({id: '123/run2', name: 'run2'}),
                  '234/run1': buildRun({id: '234/run1', name: 'run1'}),
                  '234/run2': buildRun({id: '234/run2', name: 'run2'}),
                },
                regexFilter: 'run1',
              },
              {
                selectionState: new Map([
                  ['123/run1', true],
                  ['123/run2', true],
                  ['234/run1', true],
                  ['234/run2', true],
                ]),
              }
            )
          ),
          ...buildStateFromExperimentsState(
            buildExperimentState({
              experimentMap: {
                '123': buildExperiment({id: '123', name: 'Experiment 123'}),
                // 234 experiment metadata does not exist.
              },
            })
          ),
        };

        expect(getCurrentRouteRunSelection(state)).toEqual(
          new Map([
            ['123/run1', true],
            ['123/run2', false],
            ['234/run1', true],
            ['234/run2', false],
          ])
        );
      });
    });
  });

  describe('#getRunColorMap', () => {
    function buildState(
      defaultRunColorIdForGroupBy: Map<string, number> = new Map(),
      runColorOverrideForGroupBy: Map<string, string> = new Map(),
      colorPalette: ColorPalette = buildColorPalette(),
      useDarkMode: boolean = false
    ): State {
      return {
        ...buildStateFromRunsState(
          buildRunsState({
            defaultRunColorIdForGroupBy,
            runColorOverrideForGroupBy,
          })
        ),
        ...buildStateFromSettingsState(
          buildSettingsState({
            settings: buildSettings({colorPalette}),
          })
        ),
        ...buildStateFromFeatureFlagState(
          buildFeatureFlagState({
            defaultFlags: buildFeatureFlag({
              defaultEnableDarkMode: useDarkMode,
            }),
          })
        ),
      };
    }

    it('returns color from color id from the default PALETTE', () => {
      const state = buildState(
        new Map([
          ['234/run1', 0],
          ['234/run2', 0],
          ['234/run3', 1],
        ]),
        new Map(),
        buildColorPalette({
          colors: [
            {name: 'color1', lightHex: '#000', darkHex: '#aaa'},
            {name: 'color2', lightHex: '#111', darkHex: '#bbb'},
            {name: 'color3', lightHex: '#222', darkHex: '#ccc'},
          ],
        }),
        false
      );

      expect(getRunColorMap(state)).toEqual({
        '234/run1': '#000',
        '234/run2': '#000',
        '234/run3': '#111',
      });
    });

    it('sets color to inactive one when id is -1', () => {
      const state = buildState(
        new Map([
          ['234/run1', -1],
          ['234/run2', 0],
        ]),
        new Map(),
        buildColorPalette({
          colors: [
            {name: 'color1', lightHex: '#000', darkHex: '#aaa'},
            {name: 'color2', lightHex: '#111', darkHex: '#bbb'},
          ],
          inactive: {name: 'color3', lightHex: '#222', darkHex: '#ccc'},
        }),
        false
      );

      expect(getRunColorMap(state)).toEqual({
        '234/run1': '#222',
        '234/run2': '#000',
      });
    });

    it('returns runColorOverride one if it is present', () => {
      const state = buildState(
        new Map([
          ['234/run1', -1],
          ['234/run2', 0],
        ]),
        new Map([['234/run1', '#aaa']]),
        buildColorPalette({
          colors: [
            {name: 'color1', lightHex: '#000', darkHex: '#aaa'},
            {name: 'color2', lightHex: '#111', darkHex: '#bbb'},
          ],
        }),
        false
      );

      expect(getRunColorMap(state)).toEqual({
        '234/run1': '#aaa',
        '234/run2': '#000',
      });
    });

    it('cycles color palette even if ids are high', () => {
      const state = buildState(
        new Map([
          ['234/run1', 5],
          ['234/run2', 10],
          ['234/run3', 11],
        ]),
        new Map(),
        buildColorPalette({
          colors: [
            {name: 'color1', lightHex: '#000', darkHex: '#aaa'},
            {name: 'color2', lightHex: '#111', darkHex: '#bbb'},
            {name: 'color3', lightHex: '#222', darkHex: '#ccc'},
            {name: 'color4', lightHex: '#333', darkHex: '#ddd'},
            {name: 'color5', lightHex: '#444', darkHex: '#eee'},
            {name: 'color6', lightHex: '#555', darkHex: '#fff'},
          ],
        }),
        false
      );

      expect(getRunColorMap(state)).toEqual({
        '234/run1': '#555',
        '234/run2': '#444',
        '234/run3': '#555',
      });
    });

    it('returns darkHex when dark mode is enabled', () => {
      const state = buildState(
        new Map([
          ['234/run1', 0],
          ['234/run2', 0],
          ['234/run3', 1],
        ]),
        new Map(),
        buildColorPalette({
          colors: [
            {name: 'color1', lightHex: '#000', darkHex: '#aaa'},
            {name: 'color2', lightHex: '#111', darkHex: '#bbb'},
            {name: 'color3', lightHex: '#222', darkHex: '#ccc'},
          ],
        }),
        true
      );

      expect(getRunColorMap(state)).toEqual({
        '234/run1': '#aaa',
        '234/run2': '#aaa',
        '234/run3': '#bbb',
      });
    });
  });
});
