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
import {buildHparamSpec, buildHparamsState} from './testing';
import {ColumnHeaderType, Side} from '../../widgets/data_table/types';
import {persistentSettingsLoaded} from '../../persistent_settings';
import {dataTableUtils} from '../../widgets/data_table/utils';

describe('hparams/_redux/hparams_reducers_test', () => {
  describe('#persistentSettingsLoaded', () => {
    it('loads dashboardDisplayedHparamColumns from the persistent settings storage', () => {
      const state = buildHparamsState({
        dashboardDisplayedHparamColumns: [],
      });
      const state2 = reducers(
        state,
        persistentSettingsLoaded({
          partialSettings: {
            dashboardDisplayedHparamColumns: [
              {
                type: ColumnHeaderType.HPARAM,
                name: 'conv_layers',
                displayName: 'Conv Layers',
                enabled: true,
              },
              {
                type: ColumnHeaderType.HPARAM,
                name: 'conv_kernel_size',
                displayName: 'Conv Kernel Size',
                enabled: true,
              },
            ],
          },
        })
      );

      expect(state2.dashboardDisplayedHparamColumns).toEqual([
        {
          type: ColumnHeaderType.HPARAM,
          name: 'conv_layers',
          displayName: 'Conv Layers',
          enabled: true,
        },
        {
          type: ColumnHeaderType.HPARAM,
          name: 'conv_kernel_size',
          displayName: 'Conv Kernel Size',
          enabled: true,
        },
      ]);
    });

    it('does nothing if persistent settings does not contain dashboardDisplayedHparamColumns', () => {
      const state = buildHparamsState({
        dashboardDisplayedHparamColumns: [
          {
            type: ColumnHeaderType.HPARAM,
            name: 'conv_layers',
            displayName: 'Conv Layers',
            enabled: true,
          },
        ],
      });
      const state2 = reducers(
        state,
        persistentSettingsLoaded({
          partialSettings: {},
        })
      );

      expect(state2.dashboardDisplayedHparamColumns).toEqual([
        {
          type: ColumnHeaderType.HPARAM,
          name: 'conv_layers',
          displayName: 'Conv Layers',
          enabled: true,
        },
      ]);
    });
  });

  describe('hparamsFetchSessionGroupsSucceeded', () => {
    it('saves action.hparamSpecs as dashboardHparamSpecs', () => {
      const state = buildHparamsState({
        dashboardHparamSpecs: [],
      });
      const state2 = reducers(
        state,
        actions.hparamsFetchSessionGroupsSucceeded({
          hparamSpecs: [buildHparamSpec({name: 'foo'})],
          sessionGroups: [],
        })
      );

      expect(state2.dashboardHparamSpecs).toEqual([
        buildHparamSpec({name: 'foo'}),
      ]);
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
          hparamSpecs: [],
          sessionGroups: [mockSessionGroup],
        })
      );

      expect(state2.dashboardSessionGroups).toEqual([mockSessionGroup]);
    });

    it('calculates numDashboardHparamsLoaded from action.hparamSpecs', () => {
      const state = buildHparamsState({
        numDashboardHparamsLoaded: 0,
      });
      const state2 = reducers(
        state,
        actions.hparamsFetchSessionGroupsSucceeded({
          hparamSpecs: [
            buildHparamSpec(),
            buildHparamSpec(),
            buildHparamSpec(),
          ],
          sessionGroups: [],
        })
      );

      expect(state2.numDashboardHparamsLoaded).toEqual(3);
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

  describe('dashboardHparamColumnAdded', () => {
    const fakeColumns = [
      {
        type: ColumnHeaderType.HPARAM,
        name: 'conv_layers',
        displayName: 'Conv Layers',
        enabled: true,
      },
      {
        type: ColumnHeaderType.HPARAM,
        name: 'conv_kernel_size',
        displayName: 'Conv Kernel Size',
        enabled: true,
      },
      {
        type: ColumnHeaderType.HPARAM,
        name: 'dense_layers',
        displayName: 'Dense Layers',
        enabled: true,
      },
      {
        type: ColumnHeaderType.HPARAM,
        name: 'dropout',
        displayName: 'Dropout',
        enabled: true,
      },
    ];

    it('appends an hparam column to the end', () => {
      const state = buildHparamsState({
        dashboardDisplayedHparamColumns: fakeColumns,
      });
      const state2 = reducers(
        state,
        actions.dashboardHparamColumnAdded({
          column: {
            type: ColumnHeaderType.HPARAM,
            name: 'dense_layers',
            displayName: 'Dense Layers',
            enabled: true,
          },
        })
      );

      expect(state2.dashboardDisplayedHparamColumns).toEqual([
        ...fakeColumns,
        {
          type: ColumnHeaderType.HPARAM,
          name: 'dense_layers',
          displayName: 'Dense Layers',
          enabled: true,
        },
      ]);
    });

    [
      {
        testDesc: 'to the left',
        side: Side.LEFT,
        expectedResult: [
          {
            type: ColumnHeaderType.HPARAM,
            name: 'dense_layers',
            displayName: 'Dense Layers',
            enabled: true,
          },
          ...fakeColumns,
        ],
      },
      {
        testDesc: 'to the right',
        side: Side.RIGHT,
        expectedResult: [
          fakeColumns[0],
          {
            type: ColumnHeaderType.HPARAM,
            name: 'dense_layers',
            displayName: 'Dense Layers',
            enabled: true,
          },
          ...fakeColumns.slice(1),
        ],
      },
    ].forEach(({testDesc, side, expectedResult}) => {
      it(`inserts an hparam column ${testDesc} of an existing column`, () => {
        const state = buildHparamsState({
          dashboardDisplayedHparamColumns: fakeColumns,
        });
        const state2 = reducers(
          state,
          actions.dashboardHparamColumnAdded({
            column: {
              type: ColumnHeaderType.HPARAM,
              name: 'dense_layers',
              displayName: 'Dense Layers',
              enabled: true,
            },
            nextTo: {
              type: ColumnHeaderType.HPARAM,
              name: 'conv_layers',
              displayName: 'Conv Layers',
              enabled: true,
            },
            side,
          })
        );

        expect(state2.dashboardDisplayedHparamColumns).toEqual(expectedResult);
      });
    });

    it('appends an hparam column at the end if nextTo is not found', () => {
      const state = buildHparamsState({
        dashboardDisplayedHparamColumns: fakeColumns,
      });
      const state2 = reducers(
        state,
        actions.dashboardHparamColumnAdded({
          column: {
            type: ColumnHeaderType.HPARAM,
            name: 'dense_layers',
            displayName: 'Dense Layers',
            enabled: true,
          },
          nextTo: {
            type: ColumnHeaderType.HPARAM,
            name: 'nonexistent_layer',
            displayName: 'Nonexistent layer',
            enabled: true,
          },
          side: Side.RIGHT,
        })
      );

      expect(state2.dashboardDisplayedHparamColumns).toEqual([
        ...fakeColumns,
        {
          type: ColumnHeaderType.HPARAM,
          name: 'dense_layers',
          displayName: 'Dense Layers',
          enabled: true,
        },
      ]);
    });
  });

  describe('dashboardHparamColumnRemoved', () => {
    it('removes an existing column', () => {
      const state = buildHparamsState({
        dashboardDisplayedHparamColumns: [
          {
            type: ColumnHeaderType.HPARAM,
            name: 'conv_layers',
            displayName: 'Conv Layers',
            enabled: true,
          },
          {
            type: ColumnHeaderType.HPARAM,
            name: 'conv_kernel_size',
            displayName: 'Conv Kernel Size',
            enabled: true,
          },
        ],
      });
      const state2 = reducers(
        state,
        actions.dashboardHparamColumnRemoved({
          column: {
            type: ColumnHeaderType.HPARAM,
            name: 'conv_layers',
            displayName: 'Conv Layers',
            enabled: true,
          },
        })
      );

      expect(state2.dashboardDisplayedHparamColumns).toEqual([
        {
          type: ColumnHeaderType.HPARAM,
          name: 'conv_kernel_size',
          displayName: 'Conv Kernel Size',
          enabled: true,
        },
      ]);
    });
  });

  describe('dashboardHparamColumnToggled', () => {
    it('enables a disabled column', () => {
      const state = buildHparamsState({
        dashboardDisplayedHparamColumns: [
          {
            type: ColumnHeaderType.HPARAM,
            name: 'conv_layers',
            displayName: 'Conv Layers',
            enabled: false,
          },
        ],
      });
      const state2 = reducers(
        state,
        actions.dashboardHparamColumnToggled({
          column: {
            type: ColumnHeaderType.HPARAM,
            name: 'conv_layers',
            displayName: 'Conv Layers',
            enabled: false,
          },
        })
      );

      expect(state2.dashboardDisplayedHparamColumns).toEqual([
        {
          type: ColumnHeaderType.HPARAM,
          name: 'conv_layers',
          displayName: 'Conv Layers',
          enabled: true,
        },
      ]);
    });

    it('disables an enabled column', () => {
      const state = buildHparamsState({
        dashboardDisplayedHparamColumns: [
          {
            type: ColumnHeaderType.HPARAM,
            name: 'conv_layers',
            displayName: 'Conv Layers',
            enabled: true,
          },
        ],
      });
      const state2 = reducers(
        state,
        actions.dashboardHparamColumnToggled({
          column: {
            type: ColumnHeaderType.HPARAM,
            name: 'conv_layers',
            displayName: 'Conv Layers',
            enabled: true,
          },
        })
      );

      expect(state2.dashboardDisplayedHparamColumns).toEqual([
        {
          type: ColumnHeaderType.HPARAM,
          name: 'conv_layers',
          displayName: 'Conv Layers',
          enabled: false,
        },
      ]);
    });
  });

  describe('dashboardHparamColumnOrderChanged', () => {
    const fakeColumns = [
      {
        type: ColumnHeaderType.HPARAM,
        name: 'conv_layers',
        displayName: 'Conv Layers',
        enabled: true,
      },
      {
        type: ColumnHeaderType.HPARAM,
        name: 'conv_kernel_size',
        displayName: 'Conv Kernel Size',
        enabled: true,
      },
      {
        type: ColumnHeaderType.HPARAM,
        name: 'dense_layers',
        displayName: 'Dense Layers',
        enabled: true,
      },
      {
        type: ColumnHeaderType.HPARAM,
        name: 'dropout',
        displayName: 'Dropout',
        enabled: true,
      },
    ];

    it('moves source to destination using moveColumn', () => {
      const state = buildHparamsState({
        dashboardDisplayedHparamColumns: fakeColumns,
      });
      const moveColumnSpy = spyOn(
        dataTableUtils,
        'moveColumn'
      ).and.callThrough();

      const state2 = reducers(
        state,
        actions.dashboardHparamColumnOrderChanged({
          source: fakeColumns[1],
          destination: fakeColumns[0],
          side: Side.LEFT,
        })
      );

      // Edge cases are tested by moveColumn tests.
      expect(moveColumnSpy).toHaveBeenCalledWith(
        fakeColumns,
        fakeColumns[1],
        fakeColumns[0],
        Side.LEFT
      );
      expect(state2.dashboardDisplayedHparamColumns).toEqual([
        fakeColumns[1],
        fakeColumns[0],
        ...fakeColumns.slice(2),
      ]);
    });
  });

  describe('loadAllDashboardHparams', () => {
    it('sets numDashboardHparamsToLoad to 0', () => {
      const state = buildHparamsState({
        numDashboardHparamsToLoad: 1000,
      });

      const state2 = reducers(state, actions.loadAllDashboardHparams());

      expect(state2.numDashboardHparamsToLoad).toEqual(0);
    });
  });
});
