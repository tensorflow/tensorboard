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

import {DomainType, RunStatus} from '../types';
import * as actions from './hparams_actions';
import {reducers} from './hparams_reducers';
import {buildHparamSpec, buildHparamsState, buildMetricSpec} from './testing';

describe('hparams/_redux/hparams_reducers_test', () => {
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
        hparams: new Map(),
        metrics: new Map([
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
      });
    });
  });
});
