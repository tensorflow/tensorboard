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
import {SortType} from '../types';
import * as runsReducers from './runs_reducers';
import {MAX_NUM_RUNS_TO_ENABLE_BY_DEFAULT} from './runs_types';
import {buildRun, buildRunsState} from './testing';

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
});
