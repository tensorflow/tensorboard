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
import {deepFreeze} from '../../testing/lang';
import {DataLoadState} from '../../types/data';
import {SortDirection} from '../../types/ui';
import * as colorUtils from '../../util/colors';
import * as actions from '../actions';
import {buildHparamsAndMetadata} from '../data_source/testing';
import {DiscreteFilter, IntervalFilter, SortType} from '../types';
import * as runsReducers from './runs_reducers';
import {DomainType, MAX_NUM_RUNS_TO_ENABLE_BY_DEFAULT} from './runs_types';
import {
  buildDiscreteFilter,
  buildHparamSpec,
  buildIntervalFilter,
  buildMetricSpec,
  buildRun,
  buildRunsState,
} from './testing';

describe('runs_reducers', () => {
  [
    {
      action: actions.fetchRunsRequested,
      actionName: 'fetchRunsRequested',
      expectedStatus: DataLoadState.LOADING,
    },
    {
      action: actions.fetchRunsFailed,
      actionName: 'fetchRunsFailed',
      expectedStatus: DataLoadState.FAILED,
    },
  ].forEach((metaSpec) => {
    describe(metaSpec.actionName, () => {
      it(`sets the loadState as ${
        DataLoadState[metaSpec.expectedStatus]
      }`, () => {
        const state = buildRunsState({
          runsLoadState: {
            id1: {state: DataLoadState.LOADED, lastLoadedTimeInMs: null},
            id3: {state: DataLoadState.LOADED, lastLoadedTimeInMs: null},
          },
        });
        const nextState = runsReducers.reducers(
          state,
          metaSpec.action({
            experimentIds: ['id1', 'id2', 'id3'],
            requestedExperimentIds: ['id1', 'id2'],
          })
        );

        expect(nextState.data.runsLoadState['id1']).toEqual({
          lastLoadedTimeInMs: null,
          state: metaSpec.expectedStatus,
        });
        expect(nextState.data.runsLoadState['id2']).toEqual({
          lastLoadedTimeInMs: null,
          state: metaSpec.expectedStatus,
        });
        expect(nextState.data.runsLoadState['id3']).toEqual({
          lastLoadedTimeInMs: null,
          state: DataLoadState.LOADED,
        });
      });

      it('keeps lastLoadedTimeInMs and runs the same', () => {
        const state = deepFreeze(
          buildRunsState({
            runIds: {
              id1: ['Foo', 'Foo/bar'],
            },
            runMetadata: {
              Foo: buildRun({id: 'Foo'}),
              'Foo/bar': buildRun({id: 'Foo/bar'}),
            },
            runsLoadState: {
              id1: {state: DataLoadState.LOADED, lastLoadedTimeInMs: 12345},
            },
          })
        );
        const nextState = runsReducers.reducers(
          state,
          metaSpec.action({
            experimentIds: ['id1'],
            requestedExperimentIds: ['id1'],
          })
        );

        expect(nextState.data.runIds).toBe(state.data.runIds);
        expect(nextState.data.runMetadata).toBe(state.data.runMetadata);
        expect(nextState.data.runsLoadState['id1'].lastLoadedTimeInMs).toEqual(
          12345
        );
      });

      it('adds to new key if existing state did not have it', () => {
        const state = deepFreeze(
          buildRunsState({
            runsLoadState: {
              id1: {state: DataLoadState.LOADED, lastLoadedTimeInMs: 12345},
            },
          })
        );
        const nextState = runsReducers.reducers(
          state,
          metaSpec.action({
            experimentIds: ['id2'],
            requestedExperimentIds: ['id2'],
          })
        );

        expect(nextState.data.runsLoadState['id1'].state).toEqual(
          DataLoadState.LOADED
        );
        expect(nextState.data.runsLoadState['id2'].state).toEqual(
          metaSpec.expectedStatus
        );
      });
    });
  });

  describe('fetchRunsSucceeded', () => {
    it('updates experiment and loadState', () => {
      // Zone.js installs mock clock and gets in the way of Jasmine mockClock.
      spyOn(Date, 'now').and.returnValue(12345);
      const state = buildRunsState({
        runIds: {eid1: []},
        runIdToExpId: {rid5: 'eid5'},
        runMetadata: {},
        runsLoadState: {
          eid1: {state: DataLoadState.LOADING, lastLoadedTimeInMs: null},
        },
      });
      const action = actions.fetchRunsSucceeded({
        experimentIds: [],
        runsForAllExperiments: [],
        newRunsAndMetadata: {
          eid1: {
            runs: [
              {id: 'rid1', name: 'Run 1', startTime: 1},
              {id: 'rid2', name: 'Run 2', startTime: 1},
            ],
            metadata: buildHparamsAndMetadata({
              runToHparamsAndMetrics: {
                rid1: {hparams: [{name: 'foo', value: 'bar'}], metrics: []},
              },
            }),
          },
        },
      });

      const nextState = runsReducers.reducers(state, action);

      expect(nextState.data.runIds).toEqual({eid1: ['rid1', 'rid2']});
      expect(nextState.data.runIdToExpId).toEqual({
        rid1: 'eid1',
        rid2: 'eid1',
        rid5: 'eid5',
      });
      expect(nextState.data.runMetadata).toEqual({
        rid1: {
          id: 'rid1',
          name: 'Run 1',
          startTime: 1,
          hparams: [{name: 'foo', value: 'bar'}],
          metrics: [],
        },
        rid2: {
          id: 'rid2',
          name: 'Run 2',
          startTime: 1,
          hparams: null,
          metrics: null,
        },
      });
      expect(nextState.data.runsLoadState).toEqual({
        eid1: {state: DataLoadState.LOADED, lastLoadedTimeInMs: 12345},
      });
    });

    it('assigns default color to new runs', () => {
      spyOn(colorUtils, 'getNextChartColor').and.returnValues('#ccc', '#ddd');
      const state = buildRunsState(undefined, {
        defaultRunColor: new Map([
          ['foo', '#aaa'],
          ['bar', '#bbb'],
        ]),
      });
      const action = actions.fetchRunsSucceeded({
        experimentIds: ['eid1'],
        runsForAllExperiments: [
          buildRun({id: 'baz'}),
          buildRun({id: 'foo'}),
          buildRun({id: 'qaz'}),
        ],
        newRunsAndMetadata: {
          eid1: {
            runs: [
              buildRun({id: 'baz'}),
              buildRun({id: 'foo'}),
              buildRun({id: 'qaz'}),
            ],
            metadata: buildHparamsAndMetadata({}),
          },
        },
      });

      const nextState = runsReducers.reducers(state, action);

      expect(nextState.ui.defaultRunColor).toEqual(
        new Map([
          ['foo', '#aaa'],
          ['bar', '#bbb'],
          ['baz', '#ccc'],
          ['qaz', '#ddd'],
        ])
      );
    });

    it('selects runs if num runs are less than N', () => {
      const state = buildRunsState({selectionState: new Map()});

      const action = actions.fetchRunsSucceeded({
        experimentIds: ['id1'],
        runsForAllExperiments: [
          buildRun({id: 'baz'}),
          buildRun({id: 'foo'}),
          buildRun({id: 'qaz'}),
        ],
        newRunsAndMetadata: {
          id1: {
            runs: [
              buildRun({id: 'baz'}),
              buildRun({id: 'foo'}),
              buildRun({id: 'qaz'}),
            ],
            metadata: buildHparamsAndMetadata({}),
          },
        },
      });
      const nextState = runsReducers.reducers(state, action);

      expect(action.runsForAllExperiments.length).toBeLessThanOrEqual(
        MAX_NUM_RUNS_TO_ENABLE_BY_DEFAULT
      );
      expect(nextState.data.selectionState).toEqual(
        new Map([
          [
            '["id1"]',
            new Map([
              ['baz', true],
              ['foo', true],
              ['qaz', true],
            ]),
          ],
        ])
      );
    });

    it('sets all selectionState to false if num runs exceeded N', () => {
      const state = buildRunsState({selectionState: new Map()});

      const action = actions.fetchRunsSucceeded({
        experimentIds: ['b'],
        runsForAllExperiments: [
          ...new Array(MAX_NUM_RUNS_TO_ENABLE_BY_DEFAULT * 1.5),
        ].map((unused, index) => {
          return buildRun({id: `id1_${index}`});
        }),
        newRunsAndMetadata: {
          b: {
            runs: [...new Array(MAX_NUM_RUNS_TO_ENABLE_BY_DEFAULT * 1.5)].map(
              (unused, index) => {
                return buildRun({id: `id1_${index}`});
              }
            ),
            metadata: buildHparamsAndMetadata({}),
          },
        },
      });
      const nextState = runsReducers.reducers(state, action);

      Array.from(nextState.data.selectionState.get('["b"]')!.values()).forEach(
        (value) => {
          expect(value).toBe(false);
        }
      );
    });

    it('sets hparam and metric specs on experiment level', () => {
      const state = buildRunsState({
        hparamAndMetricSpec: {},
      });

      const action = actions.fetchRunsSucceeded({
        experimentIds: [],
        runsForAllExperiments: [],
        newRunsAndMetadata: {
          eid1: {
            runs: [],
            metadata: buildHparamsAndMetadata({
              hparamSpecs: [buildHparamSpec({name: 'hparamName'})],
              metricSpecs: [],
            }),
          },
        },
      });
      const nextState = runsReducers.reducers(state, action);

      expect(nextState.data.hparamAndMetricSpec).toEqual({
        eid1: {
          hparams: [buildHparamSpec({name: 'hparamName'})],
          metrics: [],
        },
      });
    });

    it('sets hparam and metric filter on ui state', () => {
      const state = buildRunsState(undefined, {
        hparamFilters: new Map(),
        metricFilters: new Map(),
      });

      const action = actions.fetchRunsSucceeded({
        experimentIds: [],
        runsForAllExperiments: [],
        newRunsAndMetadata: {
          eid1: {
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
      const nextState = runsReducers.reducers(state, action);

      expect(nextState.ui.hparamDefaultFilters).toEqual(
        new Map<string, DiscreteFilter | IntervalFilter>([
          [
            'h1',
            buildIntervalFilter({
              includeUndefined: true,
              minValue: 0,
              maxValue: 1,
              filterLowerValue: 0,
              filterUpperValue: 1,
            }),
          ],
          [
            'h2',
            buildDiscreteFilter({
              includeUndefined: true,
              possibleValues: ['a', 'b', 'c'],
              filterValues: ['a', 'b', 'c'],
            }),
          ],
        ])
      );
      expect(nextState.ui.metricDefaultFilters).toEqual(
        new Map([
          [
            'm1',
            buildIntervalFilter({
              includeUndefined: true,
              minValue: 0.1,
              maxValue: 1,
              filterLowerValue: 0.1,
              filterUpperValue: 1,
            }),
          ],
          [
            'm2',
            buildIntervalFilter({
              includeUndefined: true,
              minValue: 100,
              maxValue: 100,
              filterLowerValue: 100,
              filterUpperValue: 100,
            }),
          ],
          [
            'm3',
            buildIntervalFilter({
              includeUndefined: true,
              minValue: 0,
              maxValue: 0,
              filterLowerValue: 0,
              filterUpperValue: 0,
            }),
          ],
        ])
      );
    });

    it('combines hparam and metrics across experiments', () => {
      const state = buildRunsState(undefined, {
        hparamFilters: new Map(),
        metricFilters: new Map(),
      });

      const action = actions.fetchRunsSucceeded({
        experimentIds: [],
        runsForAllExperiments: [],
        newRunsAndMetadata: {
          eid1: {
            runs: [buildRun({id: 'r1'})],
            metadata: buildHparamsAndMetadata({
              runToHparamsAndMetrics: {
                r1: {
                  hparams: [],
                  metrics: [{tag: 'm1', trainingStep: 0, value: 1}],
                },
              },
              hparamSpecs: [
                buildHparamSpec({
                  name: 'h1',
                  domain: {type: DomainType.INTERVAL, minValue: 5, maxValue: 9},
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
              ],
            }),
          },
          eid2: {
            runs: [buildRun({id: 'r2'})],
            metadata: buildHparamsAndMetadata({
              runToHparamsAndMetrics: {
                r2: {
                  hparams: [],
                  metrics: [
                    {tag: 'm1', trainingStep: 1, value: 5},
                    {tag: 'm2', trainingStep: 1, value: 2},
                  ],
                },
              },
              hparamSpecs: [
                buildHparamSpec({
                  name: 'h1',
                  domain: {
                    type: DomainType.INTERVAL,
                    minValue: 0,
                    maxValue: 100,
                  },
                }),
                buildHparamSpec({
                  name: 'h2',
                  domain: {
                    type: DomainType.DISCRETE,
                    values: ['c', 'd'],
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
      const nextState = runsReducers.reducers(state, action);

      expect(nextState.ui.hparamDefaultFilters).toEqual(
        new Map<string, DiscreteFilter | IntervalFilter>([
          [
            'h1',
            buildIntervalFilter({
              includeUndefined: true,
              minValue: 0,
              maxValue: 100,
              filterLowerValue: 0,
              filterUpperValue: 100,
            }),
          ],
          [
            'h2',
            buildDiscreteFilter({
              includeUndefined: true,
              possibleValues: ['a', 'b', 'c', 'd'],
              filterValues: ['a', 'b', 'c', 'd'],
            }),
          ],
        ])
      );
      expect(nextState.ui.metricDefaultFilters).toEqual(
        new Map([
          [
            'm1',
            buildIntervalFilter({
              includeUndefined: true,
              minValue: 1,
              maxValue: 5,
              filterLowerValue: 1,
              filterUpperValue: 5,
            }),
          ],
          [
            'm2',
            buildIntervalFilter({
              includeUndefined: true,
              minValue: 2,
              maxValue: 2,
              filterLowerValue: 2,
              filterUpperValue: 2,
            }),
          ],
          [
            'm3',
            buildIntervalFilter({
              includeUndefined: true,
              minValue: 0,
              maxValue: 0,
              filterLowerValue: 0,
              filterUpperValue: 0,
            }),
          ],
        ])
      );
    });

    it('does not overwrite the filter information when result in empty', () => {
      const state = buildRunsState(undefined, {
        hparamDefaultFilters: new Map([
          [
            'conv_layers',
            buildDiscreteFilter({
              includeUndefined: true,
              possibleValues: ['a'],
              filterValues: ['a'],
            }),
          ],
        ]),
        metricFilters: new Map(),
      });

      const action = actions.fetchRunsSucceeded({
        experimentIds: [],
        runsForAllExperiments: [],
        newRunsAndMetadata: {},
      });
      const nextState = runsReducers.reducers(state, action);

      expect(nextState.ui.hparamDefaultFilters).toEqual(
        new Map([
          [
            'conv_layers',
            buildDiscreteFilter({
              includeUndefined: true,
              possibleValues: ['a'],
              filterValues: ['a'],
            }),
          ],
        ])
      );
    });
  });

  describe('runSelectionToggled', () => {
    it('toggles the run selection state for a runId', () => {
      const state = buildRunsState({
        runIds: {eid1: ['r1', 'r2']},
        selectionState: new Map([['["eid1"]', new Map([['foo', true]])]]),
      });

      const nextState = runsReducers.reducers(
        state,
        actions.runSelectionToggled({
          experimentIds: ['eid1'],
          runId: 'foo',
        })
      );

      expect(nextState.data.selectionState).toEqual(
        new Map([['["eid1"]', new Map([['foo', false]])]])
      );
    });

    it('sets true for previously un-set runId', () => {
      const state = buildRunsState({
        runIds: {eid1: ['r1', 'r2']},
        selectionState: new Map([['["eid1"]', new Map([['foo', true]])]]),
      });

      const nextState = runsReducers.reducers(
        state,
        actions.runSelectionToggled({
          experimentIds: ['eid1'],
          runId: 'bar',
        })
      );

      expect(nextState.data.selectionState).toEqual(
        new Map([
          [
            '["eid1"]',
            new Map([
              ['foo', true],
              ['bar', true],
            ]),
          ],
        ])
      );
    });
  });

  describe('runPageSelectionToggled', () => {
    it('toggles all items to on when they were all previously off', () => {
      const state = buildRunsState({
        selectionState: new Map([['["eid"]', new Map([['foo', false]])]]),
      });

      const nextState = runsReducers.reducers(
        state,
        actions.runPageSelectionToggled({
          experimentIds: ['eid'],
          runIds: ['foo', 'bar'],
        })
      );

      expect(nextState.data.selectionState).toEqual(
        new Map([
          [
            '["eid"]',
            new Map([
              ['foo', true],
              ['bar', true],
            ]),
          ],
        ])
      );
    });

    it('toggles all items to on when they were partially off', () => {
      const state = buildRunsState({
        selectionState: new Map([['["eid"]', new Map([['foo', true]])]]),
      });

      const nextState = runsReducers.reducers(
        state,
        actions.runPageSelectionToggled({
          experimentIds: ['eid'],
          runIds: ['foo', 'bar'],
        })
      );

      expect(nextState.data.selectionState).toEqual(
        new Map([
          [
            '["eid"]',
            new Map([
              ['foo', true],
              ['bar', true],
            ]),
          ],
        ])
      );
    });

    it(
      'toggles all items to on when they were partially off (bar explicitly' +
        'off)',
      () => {
        const state = buildRunsState({
          selectionState: new Map([
            [
              '["eid"]',
              new Map([
                ['foo', true],
                ['bar', false],
              ]),
            ],
          ]),
        });

        const nextState = runsReducers.reducers(
          state,
          actions.runPageSelectionToggled({
            experimentIds: ['eid'],
            runIds: ['foo', 'bar'],
          })
        );

        expect(nextState.data.selectionState).toEqual(
          new Map([
            [
              '["eid"]',
              new Map([
                ['foo', true],
                ['bar', true],
              ]),
            ],
          ])
        );
      }
    );

    it('deselects all items if they were on', () => {
      const state = buildRunsState({
        selectionState: new Map([
          [
            '["eid"]',
            new Map([
              ['foo', true],
              ['bar', true],
            ]),
          ],
        ]),
      });

      const nextState = runsReducers.reducers(
        state,
        actions.runPageSelectionToggled({
          experimentIds: ['eid'],
          runIds: ['foo', 'bar'],
        })
      );

      expect(nextState.data.selectionState).toEqual(
        new Map([
          [
            '["eid"]',
            new Map([
              ['foo', false],
              ['bar', false],
            ]),
          ],
        ])
      );
    });
  });

  describe('runsSelectAll', () => {
    it('selects all runs', () => {
      const state = buildRunsState({
        runIds: {
          e1: ['r1', 'r2'],
          e2: ['r3'],
        },
        selectionState: new Map([['["e1","e2"]', new Map([['r1', false]])]]),
      });

      const nextState = runsReducers.reducers(
        state,
        actions.runsSelectAll({
          experimentIds: ['e1', 'e2'],
        })
      );

      expect(nextState.data.selectionState).toEqual(
        new Map([
          [
            '["e1","e2"]',
            new Map([
              ['r1', true],
              ['r2', true],
              ['r3', true],
            ]),
          ],
        ])
      );
    });
  });

  describe('runSelectorPaginationOptionChanged', () => {
    it('updates the pagination option', () => {
      const state = buildRunsState(undefined, {
        paginationOption: {
          pageSize: 20,
          pageIndex: 2,
        },
      });

      const nextState = runsReducers.reducers(
        state,
        actions.runSelectorPaginationOptionChanged({
          pageSize: 10,
          pageIndex: 0,
        })
      );

      expect(nextState.ui.paginationOption).toEqual({
        pageSize: 10,
        pageIndex: 0,
      });
    });
  });

  describe('runSelectorRegexFilterChanged', () => {
    it('updates the regex filter', () => {
      const state = buildRunsState(undefined, {
        regexFilter: 'foo',
      });

      const nextState = runsReducers.reducers(
        state,
        actions.runSelectorRegexFilterChanged({regexString: 'foo rocks'})
      );

      expect(nextState.ui.regexFilter).toBe('foo rocks');
    });

    it('resets the pagination index', () => {
      const state = buildRunsState(undefined, {
        regexFilter: 'foo',
        paginationOption: {
          pageSize: 10,
          pageIndex: 100,
        },
      });

      const nextState = runsReducers.reducers(
        state,
        actions.runSelectorRegexFilterChanged({regexString: 'bar'})
      );

      expect(nextState.ui.paginationOption.pageIndex).toBe(0);
    });
  });

  describe('runSelectorSortChanged', () => {
    it('updates the sort changed', () => {
      const state = buildRunsState(undefined, {
        sort: {
          key: null,
          direction: SortDirection.UNSET,
        },
      });

      const nextState = runsReducers.reducers(
        state,
        actions.runSelectorSortChanged({
          key: {type: SortType.EXPERIMENT_NAME},
          direction: SortDirection.ASC,
        })
      );

      expect(nextState.ui.sort).toEqual({
        key: {type: SortType.EXPERIMENT_NAME},
        direction: SortDirection.ASC,
      });
    });
  });

  describe('runColorChanged', () => {
    it('updates color for the run', () => {
      const state = buildRunsState(undefined, {
        runColorOverride: new Map([['foo', '#aaa']]),
      });

      const nextState = runsReducers.reducers(
        state,
        actions.runColorChanged({
          runId: 'foo',
          newColor: '#000',
        })
      );

      expect(nextState.ui.runColorOverride).toEqual(new Map([['foo', '#000']]));
    });

    it('sets run color for a value that did not exist', () => {
      const state = buildRunsState(undefined, {
        runColorOverride: new Map([['foo', '#aaa']]),
      });

      const nextState = runsReducers.reducers(
        state,
        actions.runColorChanged({
          runId: 'bar',
          newColor: '#fff',
        })
      );

      expect(nextState.ui.runColorOverride).toEqual(
        new Map([
          ['foo', '#aaa'],
          ['bar', '#fff'],
        ])
      );
    });
  });

  describe('runIntervalHparamFilterChanged', () => {
    it('sets initial interval hparam filter', () => {
      const state = buildRunsState(undefined, {
        hparamDefaultFilters: new Map([['dropout', buildIntervalFilter()]]),
      });

      const nextState = runsReducers.reducers(
        state,
        actions.runIntervalHparamFilterChanged({
          hparamName: 'dropout',
          includeUndefined: true,
          filterLowerValue: 0.5,
          filterUpperValue: 0.5,
        })
      );

      expect(nextState.ui.hparamFilters).toEqual(
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
      const state = buildRunsState(undefined, {
        hparamDefaultFilters: new Map([['dropout', buildIntervalFilter()]]),
        hparamFilters: new Map([
          [
            'dropout',
            buildIntervalFilter({
              includeUndefined: true,
              filterLowerValue: 0.003,
              filterUpperValue: 0.5,
            }),
          ],
        ]),
      });

      const nextState = runsReducers.reducers(
        state,
        actions.runIntervalHparamFilterChanged({
          hparamName: 'dropout',
          includeUndefined: true,
          filterLowerValue: 0.5,
          filterUpperValue: 0.5,
        })
      );

      expect(nextState.ui.hparamFilters).toEqual(
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
      const state = buildRunsState(undefined, {
        hparamDefaultFilters: new Map(),
        hparamFilters: new Map([['dropout', buildIntervalFilter()]]),
      });

      const action = actions.runIntervalHparamFilterChanged({
        hparamName: 'random_seed',
        includeUndefined: true,
        filterLowerValue: 0.5,
        filterUpperValue: 0.5,
      });

      expect(() => runsReducers.reducers(state, action)).toThrow();
    });

    it('throws when setting interval on discrete hparam', () => {
      const state = buildRunsState(undefined, {
        hparamDefaultFilters: new Map([['dropout', buildDiscreteFilter()]]),
      });

      const action = actions.runIntervalHparamFilterChanged({
        hparamName: 'dropout',
        includeUndefined: true,
        filterLowerValue: 0.5,
        filterUpperValue: 0.5,
      });

      expect(() => runsReducers.reducers(state, action)).toThrow();
    });
  });

  describe('runDiscreteHparamFilterChanged', () => {
    it('sets initial discrete hparam filter', () => {
      const state = buildRunsState(undefined, {
        hparamDefaultFilters: new Map([
          [
            'dropout',
            buildDiscreteFilter({
              includeUndefined: true,
              filterValues: [1, 10, 100],
            }),
          ],
        ]),
      });

      const nextState = runsReducers.reducers(
        state,
        actions.runDiscreteHparamFilterChanged({
          hparamName: 'dropout',
          includeUndefined: true,
          filterValues: [10, 100],
        })
      );

      expect(nextState.ui.hparamFilters).toEqual(
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
      const state = buildRunsState(undefined, {
        hparamDefaultFilters: new Map([
          [
            'dropout',
            buildDiscreteFilter({
              includeUndefined: true,
              filterValues: [1, 10, 100],
            }),
          ],
        ]),
        hparamFilters: new Map([
          [
            'dropout',
            buildDiscreteFilter({
              includeUndefined: true,
              filterValues: [2, 200],
            }),
          ],
        ]),
      });

      const nextState = runsReducers.reducers(
        state,
        actions.runDiscreteHparamFilterChanged({
          hparamName: 'dropout',
          includeUndefined: true,
          filterValues: [10, 100],
        })
      );

      expect(nextState.ui.hparamFilters).toEqual(
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
      const state = buildRunsState(undefined, {
        hparamDefaultFilters: new Map(),
      });

      const action = actions.runDiscreteHparamFilterChanged({
        hparamName: 'optimizer',
        includeUndefined: true,
        filterValues: ['adam', 'adagrad'],
      });

      expect(() => runsReducers.reducers(state, action)).toThrow();
    });

    it('throws when setting discrete change on interval hparam', () => {
      const state = buildRunsState(undefined, {
        hparamDefaultFilters: new Map([['dropout', buildIntervalFilter()]]),
        hparamFilters: new Map([['dropout', buildIntervalFilter()]]),
      });

      const action = actions.runDiscreteHparamFilterChanged({
        hparamName: 'dropout',
        includeUndefined: true,
        filterValues: ['adam', 'adagrad'],
      });

      expect(() => runsReducers.reducers(state, action)).toThrow();
    });
  });

  describe('runMetricFilterChanged', () => {
    it('sets initial metric filters', () => {
      const state = buildRunsState(undefined, {
        metricDefaultFilters: new Map([
          [
            'loss',
            buildIntervalFilter({
              includeUndefined: true,
              filterLowerValue: 0.2,
              filterUpperValue: 0.5,
            }),
          ],
        ]),
      });

      const nextState = runsReducers.reducers(
        state,
        actions.runMetricFilterChanged({
          metricTag: 'loss',
          includeUndefined: false,
          filterLowerValue: 0.1,
          filterUpperValue: 0.5,
        })
      );

      expect(nextState.ui.metricFilters).toEqual(
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
      const state = buildRunsState(undefined, {
        metricDefaultFilters: new Map([['loss', buildIntervalFilter()]]),
        metricFilters: new Map([
          [
            'loss',
            buildIntervalFilter({
              includeUndefined: true,
              filterLowerValue: 0.2,
              filterUpperValue: 0.5,
            }),
          ],
        ]),
      });

      const nextState = runsReducers.reducers(
        state,
        actions.runMetricFilterChanged({
          metricTag: 'loss',
          includeUndefined: false,
          filterLowerValue: 0.1,
          filterUpperValue: 0.5,
        })
      );

      expect(nextState.ui.metricFilters).toEqual(
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
      const state = buildRunsState(undefined, {
        metricDefaultFilters: new Map([['loss', buildIntervalFilter()]]),
        metricFilters: new Map([['loss', buildIntervalFilter()]]),
      });

      const action = actions.runMetricFilterChanged({
        metricTag: 'accuracy',
        includeUndefined: true,
        filterLowerValue: 0,
        filterUpperValue: 1,
      });
      expect(() => runsReducers.reducers(state, action)).toThrow();
    });
  });
});
