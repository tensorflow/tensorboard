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

import {fetchRunsSucceeded} from '../../runs/actions';
import {buildHparamsAndMetadata} from '../../runs/data_source/testing';
import {buildRun} from '../../runs/store/testing';
import {DiscreteFilter, DomainType, IntervalFilter, RunStatus} from '../types';
import * as actions from './hparams_actions';
import {reducers} from './hparams_reducers';
import {
  buildDiscreteFilter,
  buildFilterState,
  buildHparamSpec,
  buildHparamsState,
  buildIntervalFilter,
  buildMetricSpec,
  buildSpecs,
} from './testing';

describe('hparams/_redux/hparams_reducers_test', () => {
  describe('fetchRunsSucceeded', () => {
    it('sets hparams and metrics specs', () => {
      const state = buildHparamsState({
        specs: buildSpecs('foo', {
          hparam: {
            specs: [buildHparamSpec({name: 'h1'})],
            defaultFilters: new Map([
              [
                'h1',
                buildIntervalFilter({
                  filterLowerValue: 0.5,
                  filterUpperValue: 0.7,
                }),
              ],
            ]),
          },
          metric: {
            specs: [buildMetricSpec({tag: 'm1'})],
            defaultFilters: new Map([
              [
                'm1',
                buildIntervalFilter({
                  filterLowerValue: 0.5,
                  filterUpperValue: 0.5,
                }),
              ],
            ]),
          },
        }),
      });

      const action = fetchRunsSucceeded({
        experimentIds: [],
        runsForAllExperiments: [],
        newRunsAndMetadata: {
          foo: {
            runs: [
              buildRun({id: 'r1'}),
              buildRun({id: 'r2'}),
              buildRun({id: 'r3'}),
            ],
            metadata: buildHparamsAndMetadata({
              runToHparamsAndMetrics: {
                r1: {
                  hparams: [],
                  metrics: [{tag: 'm1', trainingStep: 1, value: 1}],
                },
                r2: {
                  hparams: [],
                  metrics: [{tag: 'm1', trainingStep: 1, value: 0.1}],
                },
                r3: {
                  hparams: [],
                  metrics: [{tag: 'm2', trainingStep: 1, value: 100}],
                },
              },
              hparamSpecs: [
                buildHparamSpec({
                  name: 'h1',
                  domain: {type: DomainType.INTERVAL, minValue: 0, maxValue: 1},
                }),
                buildHparamSpec({
                  name: 'h2',
                  domain: {
                    type: DomainType.DISCRETE,
                    values: ['a', 'b', 'c'],
                  },
                }),
              ],
              metricSpecs: [
                buildMetricSpec({tag: 'm1'}),
                buildMetricSpec({tag: 'm2'}),
                buildMetricSpec({tag: 'm3'}),
              ],
            }),
          },
        },
      });

      const nextState = reducers(state, action);

      expect(nextState.specs['foo'].hparam.specs).toEqual([
        buildHparamSpec({
          name: 'h1',
          domain: {type: DomainType.INTERVAL, minValue: 0, maxValue: 1},
        }),
        buildHparamSpec({
          name: 'h2',
          domain: {
            type: DomainType.DISCRETE,
            values: ['a', 'b', 'c'],
          },
        }),
      ]);
      expect(nextState.specs['foo'].hparam.defaultFilters).toEqual(
        new Map<string, DiscreteFilter | IntervalFilter>([
          [
            'h1',
            buildIntervalFilter({
              minValue: 0,
              maxValue: 1,
              filterLowerValue: 0,
              filterUpperValue: 1,
            }),
          ],
          [
            'h2',
            buildDiscreteFilter({
              possibleValues: ['a', 'b', 'c'],
              filterValues: ['a', 'b', 'c'],
            }),
          ],
        ])
      );

      expect(nextState.specs['foo'].metric.specs).toEqual([
        buildMetricSpec({tag: 'm1'}),
        buildMetricSpec({tag: 'm2'}),
        buildMetricSpec({tag: 'm3'}),
      ]);
      expect(nextState.specs['foo'].metric.defaultFilters).toEqual(
        new Map([
          [
            'm1',
            buildIntervalFilter({
              minValue: 0.1,
              maxValue: 1,
              filterLowerValue: 0.1,
              filterUpperValue: 1,
            }),
          ],
          [
            'm2',
            buildIntervalFilter({
              minValue: 100,
              maxValue: 100,
              filterLowerValue: 100,
              filterUpperValue: 100,
            }),
          ],
          [
            'm3',
            buildIntervalFilter({
              minValue: 0,
              maxValue: 0,
              filterLowerValue: 0,
              filterUpperValue: 0,
            }),
          ],
        ])
      );
    });
  });

  describe('hparamsIntervalHparamFilterChanged', () => {
    it('sets initial interval hparam filter', () => {
      const state = buildHparamsState({
        specs: buildSpecs('foo', {
          hparam: {
            specs: [buildHparamSpec({name: 'dropout'})],
            defaultFilters: new Map([['dropout', buildIntervalFilter()]]),
          },
        }),
      });

      const nextState = reducers(
        state,
        actions.hparamsIntervalHparamFilterChanged({
          experimentIds: ['foo'],
          hparamName: 'dropout',
          includeUndefined: true,
          filterLowerValue: 0.5,
          filterUpperValue: 0.5,
        })
      );

      expect(nextState.filters['["foo"]'].hparams).toEqual(
        new Map([
          [
            'dropout',
            buildIntervalFilter({
              includeUndefined: true,
              filterLowerValue: 0.5,
              filterUpperValue: 0.5,
            }),
          ],
        ])
      );
    });

    it('updates existing interval hparam filter', () => {
      const state = buildHparamsState({
        specs: buildSpecs('foo', {
          hparam: {
            specs: [buildHparamSpec({name: 'dropout'})],
            defaultFilters: new Map([['dropout', buildIntervalFilter()]]),
          },
        }),
        filters: buildFilterState(['foo'], {
          hparams: new Map([
            [
              'dropout',
              buildIntervalFilter({
                includeUndefined: true,
                filterLowerValue: 0.003,
                filterUpperValue: 0.5,
              }),
            ],
          ]),
        }),
      });

      const nextState = reducers(
        state,
        actions.hparamsIntervalHparamFilterChanged({
          experimentIds: ['foo'],
          hparamName: 'dropout',
          includeUndefined: true,
          filterLowerValue: 0.5,
          filterUpperValue: 0.5,
        })
      );

      expect(nextState.filters['["foo"]'].hparams).toEqual(
        new Map([
          [
            'dropout',
            buildIntervalFilter({
              includeUndefined: true,
              filterLowerValue: 0.5,
              filterUpperValue: 0.5,
            }),
          ],
        ])
      );
    });

    it('throws error when setting interval hparam that did not exist', () => {
      const state = buildHparamsState(
        buildSpecs('foo', {
          hparam: {
            specs: [buildHparamSpec({name: 'dropout'})],
            defaultFilters: new Map([['dropout', buildIntervalFilter()]]),
          },
        })
      );

      const action = actions.hparamsIntervalHparamFilterChanged({
        experimentIds: ['foo'],
        hparamName: 'random_seed',
        includeUndefined: true,
        filterLowerValue: 0.5,
        filterUpperValue: 0.5,
      });

      expect(() => reducers(state, action)).toThrow();
    });

    it('throws when setting interval on discrete hparam', () => {
      const state = buildHparamsState(
        buildSpecs('foo', {
          hparam: {
            specs: [buildHparamSpec({name: 'dropout'})],
            defaultFilters: new Map([['dropout', buildDiscreteFilter()]]),
          },
        })
      );

      const action = actions.hparamsIntervalHparamFilterChanged({
        experimentIds: ['foo'],
        hparamName: 'dropout',
        includeUndefined: true,
        filterLowerValue: 0.5,
        filterUpperValue: 0.5,
      });

      expect(() => reducers(state, action)).toThrow();
    });
  });

  describe('hparamsDiscreteHparamFilterChanged', () => {
    it('sets initial discrete hparam filter', () => {
      const state = buildHparamsState({
        specs: buildSpecs('foo', {
          hparam: {
            specs: [buildHparamSpec({name: 'dropout'})],
            defaultFilters: new Map([
              [
                'dropout',
                buildDiscreteFilter({
                  includeUndefined: true,
                  filterValues: [1, 10, 100],
                }),
              ],
            ]),
          },
        }),
        filters: buildFilterState(['foo'], {hparams: new Map()}),
      });

      const nextState = reducers(
        state,
        actions.hparamsDiscreteHparamFilterChanged({
          experimentIds: ['foo'],
          hparamName: 'dropout',
          includeUndefined: true,
          filterValues: [10, 100],
        })
      );

      expect(nextState.filters['["foo"]'].hparams).toEqual(
        new Map([
          [
            'dropout',
            buildDiscreteFilter({
              includeUndefined: true,
              filterValues: [10, 100],
            }),
          ],
        ])
      );
    });

    it('updates existing discrete hparam filter', () => {
      const state = buildHparamsState({
        specs: buildSpecs('foo', {
          hparam: {
            specs: [buildHparamSpec({name: 'dropout'})],
            defaultFilters: new Map([
              [
                'dropout',
                buildDiscreteFilter({
                  includeUndefined: true,
                  filterValues: [1, 10, 100],
                }),
              ],
            ]),
          },
        }),
        filters: buildFilterState(['foo'], {
          hparams: new Map([
            [
              'dropout',
              buildDiscreteFilter({
                includeUndefined: true,
                filterValues: [2, 200],
              }),
            ],
          ]),
        }),
      });

      const nextState = reducers(
        state,
        actions.hparamsDiscreteHparamFilterChanged({
          experimentIds: ['foo'],
          hparamName: 'dropout',
          includeUndefined: true,
          filterValues: [10, 100],
        })
      );

      expect(nextState.filters['["foo"]'].hparams).toEqual(
        new Map([
          [
            'dropout',
            buildDiscreteFilter({
              includeUndefined: true,
              filterValues: [10, 100],
            }),
          ],
        ])
      );
    });

    it('throws error when setting discrete hparam that did not exist', () => {
      const state = buildHparamsState({
        specs: buildSpecs('foo', {
          hparam: {
            specs: [buildHparamSpec({name: 'dropout'})],
            defaultFilters: new Map([]),
          },
        }),
        filters: buildFilterState(['foo'], {hparams: new Map()}),
      });

      const action = actions.hparamsDiscreteHparamFilterChanged({
        experimentIds: ['foo'],
        hparamName: 'optimizer',
        includeUndefined: true,
        filterValues: ['adam', 'adagrad'],
      });

      expect(() => reducers(state, action)).toThrow();
    });

    it('throws when setting discrete change on interval hparam', () => {
      const state = buildHparamsState({
        specs: buildSpecs('foo', {
          hparam: {
            specs: [buildHparamSpec({name: 'dropout'})],
            defaultFilters: new Map([['dropout', buildIntervalFilter()]]),
          },
        }),
        filters: buildFilterState(['foo'], {
          hparams: new Map([['dropout', buildIntervalFilter()]]),
        }),
      });

      const action = actions.hparamsDiscreteHparamFilterChanged({
        experimentIds: ['foo'],
        hparamName: 'dropout',
        includeUndefined: true,
        filterValues: ['adam', 'adagrad'],
      });

      expect(() => reducers(state, action)).toThrow();
    });
  });

  describe('hparamsMetricFilterChanged', () => {
    it('sets initial metric filters', () => {
      const state = buildHparamsState({
        specs: buildSpecs('foo', {
          metric: {
            specs: [buildMetricSpec({tag: 'loss'})],
            defaultFilters: new Map([
              [
                'loss',
                buildIntervalFilter({
                  includeUndefined: true,
                  filterLowerValue: 0.2,
                  filterUpperValue: 0.5,
                }),
              ],
            ]),
          },
        }),
      });

      const nextState = reducers(
        state,
        actions.hparamsMetricFilterChanged({
          experimentIds: ['foo'],
          metricTag: 'loss',
          includeUndefined: false,
          filterLowerValue: 0.1,
          filterUpperValue: 0.5,
        })
      );

      expect(nextState.filters['["foo"]'].metrics).toEqual(
        new Map([
          [
            'loss',
            buildIntervalFilter({
              includeUndefined: false,
              filterLowerValue: 0.1,
              filterUpperValue: 0.5,
            }),
          ],
        ])
      );
    });

    it('updates existing metric filters', () => {
      const state = buildHparamsState({
        specs: buildSpecs('foo', {
          metric: {
            specs: [buildMetricSpec({tag: 'loss'})],
            defaultFilters: new Map([
              [
                'loss',
                buildIntervalFilter({
                  includeUndefined: true,
                  filterLowerValue: 0.2,
                  filterUpperValue: 0.5,
                }),
              ],
            ]),
          },
        }),
        filters: buildFilterState(['foo'], {
          metrics: new Map([
            [
              'loss',
              buildIntervalFilter({
                includeUndefined: true,
                filterLowerValue: 0.2,
                filterUpperValue: 0.5,
              }),
            ],
          ]),
        }),
      });

      const nextState = reducers(
        state,
        actions.hparamsMetricFilterChanged({
          experimentIds: ['foo'],
          metricTag: 'loss',
          includeUndefined: false,
          filterLowerValue: 0.1,
          filterUpperValue: 0.5,
        })
      );

      expect(nextState.filters['["foo"]'].metrics).toEqual(
        new Map([
          [
            'loss',
            buildIntervalFilter({
              includeUndefined: false,
              filterLowerValue: 0.1,
              filterUpperValue: 0.5,
            }),
          ],
        ])
      );
    });

    it('throws error if it sets filter that does not exist', () => {
      const state = buildHparamsState(
        buildSpecs('foo', {
          metric: {
            specs: [buildMetricSpec({tag: 'loss'})],
            defaultFilters: new Map(),
          },
        })
      );

      const action = actions.hparamsMetricFilterChanged({
        experimentIds: ['foo'],
        metricTag: 'accuracy',
        includeUndefined: true,
        filterLowerValue: 0,
        filterUpperValue: 1,
      });
      expect(() => reducers(state, action)).toThrow();
    });
  });

  describe('hparamsFetchSessionGroupsSucceeded', () => {
    it('saves action.hparamsAndMetricsSpecs as dashboardSpecs', () => {
      const state = buildHparamsState({
        dashboardSpecs: {},
      });
      const state2 = reducers(
        state,
        actions.hparamsFetchSessionGroupsSucceeded({
          hparamsAndMetricsSpecs: {
            hparams: [buildHparamSpec({name: 'foo'})],
            metrics: [buildMetricSpec({tag: 'bar'})],
          },
          sessionGroups: [],
        })
      );

      expect(state2.dashboardSpecs).toEqual({
        hparams: [buildHparamSpec({name: 'foo'})],
        metrics: [buildMetricSpec({tag: 'bar'})],
      });
    });

    it('saves action.sessionGroups as dashboardSessionGroups', () => {
      const state = buildHparamsState({
        dashboardSessionGroups: [],
      });
      const mockSessionGroup = {
        name: 'session_group_1',
        hparams: {
          someHparam: 1,
          someOtherHparam: 'foo',
        },
        sessions: [
          {
            name: 'exp1/run1',
            metricValues: [],
            modelUri: '',
            monitorUrl: '',
            startTimeSecs: 123,
            endTimeSecs: 456,
            status: RunStatus.STATUS_UNKNOWN,
          },
        ],
      };
      const state2 = reducers(
        state,
        actions.hparamsFetchSessionGroupsSucceeded({
          hparamsAndMetricsSpecs: {
            hparams: [],
            metrics: [],
          },
          sessionGroups: [mockSessionGroup],
        })
      );

      expect(state2.dashboardSessionGroups).toEqual([mockSessionGroup]);
    });
  });

  describe('dashboardHparamFilterAdded', () => {
    it('adds entry dashboardFilters', () => {
      const state = buildHparamsState({
        dashboardFilters: {
          hparams: new Map([
            [
              'hparam2',
              {
                type: DomainType.INTERVAL,
                includeUndefined: true,
                minValue: 2,
                maxValue: 20,
                filterLowerBound: 2,
                filterUpperBound: 20,
              },
            ],
          ]),
        },
      });
      const state2 = reducers(
        state,
        actions.dashboardHparamFilterAdded({
          name: 'hparam1',
          filter: {
            type: DomainType.DISCRETE,
            includeUndefined: true,
            filterValues: [5],
            possibleValues: [5, 7, 8],
          },
        })
      );
      expect(state2.dashboardFilters).toEqual({
        hparams: new Map([
          [
            'hparam1',
            {
              type: DomainType.DISCRETE,
              includeUndefined: true,
              filterValues: [5],
              possibleValues: [5, 7, 8],
            },
          ],
          [
            'hparam2',
            {
              type: DomainType.INTERVAL,
              includeUndefined: true,
              minValue: 2,
              maxValue: 20,
              filterLowerBound: 2,
              filterUpperBound: 20,
            },
          ],
        ]),
        metrics: new Map(),
      });
    });
  });

  describe('dashboardMetricFilterAdded', () => {
    it('adds entry dashboardFilters', () => {
      const state = buildHparamsState({
        dashboardFilters: {
          metrics: new Map([
            [
              'metric 2',
              {
                type: DomainType.INTERVAL,
                includeUndefined: true,
                minValue: 1,
                maxValue: 50,
                filterLowerValue: 1,
                filterUpperValue: 51,
              },
            ],
          ]),
        },
      });
      const state2 = reducers(
        state,
        actions.dashboardMetricFilterAdded({
          name: 'metric 1',
          filter: {
            type: DomainType.INTERVAL,
            includeUndefined: true,
            minValue: -2,
            maxValue: 42,
            filterLowerValue: -2,
            filterUpperValue: 40,
          },
        })
      );
      expect(state2.dashboardFilters).toEqual({
        hparams: new Map(),
        metrics: new Map([
          [
            'metric 1',
            {
              type: DomainType.INTERVAL,
              includeUndefined: true,
              minValue: -2,
              maxValue: 42,
              filterLowerValue: -2,
              filterUpperValue: 40,
            },
          ],
          [
            'metric 2',
            {
              type: DomainType.INTERVAL,
              includeUndefined: true,
              minValue: 1,
              maxValue: 50,
              filterLowerValue: 1,
              filterUpperValue: 51,
            },
          ],
        ]),
      });
    });
  });

  describe('dashboardHparamFilterRemoved', () => {
    it('removes entry from dashboardFilters', () => {
      const state = buildHparamsState({
        dashboardFilters: {
          hparams: new Map([
            [
              'hparam1',
              {
                type: DomainType.INTERVAL,
                includeUndefined: true,
                minValue: 5,
                maxValue: 10,
                filterLowerBound: 5,
                filterUpperBound: 10,
              },
            ],
            [
              'hparam2',
              {
                type: DomainType.INTERVAL,
                includeUndefined: true,
                minValue: 2,
                maxValue: 20,
                filterLowerBound: 2,
                filterUpperBound: 20,
              },
            ],
          ]),
        },
      });
      const state2 = reducers(
        state,
        actions.dashboardHparamFilterRemoved({
          name: 'hparam1',
        })
      );
      expect(state2.dashboardFilters).toEqual({
        hparams: new Map([
          [
            'hparam2',
            {
              type: DomainType.INTERVAL,
              includeUndefined: true,
              minValue: 2,
              maxValue: 20,
              filterLowerBound: 2,
              filterUpperBound: 20,
            },
          ],
        ]),
        metrics: new Map(),
      });
    });
  });

  describe('dashboardMetricFilterRemoved', () => {
    it('removes entry from dashboardFilters', () => {
      const state = buildHparamsState({
        dashboardFilters: {
          metrics: new Map([
            [
              'metric 1',
              {
                type: DomainType.INTERVAL,
                includeUndefined: true,
                minValue: 5,
                maxValue: 10,
                filterLowerBound: 5,
                filterUpperBound: 10,
              },
            ],
            [
              'metric 2',
              {
                type: DomainType.INTERVAL,
                includeUndefined: true,
                minValue: 2,
                maxValue: 20,
                filterLowerBound: 2,
                filterUpperBound: 20,
              },
            ],
          ]),
        },
      });
      const state2 = reducers(
        state,
        actions.dashboardMetricFilterRemoved({
          name: 'metric 1',
        })
      );
      expect(state2.dashboardFilters).toEqual({
        hparams: new Map([
          [
            'metric 2',
            {
              type: DomainType.INTERVAL,
              includeUndefined: true,
              minValue: 2,
              maxValue: 20,
              filterLowerBound: 2,
              filterUpperBound: 20,
            },
          ],
        ]),
        metrics: new Map(),
      });
    });
  });
});
