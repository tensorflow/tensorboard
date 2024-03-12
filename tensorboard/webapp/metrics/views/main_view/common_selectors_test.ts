/* Copyright 2023 The TensorFlow Authors. All Rights Reserved.

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
import {RouteKind} from '../../../app_routing';
import {buildHparamSpec} from '../../../hparams/_redux/testing';
import {
  buildAppRoutingState,
  buildStateFromAppRoutingState,
} from '../../../app_routing/store/testing';
import {buildRoute} from '../../../app_routing/testing';
import {buildExperiment} from '../../../experiments/store/testing';
import {IntervalFilter, DiscreteFilter} from '../../../hparams/types';
import {DomainType, Run} from '../../../runs/store/runs_types';
import {
  buildRun,
  buildRunsState,
  buildStateFromRunsState,
} from '../../../runs/store/testing';
import {RunTableItem} from '../../../runs/views/runs_table/types';
import {buildMockState} from '../../../testing/utils';
import {
  appStateFromMetricsState,
  buildMetricsSettingsState,
  buildMetricsState,
} from '../../testing';
import {PluginType} from '../../types';
import * as selectors from './common_selectors';
import {ColumnHeaderType} from '../card_renderer/scalar_card_types';

describe('common selectors', () => {
  let runIds: Record<string, string[]>;
  let runIdToExpId: Record<string, string>;
  let runMetadata: Record<string, Run>;

  let runTableItems: RunTableItem[];

  let run1: Run;
  let run2: Run;
  let run3: Run;
  let run4: Run;
  let state: ReturnType<typeof buildMockState>;

  beforeEach(() => {
    runIds = {defaultExperimentId: ['run1', 'run2', 'run3']};
    runIdToExpId = {
      run1: 'defaultExperimentId',
      run2: 'defaultExperimentId',
      run3: 'defaultExperimentId',
    };
    runMetadata = {
      run1: {
        id: 'run1',
        name: 'run1',
        startTime: 0,
        hparams: null,
        metrics: null,
      },
      run2: {
        id: 'run2',
        name: 'run2',
        startTime: 0,
        hparams: null,
        metrics: null,
      },
      run3: {
        id: 'run3',
        name: 'run3',
        startTime: 0,
        hparams: null,
        metrics: null,
      },
    };

    runTableItems = [
      {
        run: {
          id: 'run1-id',
          name: 'run1',
          startTime: 0,
          hparams: null,
          metrics: null,
        },
        experimentAlias: {
          aliasNumber: 1,
          aliasText: 'exp1',
        },
        experimentName: 'experiment1',
        selected: true,
        runColor: '#fff',
        hparams: new Map<string, number>([['lr', 5]]),
        metrics: new Map<string, number>([['foo', 1]]),
      },
      {
        run: {
          id: 'run2-id',
          name: 'run2',
          startTime: 0,
          hparams: null,
          metrics: null,
        },
        experimentAlias: {
          aliasNumber: 1,
          aliasText: 'exp1',
        },
        experimentName: 'experiment1',
        selected: true,
        runColor: '#fff',
        hparams: new Map<string, number>([['lr', 3]]),
        metrics: new Map<string, number>([['foo', 2]]),
      },
      {
        run: {
          id: 'run3-id',
          name: 'run1',
          startTime: 0,
          hparams: null,
          metrics: null,
        },
        experimentAlias: {
          aliasNumber: 1,
          aliasText: 'exp2',
        },
        experimentName: 'experiment2',
        selected: true,
        runColor: '#fff',
        hparams: new Map<string, number>([['lr', 1]]),
        metrics: new Map<string, number>([['foo', 3]]),
      },
    ];

    run1 = buildRun({name: 'run 1'});
    run2 = buildRun({id: '2', name: 'run 2'});
    run3 = buildRun({id: '3', name: 'run 3'});
    run4 = buildRun({id: '4', name: 'run 4'});
    state = buildMockState({
      runs: {
        data: {
          regexFilter: '',
          runIds: {
            exp1: ['run1', 'run2'],
            exp2: ['run2', 'run3', 'run4'],
          },
          runMetadata: {
            run1,
            run2,
            run3,
            run4,
          },
        } as any,
        ui: {
          runsTableHeaders: [
            {
              type: ColumnHeaderType.RUN,
              name: 'run',
              displayName: 'Run',
              enabled: true,
              sortable: true,
              removable: false,
              movable: false,
              filterable: false,
            },
            {
              type: ColumnHeaderType.CUSTOM,
              name: 'experimentAlias',
              displayName: 'Experiment',
              enabled: true,
              movable: false,
              sortable: true,
            },
            {
              type: ColumnHeaderType.CUSTOM,
              name: 'fakeRunsHeader',
              displayName: 'Fake Runs Header',
              enabled: true,
            },
          ],
        } as any,
      },
      experiments: {
        data: {
          experimentMap: {
            exp1: buildExperiment({name: 'experiment1', id: 'exp1'}),
            exp2: buildExperiment({name: 'experiment2', id: 'exp2'}),
          },
        },
      },
      app_routing: {
        activeRoute: {
          routeKind: RouteKind.EXPERIMENT,
          params: {
            experimentId: 'defaultExperimentId',
            experimentIds: 'foo:exp1,bar:exp2',
          },
        },
      },
      hparams: {
        dashboardHparamSpecs: [
          buildHparamSpec({name: 'conv_layers', displayName: 'Conv Layers'}),
          buildHparamSpec({
            name: 'conv_kernel_size',
            displayName: 'Conv Kernel Size',
          }),
          buildHparamSpec({
            name: 'dense_layers',
            displayName: 'Dense Layers',
          }),
          buildHparamSpec({name: 'dropout', displayName: 'Dropout'}),
        ],
        dashboardSessionGroups: [],
        dashboardDisplayedHparamColumns: [
          {
            type: ColumnHeaderType.HPARAM,
            name: 'conv_layers',
            displayName: 'Conv Layers',
            enabled: true,
          },
          {
            type: ColumnHeaderType.HPARAM,
            name: 'dense_layers',
            displayName: 'Dense Layers',
            enabled: true,
          },
        ],
      } as any,
    });
  });

  describe('getScalarTagsForRunSelection', () => {
    it('returns all tags containing scalar data when no runs are selected', () => {
      const state = buildMockState({
        ...appStateFromMetricsState(
          buildMetricsState({
            tagMetadata: {
              histograms: {
                tagDescriptions: {},
                tagToRuns: {},
              },
              images: {
                tagDescriptions: {},
                tagRunSampledInfo: {},
              },
              scalars: {
                tagDescriptions: {},
                tagToRuns: {
                  'tag-1': ['run1'],
                  'tag-2': ['run2', 'run3'],
                },
              },
            },
          })
        ),
        ...buildStateFromAppRoutingState(
          buildAppRoutingState({
            activeRoute: buildRoute({
              routeKind: RouteKind.EXPERIMENT,
              params: {},
            }),
          })
        ),
        ...buildStateFromRunsState(
          buildRunsState(
            {
              runIds,
              runIdToExpId,
              runMetadata,
            },
            {
              selectionState: new Map(),
            }
          )
        ),
      });
      expect(selectors.TEST_ONLY.getScalarTagsForRunSelection(state)).toEqual(
        new Set(['tag-1', 'tag-2'])
      );
    });

    it('returns only tags containing selected runs when some runs are selected', () => {
      const state = buildMockState({
        ...appStateFromMetricsState(
          buildMetricsState({
            tagMetadata: {
              histograms: {
                tagDescriptions: {},
                tagToRuns: {},
              },
              images: {
                tagDescriptions: {},
                tagRunSampledInfo: {},
              },
              scalars: {
                tagDescriptions: {},
                tagToRuns: {
                  'tag-1': ['run1'],
                  'tag-2': ['run2', 'run3'],
                },
              },
            },
          })
        ),
        ...buildStateFromAppRoutingState(
          buildAppRoutingState({
            activeRoute: buildRoute({
              routeKind: RouteKind.EXPERIMENT,
              params: {},
            }),
          })
        ),

        ...buildStateFromRunsState(
          buildRunsState(
            {
              runIds,
              runIdToExpId,
              runMetadata,
            },
            {
              selectionState: new Map([
                ['run1', false],
                ['run2', true],
                ['run3', false],
              ]),
            }
          )
        ),
      });
      expect(selectors.TEST_ONLY.getScalarTagsForRunSelection(state)).toEqual(
        new Set(['tag-2'])
      );
    });
  });

  describe('getRenderableCardIdsWithMetadata', () => {
    it('returns all tags containing scalar data when no runs are selected', () => {
      const state = buildMockState({
        ...appStateFromMetricsState(
          buildMetricsState({
            cardList: ['card1', 'card2'],
            cardMetadataMap: {
              card1: {
                plugin: PluginType.SCALARS,
                tag: 'tag-1',
                runId: null,
              },
              card2: {
                plugin: PluginType.SCALARS,
                tag: 'tag-2',
                runId: null,
              },
            },
            tagMetadata: {
              histograms: {
                tagDescriptions: {},
                tagToRuns: {},
              },
              images: {
                tagDescriptions: {},
                tagRunSampledInfo: {},
              },
              scalars: {
                tagDescriptions: {},
                tagToRuns: {
                  'tag-1': ['run1'],
                  'tag-2': ['run2', 'run3'],
                },
              },
            },
            settings: buildMetricsSettingsState({
              hideEmptyCards: true,
            }),
          })
        ),
        ...buildStateFromAppRoutingState(
          buildAppRoutingState({
            activeRoute: buildRoute({
              routeKind: RouteKind.EXPERIMENT,
              params: {},
            }),
          })
        ),
        ...buildStateFromRunsState(
          buildRunsState(
            {
              runIds,
              runIdToExpId,
              runMetadata,
            },
            {
              selectionState: new Map(),
            }
          )
        ),
      });
      expect(
        selectors.TEST_ONLY.getRenderableCardIdsWithMetadata(state)
      ).toEqual([
        {
          cardId: 'card1',
          plugin: PluginType.SCALARS,
          tag: 'tag-1',
          runId: null,
        },
        {
          cardId: 'card2',
          plugin: PluginType.SCALARS,
          tag: 'tag-2',
          runId: null,
        },
      ]);
    });
  });

  describe('getSortedRenderableCardIdsWithMetadata', () => {
    it('shows empty scalar cards when hideEmptyCards is false', () => {
      const state = buildMockState({
        ...appStateFromMetricsState(
          buildMetricsState({
            cardList: ['card1', 'card2', 'card3'],
            cardMetadataMap: {
              card1: {
                plugin: PluginType.SCALARS,
                tag: 'tag-1',
                runId: null,
              },
              card2: {
                plugin: PluginType.SCALARS,
                tag: 'tag-2',
                runId: null,
              },
              card3: {
                plugin: PluginType.HISTOGRAMS,
                tag: 'tag-2',
                runId: 'run1',
              },
              card4: {
                plugin: PluginType.HISTOGRAMS,
                tag: 'tag-2',
                runId: 'run2',
              },
            },
            tagMetadata: {
              histograms: {
                tagDescriptions: {},
                tagToRuns: {},
              },
              images: {
                tagDescriptions: {},
                tagRunSampledInfo: {},
              },
              scalars: {
                tagDescriptions: {},
                tagToRuns: {
                  'tag-1': ['run1'],
                  'tag-2': ['run2', 'run3'],
                },
              },
            },
            settings: buildMetricsSettingsState({
              hideEmptyCards: false,
            }),
          })
        ),
        ...buildStateFromAppRoutingState(
          buildAppRoutingState({
            activeRoute: buildRoute({
              routeKind: RouteKind.EXPERIMENT,
              params: {},
            }),
          })
        ),
        ...buildStateFromRunsState(
          buildRunsState(
            {
              runIds,
              runIdToExpId,
              runMetadata,
            },
            {
              selectionState: new Map([['run1', true]]),
            }
          )
        ),
      });
      expect(selectors.getSortedRenderableCardIdsWithMetadata(state)).toEqual([
        {
          cardId: 'card1',
          plugin: PluginType.SCALARS,
          tag: 'tag-1',
          runId: null,
        },
        {
          cardId: 'card2',
          plugin: PluginType.SCALARS,
          tag: 'tag-2',
          runId: null,
        },
        {
          cardId: 'card3',
          plugin: PluginType.HISTOGRAMS,
          tag: 'tag-2',
          runId: 'run1',
        },
      ]);
    });

    it('hides empty scalar cards when hideEmptyCards is true', () => {
      const state = buildMockState({
        ...appStateFromMetricsState(
          buildMetricsState({
            cardList: ['card1', 'card2', 'card3'],
            cardMetadataMap: {
              card1: {
                plugin: PluginType.SCALARS,
                tag: 'tag-1',
                runId: null,
              },
              card2: {
                plugin: PluginType.SCALARS,
                tag: 'tag-2',
                runId: null,
              },
              card3: {
                plugin: PluginType.HISTOGRAMS,
                tag: 'tag-2',
                runId: 'run1',
              },
              card4: {
                plugin: PluginType.HISTOGRAMS,
                tag: 'tag-2',
                runId: 'run2',
              },
            },
            tagMetadata: {
              histograms: {
                tagDescriptions: {},
                tagToRuns: {},
              },
              images: {
                tagDescriptions: {},
                tagRunSampledInfo: {},
              },
              scalars: {
                tagDescriptions: {},
                tagToRuns: {
                  'tag-1': ['run1'],
                  'tag-2': ['run2', 'run3'],
                },
              },
            },
            settings: buildMetricsSettingsState({
              hideEmptyCards: true,
            }),
          })
        ),
        ...buildStateFromAppRoutingState(
          buildAppRoutingState({
            activeRoute: buildRoute({
              routeKind: RouteKind.EXPERIMENT,
              params: {},
            }),
          })
        ),
        ...buildStateFromRunsState(
          buildRunsState(
            {
              runIds,
              runIdToExpId,
              runMetadata,
            },
            {
              selectionState: new Map([['run1', true]]),
            }
          )
        ),
      });
      expect(selectors.getSortedRenderableCardIdsWithMetadata(state)).toEqual([
        {
          cardId: 'card1',
          plugin: PluginType.SCALARS,
          tag: 'tag-1',
          runId: null,
        },
        {
          cardId: 'card3',
          plugin: PluginType.HISTOGRAMS,
          tag: 'tag-2',
          runId: 'run1',
        },
      ]);
    });
  });

  describe('matchFilter', () => {
    it('respects includeUndefined when value is undefined', () => {
      expect(
        selectors.TEST_ONLY.utils.matchFilter(
          {
            type: DomainType.INTERVAL,
            minValue: 0,
            maxValue: 10,
            filterLowerValue: 1,
            filterUpperValue: 5,
            includeUndefined: true,
          },
          undefined
        )
      ).toBeTrue();

      expect(
        selectors.TEST_ONLY.utils.matchFilter(
          {
            type: DomainType.INTERVAL,
            minValue: 0,
            maxValue: 10,
            filterLowerValue: 1,
            filterUpperValue: 5,
            includeUndefined: false,
          },
          undefined
        )
      ).toBeFalse();
    });

    it('returns values including value when filter type is DISCRETE and values are strings', () => {
      const filter: DiscreteFilter = {
        type: DomainType.DISCRETE,
        includeUndefined: false,
        possibleValues: [],
        filterValues: ['afoo', 'foob', 'foo', 'fo'],
      };
      expect(selectors.TEST_ONLY.utils.matchFilter(filter, 'foo')).toBeTrue();
      expect(selectors.TEST_ONLY.utils.matchFilter(filter, 'bar')).toBeFalse();
    });

    it('returns values including value when filter type is DISCRETE and values are numbers', () => {
      const filter: DiscreteFilter = {
        type: DomainType.DISCRETE,
        includeUndefined: false,
        possibleValues: [],
        filterValues: [0, 1, 2, 3, 4],
      };
      expect(selectors.TEST_ONLY.utils.matchFilter(filter, 0)).toBeTrue();
      expect(selectors.TEST_ONLY.utils.matchFilter(filter, 2)).toBeTrue();
      expect(selectors.TEST_ONLY.utils.matchFilter(filter, 5)).toBeFalse();
    });

    it('returns values including value when filter type is DISCRETE and values are booleans', () => {
      const filter: DiscreteFilter = {
        type: DomainType.DISCRETE,
        includeUndefined: false,
        possibleValues: [],
        filterValues: [true, false],
      };
      expect(selectors.TEST_ONLY.utils.matchFilter(filter, true)).toBeTrue();
      expect(selectors.TEST_ONLY.utils.matchFilter(filter, false)).toBeTrue();
      expect(
        selectors.TEST_ONLY.utils.matchFilter(
          {
            type: DomainType.DISCRETE,
            includeUndefined: false,
            possibleValues: [],
            filterValues: [false],
          },
          false
        )
      ).toBeTrue();
    });

    it('checks if value is within bounds when filter type is INTERVAL', () => {
      const filter: IntervalFilter = {
        type: DomainType.INTERVAL,
        includeUndefined: true,
        minValue: 0,
        maxValue: 10,
        filterLowerValue: 1,
        filterUpperValue: 5,
      };
      expect(selectors.TEST_ONLY.utils.matchFilter(filter, 0)).toBeFalse();
      expect(selectors.TEST_ONLY.utils.matchFilter(filter, 1)).toBeTrue();
      expect(selectors.TEST_ONLY.utils.matchFilter(filter, 3)).toBeTrue();
      expect(selectors.TEST_ONLY.utils.matchFilter(filter, 5)).toBeTrue();
      expect(selectors.TEST_ONLY.utils.matchFilter(filter, 6)).toBeFalse();

      expect(selectors.TEST_ONLY.utils.matchFilter(filter, 'foo')).toBeFalse();
    });

    it('returns false if filter type is neither DISCRETE nor INTERVAL', () => {
      expect(
        selectors.TEST_ONLY.utils.matchFilter({} as DiscreteFilter, 'foo')
      ).toBeFalse();
    });
  });

  describe('filterRunItemsByRegex', () => {
    it('returns all runs when no regex is provided', () => {
      expect(
        selectors.TEST_ONLY.utils.filterRunItemsByRegex(
          runTableItems,
          '',
          false
        )
      ).toEqual(runTableItems);
    });

    it('only returns runs matching regex', () => {
      expect(
        selectors.TEST_ONLY.utils.filterRunItemsByRegex(
          runTableItems,
          'run',
          false
        )
      ).toEqual(runTableItems);

      expect(
        selectors.TEST_ONLY.utils.filterRunItemsByRegex(
          runTableItems,
          'exp',
          false
        )
      ).toEqual([]);

      expect(
        selectors.TEST_ONLY.utils.filterRunItemsByRegex(
          runTableItems,
          'exp',
          true
        )
      ).toEqual(runTableItems);

      expect(
        selectors.TEST_ONLY.utils.filterRunItemsByRegex(
          runTableItems,
          'run[13]',
          false
        )
      ).toEqual([runTableItems[0], runTableItems[2]]);

      expect(
        selectors.TEST_ONLY.utils.filterRunItemsByRegex(
          runTableItems,
          'run2',
          false
        )
      ).toEqual([runTableItems[1]]);
    });
  });

  describe('getRenderableRuns', () => {
    it('returns all runs associated with each experiment', () => {
      state.app_routing!.activeRoute!.routeKind = RouteKind.COMPARE_EXPERIMENT;
      const results = selectors.TEST_ONLY.getRenderableRuns(state);
      expect(results.length).toEqual(5);
      expect(results[0].run).toEqual({...run1, experimentId: 'exp1'});
      expect(results[1].run).toEqual({...run2, experimentId: 'exp1'});
      expect(results[2].run).toEqual({...run2, experimentId: 'exp2'});
      expect(results[3].run).toEqual({...run3, experimentId: 'exp2'});
      expect(results[4].run).toEqual({...run4, experimentId: 'exp2'});
    });

    it('returns empty list when route does not contain experiments', () => {
      state.app_routing!.activeRoute = {
        routeKind: RouteKind.EXPERIMENTS,
        params: {},
      };
      expect(selectors.TEST_ONLY.getRenderableRuns(state)).toEqual([]);
    });
  });

  describe('filterRunItemsByHparamAndMetricFilter', () => {
    it('filters by hparams using discrete filters', () => {
      expect(
        selectors.TEST_ONLY.utils.filterRunItemsByHparamAndMetricFilter(
          runTableItems,
          new Map([
            [
              'lr',
              {
                type: DomainType.DISCRETE,
                includeUndefined: false,
                possibleValues: [1, 3, 5],
                filterValues: [1],
              },
            ],
          ]),
          new Map()
        ).length
      ).toEqual(1);
      expect(
        selectors.TEST_ONLY.utils.filterRunItemsByHparamAndMetricFilter(
          runTableItems,
          new Map([
            [
              'lr',
              {
                type: DomainType.DISCRETE,
                includeUndefined: false,
                possibleValues: [1, 3, 5],
                filterValues: [1, 5],
              },
            ],
          ]),
          new Map()
        ).length
      ).toEqual(2);

      expect(
        selectors.TEST_ONLY.utils.filterRunItemsByHparamAndMetricFilter(
          runTableItems,
          new Map([
            [
              'who knows',
              {
                type: DomainType.DISCRETE,
                includeUndefined: false,
                possibleValues: [1, 3, 5],
                filterValues: [1, 5],
              },
            ],
          ]),
          new Map()
        ).length
      ).toEqual(0);
    });

    it('filters by hparams using interval filters', () => {
      expect(
        selectors.TEST_ONLY.utils.filterRunItemsByHparamAndMetricFilter(
          runTableItems,
          new Map([
            [
              'lr',
              {
                type: DomainType.INTERVAL,
                minValue: 0,
                maxValue: 10,
                filterLowerValue: 2,
                filterUpperValue: 5,
                includeUndefined: true,
              },
            ],
          ]),
          new Map()
        ).length
      ).toEqual(2);

      expect(
        selectors.TEST_ONLY.utils.filterRunItemsByHparamAndMetricFilter(
          runTableItems,
          new Map([
            [
              'who knows',
              {
                type: DomainType.INTERVAL,
                minValue: 0,
                maxValue: 10,
                filterLowerValue: 2,
                filterUpperValue: 5,
                includeUndefined: false,
              },
            ],
          ]),
          new Map()
        ).length
      ).toEqual(0);
    });

    it('filters by metrics using interval filters', () => {
      expect(
        selectors.TEST_ONLY.utils.filterRunItemsByHparamAndMetricFilter(
          runTableItems,
          new Map(),
          new Map([
            [
              'foo',
              {
                type: DomainType.INTERVAL,
                minValue: 0,
                maxValue: 10,
                filterLowerValue: 2,
                filterUpperValue: 3,
                includeUndefined: false,
              },
            ],
          ])
        ).length
      ).toEqual(2);

      expect(
        selectors.TEST_ONLY.utils.filterRunItemsByHparamAndMetricFilter(
          runTableItems,
          new Map(),
          new Map([
            [
              'bar',
              {
                type: DomainType.INTERVAL,
                minValue: 0,
                maxValue: 10,
                filterLowerValue: 2,
                filterUpperValue: 3,
                includeUndefined: false,
              },
            ],
          ])
        ).length
      ).toEqual(0);
    });

    it('filters by both hparams and metrics', () => {
      expect(
        selectors.TEST_ONLY.utils.filterRunItemsByHparamAndMetricFilter(
          runTableItems,
          new Map([
            [
              'lr',
              {
                type: DomainType.INTERVAL,
                minValue: 0,
                maxValue: 10,
                filterLowerValue: 2,
                filterUpperValue: 5,
                includeUndefined: true,
              },
            ],
          ]),
          new Map([
            [
              'foo',
              {
                type: DomainType.INTERVAL,
                minValue: 0,
                maxValue: 10,
                filterLowerValue: 2,
                filterUpperValue: 3,
                includeUndefined: false,
              },
            ],
          ])
        ).length
      ).toEqual(1);
    });
  });

  describe('getFilteredRenderableRuns', () => {
    it('does not use experiment alias when route is not compare', () => {
      state.runs!.data.regexFilter = 'foo';
      state.app_routing!.activeRoute = {
        routeKind: RouteKind.EXPERIMENT,
        params: {experimentIds: 'exp1'},
      };
      const result = selectors.getFilteredRenderableRuns(state);
      expect(result).toEqual([]);
    });

    it('uses experiment alias when route is compare', () => {
      state.runs!.data.regexFilter = 'foo';
      state.app_routing!.activeRoute!.routeKind = RouteKind.COMPARE_EXPERIMENT;
      const result = selectors.getFilteredRenderableRuns(state);
      expect(result.length).toEqual(2);
      expect(result[0].run.name).toEqual('run 1');
      expect(result[1].run.name).toEqual('run 2');
    });

    it('filters runs by hparam and metrics', () => {
      const spy = spyOn(
        selectors.TEST_ONLY.utils,
        'filterRunItemsByHparamAndMetricFilter'
      ).and.callThrough();
      state.app_routing!.activeRoute = {
        routeKind: RouteKind.EXPERIMENT,
        params: {experimentIds: 'exp1'},
      };
      const results = selectors.getFilteredRenderableRuns(state);
      expect(spy).toHaveBeenCalledOnceWith(results, new Map(), new Map());
    });

    it('returns empty list when no experiments are provided', () => {
      state.app_routing!.activeRoute = {
        routeKind: RouteKind.EXPERIMENTS,
        params: {},
      };
      expect(selectors.getFilteredRenderableRuns(state)).toEqual([]);
    });
  });

  describe('getFilteredRenderableRunsIdsFromRoute', () => {
    it('returns a set of run ids from the route when in compare view', () => {
      state.app_routing!.activeRoute!.routeKind = RouteKind.COMPARE_EXPERIMENT;
      const result = selectors.getFilteredRenderableRunsIds(state);
      expect(result).toEqual(new Set(['1', '2', '3', '4']));
    });

    it('returns a set of run ids from the route when in single experiment view', () => {
      const result = selectors.getFilteredRenderableRunsIds(state);
      expect(result).toEqual(new Set());
    });
  });

  describe('getPotentialHparamColumns', () => {
    const expectedCommonProperties = {
      enabled: false,
      removable: true,
      sortable: true,
      movable: true,
      filterable: true,
      tags: [],
    };

    it('returns empty list when there are no experiments', () => {
      state.app_routing!.activeRoute!.routeKind = RouteKind.EXPERIMENTS;

      expect(selectors.getPotentialHparamColumns(state)).toEqual([]);
    });

    it('creates columns for each hparam', () => {
      expect(selectors.getPotentialHparamColumns(state)).toEqual([
        {
          type: ColumnHeaderType.HPARAM,
          name: 'conv_layers',
          displayName: 'Conv Layers',
          ...expectedCommonProperties,
        },
        {
          type: ColumnHeaderType.HPARAM,
          name: 'conv_kernel_size',
          displayName: 'Conv Kernel Size',
          ...expectedCommonProperties,
        },
        {
          type: ColumnHeaderType.HPARAM,
          name: 'dense_layers',
          displayName: 'Dense Layers',
          ...expectedCommonProperties,
        },
        {
          type: ColumnHeaderType.HPARAM,
          name: 'dropout',
          displayName: 'Dropout',
          ...expectedCommonProperties,
        },
      ]);
    });

    it('sets name as display name when a display name is not provided', () => {
      state.hparams!.dashboardHparamSpecs = [
        buildHparamSpec({name: 'conv_layers', displayName: ''}),
      ];

      expect(selectors.getPotentialHparamColumns(state)).toEqual([
        {
          type: ColumnHeaderType.HPARAM,
          name: 'conv_layers',
          displayName: 'conv_layers',
          ...expectedCommonProperties,
        },
      ]);
    });

    it('sets differs tag', () => {
      state.hparams!.dashboardHparamSpecs = [buildHparamSpec({differs: true})];

      expect(selectors.getPotentialHparamColumns(state)[0].tags).toEqual([
        'differs',
      ]);
    });
  });

  describe('getSelectableColumns', () => {
    it('returns the full list of hparam columns if none are currently displayed', () => {
      state.hparams!.dashboardDisplayedHparamColumns = [];

      expect(selectors.getSelectableColumns(state)).toEqual([
        jasmine.objectContaining({
          type: ColumnHeaderType.HPARAM,
          name: 'conv_layers',
          displayName: 'Conv Layers',
        }),
        jasmine.objectContaining({
          type: ColumnHeaderType.HPARAM,
          name: 'conv_kernel_size',
          displayName: 'Conv Kernel Size',
        }),
        jasmine.objectContaining({
          type: ColumnHeaderType.HPARAM,
          name: 'dense_layers',
          displayName: 'Dense Layers',
        }),
        jasmine.objectContaining({
          type: ColumnHeaderType.HPARAM,
          name: 'dropout',
          displayName: 'Dropout',
        }),
      ]);
    });

    it('returns only columns that are not displayed', () => {
      expect(selectors.getSelectableColumns(state)).toEqual([
        jasmine.objectContaining({
          type: ColumnHeaderType.HPARAM,
          name: 'conv_kernel_size',
          displayName: 'Conv Kernel Size',
        }),
        jasmine.objectContaining({
          type: ColumnHeaderType.HPARAM,
          name: 'dropout',
          displayName: 'Dropout',
        }),
      ]);
    });
  });
});
