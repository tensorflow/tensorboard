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
import {
  buildSpecs,
  buildHparamSpec,
  buildMetricSpec,
} from '../../../hparams/_redux/testing';
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
        ui: {} as any,
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
            experimentIds: 'foo:exp1,bar:exp2',
          },
        },
      } as any,
      hparams: {
        specs: buildSpecs('defaultExperimentId', {
          hparam: {
            specs: [buildHparamSpec({name: 'foo', displayName: 'Foo'})],
            defaultFilters: new Map(),
          },
          metric: {
            specs: [buildMetricSpec({displayName: 'Bar'})],
            defaultFilters: new Map(),
          },
        }),
      } as any,
    });
  });

  describe('getScalarTagsForRunSelection', () => {
    it('returns all tags containing scalar data when no runs are selected', () => {
      const state = {
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
      };
      expect(selectors.TEST_ONLY.getScalarTagsForRunSelection(state)).toEqual(
        new Set(['tag-1', 'tag-2'])
      );
    });

    it('returns only tags containing selected runs when some runs are selected', () => {
      const state = {
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
      };
      expect(selectors.TEST_ONLY.getScalarTagsForRunSelection(state)).toEqual(
        new Set(['tag-2'])
      );
    });
  });

  describe('getRenderableCardIdsWithMetadata', () => {
    it('returns all tags containing scalar data when no runs are selected', () => {
      const state = {
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
      };
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
      const state = {
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
      };
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
      const state = {
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
      };
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
    it('returns all runs associated with experiment', () => {
      const exp1Result = selectors.factories.getRenderableRuns(['exp1'])(state);
      expect(exp1Result.length).toEqual(2);
      expect(exp1Result[0].run).toEqual({...run1, experimentId: 'exp1'});
      expect(exp1Result[1].run).toEqual({...run2, experimentId: 'exp1'});

      const exp2Result = selectors.factories.getRenderableRuns(['exp2'])(state);
      expect(exp2Result.length).toEqual(3);
      expect(exp2Result[0].run).toEqual({...run2, experimentId: 'exp2'});
      expect(exp2Result[1].run).toEqual({...run3, experimentId: 'exp2'});
      expect(exp2Result[2].run).toEqual({...run4, experimentId: 'exp2'});
    });

    it('returns two runs when a run is associated with multiple experiments', () => {
      const result = selectors.factories.getRenderableRuns(['exp1', 'exp2'])(
        state
      );
      expect(result.length).toEqual(5);
      expect(result[0].run).toEqual({...run1, experimentId: 'exp1'});
      expect(result[1].run).toEqual({...run2, experimentId: 'exp1'});
      expect(result[2].run).toEqual({...run2, experimentId: 'exp2'});
      expect(result[3].run).toEqual({...run3, experimentId: 'exp2'});
      expect(result[4].run).toEqual({...run4, experimentId: 'exp2'});
    });

    it('returns empty list when no experiments are provided', () => {
      expect(selectors.factories.getRenderableRuns([])(state)).toEqual([]);
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
      const result = selectors.factories.getFilteredRenderableRuns(['exp1'])(
        state
      );
      expect(result).toEqual([]);
    });

    it('uses experiment alias when route is compare', () => {
      state.runs!.data.regexFilter = 'foo';
      state.app_routing!.activeRoute!.routeKind = RouteKind.COMPARE_EXPERIMENT;
      const result = selectors.factories.getFilteredRenderableRuns(['exp1'])(
        state
      );
      expect(result.length).toEqual(2);
      expect(result[0].run.name).toEqual('run 1');
      expect(result[1].run.name).toEqual('run 2');
    });

    it('filters runs by hparam and metrics', () => {
      const spy = spyOn(
        selectors.TEST_ONLY.utils,
        'filterRunItemsByHparamAndMetricFilter'
      ).and.callThrough();
      const results = selectors.factories.getFilteredRenderableRuns(['exp1'])(
        state
      );
      expect(spy).toHaveBeenCalledOnceWith(results, new Map(), new Map());
    });

    it('returns empty list when no experiments are provided', () => {
      expect(selectors.factories.getFilteredRenderableRuns([])(state)).toEqual(
        []
      );
    });
  });

  describe('getFilteredRenderableRunsFromRoute', () => {
    it('calls getFilteredRenderableRuns with experiment ids from the route when in compare view', () => {
      state.app_routing!.activeRoute!.routeKind = RouteKind.COMPARE_EXPERIMENT;
      const result = selectors.getFilteredRenderableRunsFromRoute(state);
      expect(result).toEqual(
        selectors.factories.getFilteredRenderableRuns(['exp1', 'exp2'])(state)
      );
    });

    it('calls getFilteredRenderableRuns with experiment ids from the route when in single experiment view', () => {
      const result = selectors.getFilteredRenderableRunsFromRoute(state);
      expect(result).toEqual(
        selectors.factories.getFilteredRenderableRuns(['defaultExperimentId'])(
          state
        )
      );
    });
  });

  describe('getFilteredRenderableRunsIdsFromRoute', () => {
    it('returns a set of run ids from the route when in compare view', () => {
      state.app_routing!.activeRoute!.routeKind = RouteKind.COMPARE_EXPERIMENT;
      const result = selectors.getFilteredRenderableRunsIdsFromRoute(state);
      expect(result).toEqual(new Set(['1', '2', '3', '4']));
    });

    it('returns a set of run ids from the route when in single experiment view', () => {
      const result = selectors.getFilteredRenderableRunsIdsFromRoute(state);
      expect(result).toEqual(new Set());
    });
  });

  describe('getPotentialHparamColumns', () => {
    it('returns empty list when there are no experiments', () => {
      state.app_routing!.activeRoute!.routeKind = RouteKind.EXPERIMENTS;

      expect(selectors.getPotentialHparamColumns(state)).toEqual([]);
    });

    it('creates columns for each hparam', () => {
      expect(selectors.getPotentialHparamColumns(state)).toEqual([
        {
          type: ColumnHeaderType.HPARAM,
          name: 'foo',
          displayName: 'Foo',
          enabled: false,
        },
      ]);
    });

    it('sets name as display name when a display name is not provided', () => {
      state.hparams!.specs['defaultExperimentId'].hparam.specs.push(
        buildHparamSpec({name: 'bar', displayName: ''})
      );
      expect(selectors.getPotentialHparamColumns(state)).toEqual([
        {
          type: ColumnHeaderType.HPARAM,
          name: 'foo',
          displayName: 'Foo',
          enabled: false,
        },
        {
          type: ColumnHeaderType.HPARAM,
          name: 'bar',
          displayName: 'bar',
          enabled: false,
        },
      ]);
    });
  });
});
