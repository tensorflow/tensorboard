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
} from '../../app_routing/store/testing';
import {RouteKind} from '../../app_routing/types';
import {
  buildSessionGroup,
  buildStateFromHparamsState,
  buildHparamsState,
  buildHparamSpec,
} from '../../hparams/testing';
import {buildMockState} from '../../testing/utils';
import {State} from '../../app_state';
import {DataLoadState} from '../../types/data';
import {ColumnHeaderType, SortingOrder} from '../../widgets/data_table/types';
import {GroupByKey} from '../types';
import * as selectors from './runs_selectors';
import {buildRun, buildRunsState, buildStateFromRunsState} from './testing';

describe('runs_selectors', () => {
  describe('#getRunIdToExperimentId', () => {
    beforeEach(() => {
      // Clear the memoization.
      selectors.getRunIdToExperimentId.release();
    });

    it('returns runIdToExpId', () => {
      const state = buildMockState({
        ...buildStateFromRunsState(
          buildRunsState({
            runIdToExpId: {
              run1: 'eid1',
              run2: 'eid1',
              run3: 'eid2',
            },
          })
        ),
      });
      expect(selectors.getRunIdToExperimentId(state)).toEqual({
        run1: 'eid1',
        run2: 'eid1',
        run3: 'eid2',
      });
    });
  });
  describe('#getExperimentIdForRunId', () => {
    beforeEach(() => {
      // Clear the memoization.
      selectors.getExperimentIdForRunId.release();
    });

    it('returns eid', () => {
      const state = buildMockState({
        ...buildStateFromRunsState(
          buildRunsState({
            runIdToExpId: {
              run1: 'eid1',
              run2: 'eid1',
              run3: 'eid2',
            },
          })
        ),
      });
      expect(
        selectors.getExperimentIdForRunId(state, {
          runId: 'run1',
        })
      ).toBe('eid1');
      expect(
        selectors.getExperimentIdForRunId(state, {
          runId: 'run2',
        })
      ).toBe('eid1');
      expect(
        selectors.getExperimentIdForRunId(state, {
          runId: 'run3',
        })
      ).toBe('eid2');
    });

    it('returns `null` if the runId is unknown', () => {
      const state = buildMockState({
        ...buildStateFromRunsState(
          buildRunsState({
            runIdToExpId: {run1: 'eid1'},
          })
        ),
      });
      expect(
        selectors.getExperimentIdForRunId(state, {
          runId: 'run4',
        })
      ).toBe(null);
    });
  });

  describe('#getRun', () => {
    beforeEach(() => {
      // Clear the memoization.
      selectors.getRun.release();
    });

    it('returns run', () => {
      const state = buildMockState({
        ...buildStateFromRunsState(
          buildRunsState({
            runMetadata: {
              run1: buildRun({id: 'run1'}),
            },
          })
        ),
      });

      expect(selectors.getRun(state, {runId: 'run1'})).toEqual(
        buildRun({
          id: 'run1',
        })
      );
    });

    it('returns `null` if run with `runId` does not exist', () => {
      const state = buildMockState({
        ...buildStateFromRunsState(
          buildRunsState({
            runMetadata: {
              run1: buildRun({id: 'run1'}),
            },
          })
        ),
      });

      expect(selectors.getRun(state, {runId: 'run10'})).toBe(null);
    });
  });

  describe('#getRuns', () => {
    beforeEach(() => {
      // Clear the memoization.
      selectors.getRuns.release();
    });

    it('returns runs', () => {
      const state = buildMockState({
        ...buildStateFromRunsState(
          buildRunsState({
            runIds: {
              eid: ['run1'],
            },
            runMetadata: {
              run1: buildRun({id: 'run1'}),
            },
          })
        ),
      });
      expect(selectors.getRuns(state, {experimentId: 'eid'})).toEqual([
        buildRun({
          id: 'run1',
        }),
      ]);
    });

    it('returns runs for the ones that has metadata', () => {
      const state = buildMockState({
        ...buildStateFromRunsState(
          buildRunsState({
            runIds: {
              eid: ['run1', 'run2'],
            },
            runMetadata: {
              run1: buildRun({id: 'run1'}),
            },
          })
        ),
      });
      expect(selectors.getRuns(state, {experimentId: 'eid'})).toEqual([
        buildRun({
          id: 'run1',
        }),
      ]);
    });

    it('returns empty list if experiment id does not exist', () => {
      const state = buildMockState();
      expect(
        selectors.getRuns(state, {
          experimentId: 'i_do_not_exist',
        })
      ).toEqual([]);
    });
  });

  describe('#getDashboardRunsToHparams', () => {
    it('matches run with its session', () => {
      const state = buildMockState({
        ...buildStateFromAppRoutingState(
          buildAppRoutingState({
            activeRoute: {
              routeKind: RouteKind.EXPERIMENT,
              params: {experimentId: '123'},
            },
          })
        ),
        ...buildStateFromHparamsState(
          buildHparamsState({
            dashboardSessionGroups: [
              buildSessionGroup({
                name: 'MySessionGroup',
                sessions: [{name: 'session1'}],
                hparams: {
                  hparam1: 'value1',
                  hparam2: 'value2',
                  hparam3: 'value3',
                },
              }),
            ],
          })
        ),
        ...buildStateFromRunsState(
          buildRunsState({
            runIds: {
              123: ['session1/run1'],
            },
          })
        ),
      });
      expect(selectors.getDashboardRunsToHparams(state)).toEqual({
        'session1/run1': {
          hparams: [
            {name: 'hparam1', value: 'value1'},
            {name: 'hparam2', value: 'value2'},
            {name: 'hparam3', value: 'value3'},
          ],
          metrics: [],
        },
      });
    });

    it('matches multiple experiments, multiple sessions, multiple runs', () => {
      const state = buildMockState({
        ...buildStateFromAppRoutingState(
          buildAppRoutingState({
            activeRoute: {
              routeKind: RouteKind.COMPARE_EXPERIMENT,
              params: {experimentIds: 'exp1:123,exp2:456,exp3:789'},
            },
          })
        ),
        ...buildStateFromHparamsState(
          buildHparamsState({
            dashboardSessionGroups: [
              buildSessionGroup({
                name: 'SessionGroup1',
                sessions: [{name: 's1'}],
                hparams: {hparam: 'value1'},
              }),
              buildSessionGroup({
                name: 'SessionGroup2',
                sessions: [{name: 's2'}],
                hparams: {hparam: 'value2'},
              }),
              buildSessionGroup({
                name: 'SessionGrup3',
                sessions: [{name: 's3'}, {name: 's4'}, {name: 's5'}],
                hparams: {hparam: 'value3'},
              }),
            ],
          })
        ),
        ...buildStateFromRunsState(
          buildRunsState({
            runIds: {
              123: ['s2/run1', 's2/run2'],
              456: ['s1/run1', 's3/run1', 's4/run1', 's4/run2', 's5/run1'],
              // One experiment has a run that does not match any of the
              // sessions and, so, is not included in the result.
              789: ['does_not_match'],
              // Additional experiment's runs are not included in the result.
              AAA: ['s1/run1'],
            },
          })
        ),
      });
      expect(selectors.getDashboardRunsToHparams(state)).toEqual({
        's2/run1': {
          hparams: [{name: 'hparam', value: 'value2'}],
          metrics: [],
        },
        's2/run2': {
          hparams: [{name: 'hparam', value: 'value2'}],
          metrics: [],
        },
        's1/run1': {
          hparams: [{name: 'hparam', value: 'value1'}],
          metrics: [],
        },
        's3/run1': {
          hparams: [{name: 'hparam', value: 'value3'}],
          metrics: [],
        },
        's4/run1': {
          hparams: [{name: 'hparam', value: 'value3'}],
          metrics: [],
        },
        's4/run2': {
          hparams: [{name: 'hparam', value: 'value3'}],
          metrics: [],
        },
        's5/run1': {
          hparams: [{name: 'hparam', value: 'value3'}],
          metrics: [],
        },
      });
    });

    it('matches all to empty session name', () => {
      const state = buildMockState({
        ...buildStateFromAppRoutingState(
          buildAppRoutingState({
            activeRoute: {
              routeKind: RouteKind.EXPERIMENT,
              params: {experimentId: '123'},
            },
          })
        ),
        ...buildStateFromHparamsState(
          buildHparamsState({
            dashboardSessionGroups: [
              buildSessionGroup({
                name: 'MySessionGroup',
                sessions: [{name: ''}],
                hparams: {hparam1: 'value1'},
              }),
            ],
          })
        ),
        ...buildStateFromRunsState(
          buildRunsState({
            runIds: {
              123: ['run1', 's/run2', 'run1/train'],
            },
          })
        ),
      });
      expect(selectors.getDashboardRunsToHparams(state)).toEqual({
        run1: {
          hparams: [{name: 'hparam1', value: 'value1'}],
          metrics: [],
        },
        's/run2': {
          hparams: [{name: 'hparam1', value: 'value1'}],
          metrics: [],
        },
        'run1/train': {
          hparams: [{name: 'hparam1', value: 'value1'}],
          metrics: [],
        },
      });
    });

    it('matches exact matches', () => {
      const state = buildMockState({
        ...buildStateFromAppRoutingState(
          buildAppRoutingState({
            activeRoute: {
              routeKind: RouteKind.COMPARE_EXPERIMENT,
              params: {experimentIds: 'exp1:123,exp2:456'},
            },
          })
        ),
        ...buildStateFromHparamsState(
          buildHparamsState({
            dashboardSessionGroups: [
              buildSessionGroup({
                name: 'SessionGroup1',
                sessions: [{name: 's1'}],
                hparams: {hparam: 'value1'},
              }),
              buildSessionGroup({
                name: 'SessionGroup2',
                sessions: [{name: 's2'}],
                hparams: {hparam: 'value2'},
              }),
            ],
          })
        ),
        ...buildStateFromRunsState(
          buildRunsState({
            runIds: {
              123: ['s1', 's1/train', 's1/validate'],
              456: ['s2', 's2/train', 's2/validate'],
            },
          })
        ),
      });
      expect(selectors.getDashboardRunsToHparams(state)).toEqual({
        s1: {
          hparams: [{name: 'hparam', value: 'value1'}],
          metrics: [],
        },
        's1/train': {
          hparams: [{name: 'hparam', value: 'value1'}],
          metrics: [],
        },
        's1/validate': {
          hparams: [{name: 'hparam', value: 'value1'}],
          metrics: [],
        },
        s2: {
          hparams: [{name: 'hparam', value: 'value2'}],
          metrics: [],
        },
        's2/train': {
          hparams: [{name: 'hparam', value: 'value2'}],
          metrics: [],
        },
        's2/validate': {
          hparams: [{name: 'hparam', value: 'value2'}],
          metrics: [],
        },
      });
    });

    it('matches with longest overlapping session name', () => {
      const state = buildMockState({
        ...buildStateFromAppRoutingState(
          buildAppRoutingState({
            activeRoute: {
              routeKind: RouteKind.COMPARE_EXPERIMENT,
              params: {experimentIds: 'exp1:123,exp2:456'},
            },
          })
        ),
        ...buildStateFromHparamsState(
          buildHparamsState({
            dashboardSessionGroups: [
              buildSessionGroup({
                name: 'SessionGroup1',
                sessions: [{name: 's11'}],
                hparams: {hparam: 'value1'},
              }),
              buildSessionGroup({
                name: 'SessionGroup2',
                sessions: [{name: 's'}],
                hparams: {hparam: 'value2'},
              }),
              buildSessionGroup({
                name: 'SessionGroup2',
                sessions: [{name: 's1'}],
                hparams: {hparam: 'value3'},
              }),
            ],
          })
        ),
        ...buildStateFromRunsState(
          buildRunsState({
            runIds: {
              123: ['s/train', 's11/train', 's12/train'],
            },
          })
        ),
      });
      expect(selectors.getDashboardRunsToHparams(state)).toEqual({
        's/train': {
          hparams: [{name: 'hparam', value: 'value2'}],
          metrics: [],
        },
        's11/train': {
          hparams: [{name: 'hparam', value: 'value1'}],
          metrics: [],
        },
        's12/train': {
          hparams: [{name: 'hparam', value: 'value3'}],
          metrics: [],
        },
      });
    });
  });

  describe('#getRunToHparamMap', () => {
    it('returns a map from run id to hparam name to hparam value', () => {
      const state = buildMockState({
        ...buildStateFromAppRoutingState(
          buildAppRoutingState({
            activeRoute: {
              routeKind: RouteKind.COMPARE_EXPERIMENT,
              params: {experimentIds: 'exp1:123,exp2:456,exp3:789'},
            },
          })
        ),
        ...buildStateFromHparamsState(
          buildHparamsState({
            dashboardSessionGroups: [
              buildSessionGroup({
                name: 'SessionGroup1',
                sessions: [{name: 's1'}],
                hparams: {hparam: 'value1'},
              }),
              buildSessionGroup({
                name: 'SessionGroup2',
                sessions: [{name: 's2'}],
                hparams: {hparam: 'value2'},
              }),
              buildSessionGroup({
                name: 'SessionGrup3',
                sessions: [{name: 's3'}, {name: 's4'}, {name: 's5'}],
                hparams: {hparam: 'value3'},
              }),
            ],
          })
        ),
        ...buildStateFromRunsState(
          buildRunsState({
            runIds: {
              123: ['s2/run1', 's2/run2'],
              456: ['s1/run1', 's3/run1', 's4/run1', 's4/run2', 's5/run1'],
              // One experiment has a run that does not match any of the
              // sessions and, so, is not included in the result.
              789: ['does_not_match'],
              // Additional experiment's runs are not included in the result.
              AAA: ['s1/run1'],
            },
          })
        ),
      });

      expect(selectors.getRunToHparamMap(state)).toEqual({
        's2/run1': new Map([['hparam', 'value2']]),
        's2/run2': new Map([['hparam', 'value2']]),
        's1/run1': new Map([['hparam', 'value1']]),
        's3/run1': new Map([['hparam', 'value3']]),
        's4/run1': new Map([['hparam', 'value3']]),
        's4/run2': new Map([['hparam', 'value3']]),
        's5/run1': new Map([['hparam', 'value3']]),
      });
    });
  });

  describe('#getDashboardRuns', () => {
    it('returns runs', () => {
      const state = buildMockState({
        ...buildStateFromAppRoutingState(
          buildAppRoutingState({
            activeRoute: {
              routeKind: RouteKind.EXPERIMENT,
              params: {experimentId: 'eid'},
            },
          })
        ),
        ...buildStateFromRunsState(
          buildRunsState({
            runIds: {
              eid: ['run1'],
            },
            runMetadata: {
              run1: buildRun({id: 'run1'}),
            },
          })
        ),
      });
      expect(selectors.getDashboardRuns(state)).toEqual([
        {
          ...buildRun({
            id: 'run1',
          }),
          experimentId: 'eid',
        },
      ]);
    });

    it('returns runs that have metadata', () => {
      const state = buildMockState({
        ...buildStateFromAppRoutingState(
          buildAppRoutingState({
            activeRoute: {
              routeKind: RouteKind.EXPERIMENT,
              params: {experimentId: 'eid'},
            },
          })
        ),
        ...buildStateFromRunsState(
          buildRunsState({
            runIds: {
              eid: ['run1', 'run2'],
            },
            runMetadata: {
              run1: buildRun({id: 'run1'}),
            },
          })
        ),
      });
      expect(selectors.getDashboardRuns(state)).toEqual([
        {
          ...buildRun({
            id: 'run1',
          }),
          experimentId: 'eid',
        },
      ]);
    });

    it('returns empty list if experiment id does not exist', () => {
      const state = buildMockState(
        buildStateFromAppRoutingState(
          buildAppRoutingState({
            activeRoute: {
              routeKind: RouteKind.EXPERIMENTS,
              params: {},
            },
          })
        )
      );
      expect(selectors.getDashboardRuns(state)).toEqual([]);
    });

    it('includes dashboard hparams data', () => {
      const state = buildMockState({
        ...buildStateFromAppRoutingState(
          buildAppRoutingState({
            activeRoute: {
              routeKind: RouteKind.EXPERIMENT,
              params: {experimentId: 'eid'},
            },
          })
        ),
        ...buildStateFromRunsState(
          buildRunsState({
            runIds: {
              eid: ['run1', 'run2'],
            },
            runMetadata: {
              run1: buildRun({id: 'run1'}),
            },
          })
        ),
        ...buildStateFromHparamsState(
          buildHparamsState({
            dashboardSessionGroups: [
              buildSessionGroup({
                name: 'some_session_group',
                hparams: {hp1: 'foo', hp2: 'bar'},
                sessions: [
                  {
                    name: 'run1',
                    metricValues: [],
                  } as any,
                ],
              }),
            ],
          })
        ),
      });
      expect(selectors.getDashboardRuns(state)).toEqual([
        {
          ...buildRun({
            id: 'run1',
            hparams: [
              {name: 'hp1', value: 'foo'},
              {name: 'hp2', value: 'bar'},
            ],
            metrics: [],
          }),
          experimentId: 'eid',
        },
      ]);
    });

    it('never returns hparams or metric data from run metadata', () => {
      const state = buildMockState({
        ...buildStateFromAppRoutingState(
          buildAppRoutingState({
            activeRoute: {
              routeKind: RouteKind.EXPERIMENT,
              params: {experimentId: 'eid'},
            },
          })
        ),
        ...buildStateFromRunsState(
          buildRunsState({
            runIds: {
              eid: ['run1', 'run2'],
            },
            runMetadata: {
              run1: buildRun({
                id: 'run1',
                hparams: [{name: 'foo', value: '1'}],
                metrics: [{tag: 'm1', value: 4}],
              }),
            },
          })
        ),
      });

      const response = selectors.getDashboardRuns(state)[0];
      expect(response.hparams).toBeNull();
      expect(response.metrics).toBeNull();
    });
  });

  describe('#getRunIdsForExperiment', () => {
    beforeEach(() => {
      // Clear the memoization.
      selectors.getRunIdsForExperiment.release();
    });

    it('returns runIds', () => {
      const state = buildMockState({
        ...buildStateFromRunsState(
          buildRunsState({
            runIds: {
              eid: ['run1', 'run2'],
            },
          })
        ),
      });
      expect(
        selectors.getRunIdsForExperiment(state, {experimentId: 'eid'})
      ).toEqual(['run1', 'run2']);
    });

    it('returns empty list if experiment id does not exist', () => {
      const state = buildMockState();
      expect(
        selectors.getRunIdsForExperiment(state, {
          experimentId: 'i_do_not_exist',
        })
      ).toEqual([]);
    });
  });

  describe('#getRunMap', () => {
    beforeEach(() => {
      // Clear the memoization.
      selectors.getRunMap.release();
    });

    it('returns a map from RunId to Run', () => {
      const state = buildMockState({
        ...buildStateFromRunsState(
          buildRunsState({
            runMetadata: {
              run1: buildRun({id: 'run1'}),
              run2: buildRun({id: 'run2'}),
            },
          })
        ),
      });

      expect(selectors.getRunMap(state)).toEqual(
        new Map([
          ['run1', buildRun({id: 'run1'})],
          ['run2', buildRun({id: 'run2'})],
        ])
      );
    });

    it('returns an empty map if there are no runs', () => {
      const state = buildMockState({
        ...buildStateFromRunsState(
          buildRunsState({
            runMetadata: {},
          })
        ),
      });

      expect(selectors.getRunMap(state)).toEqual(new Map());
    });
  });

  describe('#getRunsLoadState', () => {
    beforeEach(() => {
      // Clear the memoization.
      selectors.getRunsLoadState.release();
    });

    it('returns loadState', () => {
      const loadState = {
        state: DataLoadState.FAILED,
        lastLoadedTimeInMs: 1337,
      };

      const state = buildMockState({
        ...buildStateFromRunsState(
          buildRunsState({runsLoadState: {id1: loadState}})
        ),
      });
      expect(
        selectors.getRunsLoadState(state, {
          experimentId: 'id1',
        })
      ).toEqual(loadState);
    });

    it('returns NOT_LOADED state if experiment id does not exist', () => {
      const state = buildMockState({
        ...buildStateFromRunsState(
          buildRunsState({
            runsLoadState: {
              id1: {state: DataLoadState.FAILED, lastLoadedTimeInMs: 1337},
            },
          })
        ),
      });
      expect(selectors.getRunsLoadState(state, {experimentId: 'id2'})).toEqual({
        lastLoadedTimeInMs: null,
        state: DataLoadState.NOT_LOADED,
      });
    });
  });

  describe('#getRunSelectionMap', () => {
    beforeEach(() => {
      // Clear the memoization.
      selectors.getRunSelectionMap.release();
    });

    it('returns selection map of runId passed', () => {
      const state = buildMockState({
        runs: buildRunsState(
          {},
          {
            selectionState: new Map([
              ['r1', false],
              ['r2', true],
            ]),
          }
        ),
      });

      const actual = selectors.getRunSelectionMap(state);
      expect(actual).toEqual(
        new Map([
          ['r1', false],
          ['r2', true],
        ])
      );
    });
  });

  describe('#getRunSelectorRegexFilter', () => {
    beforeEach(() => {
      // Clear the memoization.
      selectors.getRunSelectorRegexFilter.release();
    });

    it('returns regex filter', () => {
      const state = buildStateFromRunsState(
        buildRunsState({regexFilter: 'meow'}, undefined)
      );

      expect(selectors.getRunSelectorRegexFilter(state)).toBe('meow');
    });
  });

  describe('#getRunColorOverride', () => {
    beforeEach(() => {
      // Clear the memoization.
      selectors.getRunColorOverride.release();
    });

    it('returns override map', () => {
      const state = buildStateFromRunsState(
        buildRunsState({
          runColorOverrideForGroupBy: new Map([
            ['foo', '#aaa'],
            ['bar', '#bbb'],
          ]),
        })
      );

      expect(selectors.getRunColorOverride(state)).toEqual(
        new Map([
          ['foo', '#aaa'],
          ['bar', '#bbb'],
        ])
      );
    });
  });

  describe('#getDefaultRunColorIdMap', () => {
    beforeEach(() => {
      // Clear the memoization.
      selectors.getDefaultRunColorIdMap.release();
    });

    it('returns override map', () => {
      const state = buildMockState({
        ...buildStateFromRunsState(
          buildRunsState({
            defaultRunColorIdForGroupBy: new Map([
              ['foo', 1],
              ['bar', 2],
            ]),
          })
        ),
      });

      expect(selectors.getDefaultRunColorIdMap(state)).toEqual(
        new Map([
          ['foo', 1],
          ['bar', 2],
        ])
      );
    });
  });

  describe('#getRunUserSetGroupBy', () => {
    beforeEach(() => {
      // Clear the memoization.
      selectors.getRunUserSetGroupBy.release();
    });

    it('returns groupBy set by user when it is present', () => {
      const state = buildMockState({
        ...buildStateFromRunsState(
          buildRunsState({
            colorGroupRegexString: 'hello',
            initialGroupBy: {key: GroupByKey.RUN},
            userSetGroupByKey: GroupByKey.REGEX,
          })
        ),
      });

      expect(selectors.getRunUserSetGroupBy(state)).toEqual({
        key: GroupByKey.REGEX,
        regexString: 'hello',
      });
    });

    it('returns null if user never has set one', () => {
      const state = buildMockState({
        ...buildStateFromRunsState(
          buildRunsState({
            initialGroupBy: {key: GroupByKey.RUN},
            userSetGroupByKey: null,
          })
        ),
      });

      expect(selectors.getRunUserSetGroupBy(state)).toEqual(null);
    });
  });

  describe('#getRunGroupBy', () => {
    beforeEach(() => {
      // Clear the memoization.
      selectors.getRunUserSetGroupBy.release();
      selectors.getRunGroupBy.release();
    });

    it('returns groupBy set by user when it is present', () => {
      const state = buildMockState({
        ...buildStateFromRunsState(
          buildRunsState({
            colorGroupRegexString: 'hello',
            initialGroupBy: {key: GroupByKey.RUN},
            userSetGroupByKey: GroupByKey.REGEX,
          })
        ),
      });

      expect(selectors.getRunGroupBy(state)).toEqual({
        key: GroupByKey.REGEX,
        regexString: 'hello',
      });
    });

    it('returns groupBy set by user with regexString overridden', () => {
      const state = buildMockState({
        ...buildStateFromRunsState(
          buildRunsState({
            colorGroupRegexString: '',
            initialGroupBy: {key: GroupByKey.REGEX, regexString: 'hello'},
            userSetGroupByKey: GroupByKey.REGEX,
          })
        ),
      });

      expect(selectors.getRunGroupBy(state)).toEqual({
        key: GroupByKey.REGEX,
        regexString: '',
      });
    });

    it('returns initial group by if user never has set one', () => {
      const state = buildMockState({
        ...buildStateFromRunsState(
          buildRunsState({
            initialGroupBy: {key: GroupByKey.RUN},
            userSetGroupByKey: null,
          })
        ),
      });

      expect(selectors.getRunGroupBy(state)).toEqual({
        key: GroupByKey.RUN,
      });
    });
  });

  describe('#getColorGroupRegexString', () => {
    beforeEach(() => {
      // Clear the memoization.
      selectors.getColorGroupRegexString.release();
    });

    it('returns regex string when it is group by regex', () => {
      const state = buildMockState({
        ...buildStateFromRunsState(
          buildRunsState({
            colorGroupRegexString: 'foo(\\d+)',
          })
        ),
      });

      expect(selectors.getColorGroupRegexString(state)).toEqual('foo(\\d+)');
    });

    it('returns default empty string if user never has set one', () => {
      const state = buildMockState();

      expect(selectors.getColorGroupRegexString(state)).toEqual('');
    });

    it('returns regex string even if it is not user set groupby', () => {
      const state = buildMockState({
        ...buildStateFromRunsState(
          buildRunsState({
            colorGroupRegexString: 'foo(\\d+)',
          })
        ),
      });

      expect(selectors.getColorGroupRegexString(state)).toEqual('foo(\\d+)');
    });
  });

  describe('#getRunsTableHeaders', () => {
    it('returns the runs table headers', () => {
      const state = buildMockState({
        runs: buildRunsState(
          {},
          {
            runsTableHeaders: [
              {
                type: ColumnHeaderType.RUN,
                name: 'run',
                displayName: 'Run',
                enabled: true,
              },
              {
                type: ColumnHeaderType.COLOR,
                name: 'color',
                displayName: 'Color',
                enabled: false,
              },
            ],
          }
        ),
      });
      expect(selectors.getRunsTableHeaders(state)).toEqual([
        {
          type: ColumnHeaderType.RUN,
          name: 'run',
          displayName: 'Run',
          enabled: true,
        },
        {
          type: ColumnHeaderType.COLOR,
          name: 'color',
          displayName: 'Color',
          enabled: false,
        },
      ]);
    });
  });

  describe('#getGroupedRunsTableHeaders', () => {
    let state: State;

    beforeEach(() => {
      state = buildMockState({
        runs: buildRunsState(
          {},
          {
            runsTableHeaders: [
              {
                type: ColumnHeaderType.COLOR,
                name: 'color',
                displayName: 'Color',
                enabled: true,
              },
              {
                type: ColumnHeaderType.CUSTOM,
                name: 'experimentAlias',
                displayName: 'Experiment Alias',
                enabled: true,
              },
              {
                type: ColumnHeaderType.RUN,
                name: 'run',
                displayName: 'Run',
                enabled: true,
              },
            ],
          }
        ),
        ...buildStateFromHparamsState(
          buildHparamsState({
            dashboardHparamSpecs: [
              buildHparamSpec({name: 'conv_layers'}),
              buildHparamSpec({name: 'conv_kernel_size'}),
            ],
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
          })
        ),
      });
    });

    it('returns runs table headers grouped with other headers', () => {
      expect(selectors.getGroupedRunsTableHeaders(state)).toEqual([
        jasmine.objectContaining({
          type: ColumnHeaderType.RUN,
          name: 'run',
          displayName: 'Run',
          enabled: true,
        }),
        jasmine.objectContaining({
          type: ColumnHeaderType.CUSTOM,
          name: 'experimentAlias',
          displayName: 'Experiment Alias',
          enabled: true,
        }),
        jasmine.objectContaining({
          type: ColumnHeaderType.HPARAM,
          name: 'conv_layers',
          displayName: 'Conv Layers',
          enabled: true,
        }),
        jasmine.objectContaining({
          type: ColumnHeaderType.HPARAM,
          name: 'conv_kernel_size',
          displayName: 'Conv Kernel Size',
          enabled: true,
        }),
        jasmine.objectContaining({
          type: ColumnHeaderType.COLOR,
          name: 'color',
          displayName: 'Color',
          enabled: true,
        }),
      ]);
    });
  });

  describe('#getRunsTableSortingInfo', () => {
    it('returns the runs data table sorting info', () => {
      const state = buildMockState({
        runs: buildRunsState(
          {},
          {
            sortingInfo: {
              name: 'run',
              order: SortingOrder.ASCENDING,
            },
          }
        ),
      });
      expect(selectors.getRunsTableSortingInfo(state)).toEqual({
        name: 'run',
        order: SortingOrder.ASCENDING,
      });
    });
  });
});
