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
import {DiscreteFilter, DomainType, IntervalFilter} from '../types';
import * as actions from './hparams_actions';
import {reducers} from './hparams_reducers';
import {
  buildDiscreteFilter,
  buildHparam,
  buildHparamSpec,
  buildHparamsState,
  buildIntervalFilter,
  buildMetric,
  buildMetricSpec,
} from './testing';

describe('hparams/_redux/hparams_reducers_test', () => {
  describe('fetchRunsSucceeded', () => {
    it('sets hparams and metrics specs', () => {
      const state = buildHparamsState({
        foo: {
          hparam: buildHparam({
            specs: [buildHparamSpec({name: 'h1'})],
            defaultFilters: new Map([
              [
                'h1',
                buildIntervalFilter({
                  minValue: 0.5,
                  maxValue: 0.7,
                }),
              ],
            ]),
          }),
          metric: buildMetric({
            specs: [buildMetricSpec({tag: 'm1'})],
            defaultFilters: new Map([
              [
                'm1',
                buildIntervalFilter({
                  minValue: 0.5,
                  maxValue: 0.5,
                }),
              ],
            ]),
          }),
        },
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

      expect(nextState.data['foo'].hparam.specs).toEqual([
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
      expect(nextState.data['foo'].hparam.defaultFilters).toEqual(
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

      expect(nextState.data['foo'].metric.specs).toEqual([
        buildMetricSpec({tag: 'm1'}),
        buildMetricSpec({tag: 'm2'}),
        buildMetricSpec({tag: 'm3'}),
      ]);
      expect(nextState.data['foo'].metric.defaultFilters).toEqual(
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
        foo: {
          hparam: buildHparam({
            specs: [buildHparamSpec({name: 'dropout'})],
            defaultFilters: new Map([['dropout', buildIntervalFilter()]]),
            filters: new Map(),
          }),
          metric: buildMetric(),
        },
      });

      const nextState = reducers(
        state,
        actions.hparamsIntervalHparamFilterChanged({
          experimentId: 'foo',
          hparamName: 'dropout',
          includeUndefined: true,
          filterLowerValue: 0.5,
          filterUpperValue: 0.5,
        })
      );

      expect(nextState.data['foo'].hparam.filters).toEqual(
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
        foo: {
          hparam: buildHparam({
            specs: [buildHparamSpec({name: 'dropout'})],
            defaultFilters: new Map([['dropout', buildIntervalFilter()]]),
            filters: new Map([
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
          metric: buildMetric(),
        },
      });

      const nextState = reducers(
        state,
        actions.hparamsIntervalHparamFilterChanged({
          experimentId: 'foo',
          hparamName: 'dropout',
          includeUndefined: true,
          filterLowerValue: 0.5,
          filterUpperValue: 0.5,
        })
      );

      expect(nextState.data['foo'].hparam.filters).toEqual(
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
      const state = buildHparamsState({
        foo: {
          hparam: buildHparam({
            specs: [buildHparamSpec({name: 'dropout'})],
            defaultFilters: new Map([['dropout', buildIntervalFilter()]]),
            filters: new Map(),
          }),
          metric: buildMetric(),
        },
      });

      const action = actions.hparamsIntervalHparamFilterChanged({
        experimentId: 'foo',
        hparamName: 'random_seed',
        includeUndefined: true,
        filterLowerValue: 0.5,
        filterUpperValue: 0.5,
      });

      expect(() => reducers(state, action)).toThrow();
    });

    it('throws when setting interval on discrete hparam', () => {
      const state = buildHparamsState({
        foo: {
          hparam: buildHparam({
            specs: [buildHparamSpec({name: 'dropout'})],
            defaultFilters: new Map([['dropout', buildDiscreteFilter()]]),
            filters: new Map(),
          }),
          metric: buildMetric(),
        },
      });

      const action = actions.hparamsIntervalHparamFilterChanged({
        experimentId: 'foo',
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
        foo: {
          hparam: buildHparam({
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
            filters: new Map(),
          }),
          metric: buildMetric(),
        },
      });

      const nextState = reducers(
        state,
        actions.hparamsDiscreteHparamFilterChanged({
          experimentId: 'foo',
          hparamName: 'dropout',
          includeUndefined: true,
          filterValues: [10, 100],
        })
      );

      expect(nextState.data['foo'].hparam.filters).toEqual(
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
        foo: {
          hparam: buildHparam({
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
            filters: new Map([
              [
                'dropout',
                buildDiscreteFilter({
                  includeUndefined: true,
                  filterValues: [2, 200],
                }),
              ],
            ]),
          }),
          metric: buildMetric(),
        },
      });

      const nextState = reducers(
        state,
        actions.hparamsDiscreteHparamFilterChanged({
          experimentId: 'foo',
          hparamName: 'dropout',
          includeUndefined: true,
          filterValues: [10, 100],
        })
      );

      expect(nextState.data['foo'].hparam.filters).toEqual(
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
        foo: {
          hparam: buildHparam({
            specs: [buildHparamSpec({name: 'dropout'})],
            defaultFilters: new Map([]),
            filters: new Map([]),
          }),
          metric: buildMetric(),
        },
      });

      const action = actions.hparamsDiscreteHparamFilterChanged({
        experimentId: 'foo',
        hparamName: 'optimizer',
        includeUndefined: true,
        filterValues: ['adam', 'adagrad'],
      });

      expect(() => reducers(state, action)).toThrow();
    });

    it('throws when setting discrete change on interval hparam', () => {
      const state = buildHparamsState({
        foo: {
          hparam: buildHparam({
            specs: [buildHparamSpec({name: 'dropout'})],
            defaultFilters: new Map([['dropout', buildIntervalFilter()]]),
            filters: new Map([['dropout', buildIntervalFilter()]]),
          }),
          metric: buildMetric(),
        },
      });

      const action = actions.hparamsDiscreteHparamFilterChanged({
        experimentId: 'foo',
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
        foo: {
          hparam: buildHparam(),
          metric: buildMetric({
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
          }),
        },
      });

      const nextState = reducers(
        state,
        actions.hparamsMetricFilterChanged({
          experimentId: 'foo',
          metricTag: 'loss',
          includeUndefined: false,
          filterLowerValue: 0.1,
          filterUpperValue: 0.5,
        })
      );

      expect(nextState.data['foo'].metric.filters).toEqual(
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
        foo: {
          hparam: buildHparam(),
          metric: buildMetric({
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
            filters: new Map([
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
        },
      });

      const nextState = reducers(
        state,
        actions.hparamsMetricFilterChanged({
          experimentId: 'foo',
          metricTag: 'loss',
          includeUndefined: false,
          filterLowerValue: 0.1,
          filterUpperValue: 0.5,
        })
      );

      expect(nextState.data['foo'].metric.filters).toEqual(
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
      const state = buildHparamsState({
        foo: {
          hparam: buildHparam(),
          metric: buildMetric({
            specs: [buildMetricSpec({tag: 'loss'})],
          }),
        },
      });

      const action = actions.hparamsMetricFilterChanged({
        experimentId: 'foo',
        metricTag: 'accuracy',
        includeUndefined: true,
        filterLowerValue: 0,
        filterUpperValue: 1,
      });
      expect(() => reducers(state, action)).toThrow();
    });
  });
});
