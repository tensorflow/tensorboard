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
import {DataLoadState} from '../../types/data';

import {SortDirection} from '../../types/ui';

import * as selectors from './runs_selectors';
import {
  buildDiscreteFilter,
  buildHparamSpec,
  buildIntervalFilter,
  buildMetricSpec,
  buildRun,
  buildRunsState,
  buildStateFromRunsState,
} from './testing';

describe('runs_selectors', () => {
  describe('#getExperimentIdForRunId', () => {
    beforeEach(() => {
      // Clear the memoization.
      selectors.getExperimentIdForRunId.release();
    });

    it('returns eid', () => {
      const state = buildStateFromRunsState(
        buildRunsState({
          runIdToExpId: {
            run1: 'eid1',
            run2: 'eid1',
            run3: 'eid2',
          },
        })
      );
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
      const state = buildStateFromRunsState(
        buildRunsState({
          runIdToExpId: {run1: 'eid1'},
        })
      );
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
      const state = buildStateFromRunsState(
        buildRunsState({
          runMetadata: {
            run1: buildRun({id: 'run1'}),
          },
        })
      );

      expect(selectors.getRun(state, {runId: 'run1'})).toEqual(
        buildRun({
          id: 'run1',
        })
      );
    });

    it('returns `null` if run with `runId` does not exist', () => {
      const state = buildStateFromRunsState(
        buildRunsState({
          runMetadata: {
            run1: buildRun({id: 'run1'}),
          },
        })
      );

      expect(selectors.getRun(state, {runId: 'run10'})).toBe(null);
    });
  });

  describe('#getRuns', () => {
    beforeEach(() => {
      // Clear the memoization.
      selectors.getRuns.release();
    });

    it('returns runs', () => {
      const state = buildStateFromRunsState(
        buildRunsState({
          runIds: {
            eid: ['run1'],
          },
          runMetadata: {
            run1: buildRun({id: 'run1'}),
          },
        })
      );
      expect(selectors.getRuns(state, {experimentId: 'eid'})).toEqual([
        buildRun({
          id: 'run1',
        }),
      ]);
    });

    it('returns runs for the ones that has metadata', () => {
      const state = buildStateFromRunsState(
        buildRunsState({
          runIds: {
            eid: ['run1', 'run2'],
          },
          runMetadata: {
            run1: buildRun({id: 'run1'}),
          },
        })
      );
      expect(selectors.getRuns(state, {experimentId: 'eid'})).toEqual([
        buildRun({
          id: 'run1',
        }),
      ]);
    });

    it('returns empty list if experiment id does not exist', () => {
      const state = buildStateFromRunsState(buildRunsState());
      expect(
        selectors.getRuns(state, {
          experimentId: 'i_do_not_exist',
        })
      ).toEqual([]);
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

      const state = buildStateFromRunsState(
        buildRunsState({runsLoadState: {id1: loadState}})
      );
      expect(
        selectors.getRunsLoadState(state, {
          experimentId: 'id1',
        })
      ).toEqual(loadState);
    });

    it('returns NOT_LOADED state if experiment id does not exist', () => {
      const state = buildStateFromRunsState(
        buildRunsState({
          runsLoadState: {
            id1: {state: DataLoadState.FAILED, lastLoadedTimeInMs: 1337},
          },
        })
      );
      expect(selectors.getRunsLoadState(state, {experimentId: 'id2'})).toEqual({
        lastLoadedTimeInMs: null,
        state: DataLoadState.NOT_LOADED,
      });
    });
  });

  describe('#getExperimentsHparamsAndMetrics', () => {
    beforeEach(() => {
      // Clear the memoization.
      selectors.getExperimentsHparamsAndMetrics.release();
    });

    it('returns hparams and metrics of experimentIds passed', () => {
      const state = buildStateFromRunsState(
        buildRunsState({
          hparamAndMetricSpec: {
            id1: {
              hparams: [buildHparamSpec({name: 'param1'})],
              metrics: [buildMetricSpec({tag: 'acc'})],
            },
            id2: {hparams: [], metrics: [buildMetricSpec({tag: 'loss'})]},
            id3: {hparams: [], metrics: [buildMetricSpec({tag: 'xent'})]},
          },
        })
      );

      expect(
        selectors.getExperimentsHparamsAndMetrics(state, {
          experimentIds: ['id1', 'id2'],
        })
      ).toEqual({
        hparams: [buildHparamSpec({name: 'param1'})],
        metrics: [
          buildMetricSpec({tag: 'acc'}),
          buildMetricSpec({tag: 'loss'}),
        ],
      });
    });
  });

  describe('#getRunSelectionMap', () => {
    beforeEach(() => {
      // Clear the memoization.
      selectors.getRunSelectionMap.release();
    });

    it('returns selection map of runId passed', () => {
      const state = buildStateFromRunsState(
        buildRunsState({
          runIds: {eid: ['r1', 'r2']},
          selectionState: new Map([
            [
              '["eid"]',
              new Map([
                ['r1', false],
                ['r2', true],
              ]),
            ],
          ]),
        })
      );

      const actual = selectors.getRunSelectionMap(state, {
        experimentIds: ['eid'],
      });
      expect(actual).toEqual(
        new Map([
          ['r1', false],
          ['r2', true],
        ])
      );
    });
  });

  describe('#getRunSelectorPaginationOption', () => {
    beforeEach(() => {
      // Clear the memoization.
      selectors.getRunSelectorPaginationOption.release();
    });

    it('returns pagination option', () => {
      const state = buildStateFromRunsState(
        buildRunsState(undefined, {
          paginationOption: {
            pageIndex: 1,
            pageSize: 20,
          },
        })
      );

      expect(selectors.getRunSelectorPaginationOption(state)).toEqual({
        pageIndex: 1,
        pageSize: 20,
      });
    });
  });

  describe('#getRunSelectorRegexFilter', () => {
    beforeEach(() => {
      // Clear the memoization.
      selectors.getRunSelectorRegexFilter.release();
    });

    it('returns regex filter', () => {
      const state = buildStateFromRunsState(
        buildRunsState(undefined, {regexFilter: 'meow'})
      );

      expect(selectors.getRunSelectorRegexFilter(state)).toBe('meow');
    });
  });

  describe('#getRunSelectorSort', () => {
    beforeEach(() => {
      // Clear the memoization.
      selectors.getRunSelectorSort.release();
    });

    it('returns sort options', () => {
      const state = buildStateFromRunsState(
        buildRunsState(undefined, {
          sort: {column: 'hey', direction: SortDirection.UNSET},
        })
      );

      expect(selectors.getRunSelectorSort(state)).toEqual({
        column: 'hey',
        direction: SortDirection.UNSET,
      });
    });
  });

  describe('#getRunColorMap', () => {
    beforeEach(() => {
      // Clear the memoization.
      selectors.getRunColorMap.release();
    });

    it('returns color map by runs', () => {
      const state = buildStateFromRunsState(
        buildRunsState(undefined, {
          defaultRunColor: new Map([
            ['foo', '#aaa'],
            ['bar', '#bbb'],
          ]),
        })
      );

      expect(selectors.getRunColorMap(state)).toEqual({
        foo: '#aaa',
        bar: '#bbb',
      });
    });

    it('combines override with the default colors', () => {
      const state = buildStateFromRunsState(
        buildRunsState(undefined, {
          defaultRunColor: new Map([
            ['foo', '#aaa'],
            ['bar', '#bbb'],
          ]),
          runColorOverride: new Map([['foo', '#000']]),
        })
      );

      expect(selectors.getRunColorMap(state)).toEqual({
        foo: '#000',
        bar: '#bbb',
      });
    });
  });

  describe('#getRunHparamFilterMap', () => {
    beforeEach(() => {
      // Clear the memoization.
      selectors.getRunHparamFilterMap.release();
    });

    it('returns default hparam filter map', () => {
      const state = buildStateFromRunsState(
        buildRunsState(undefined, {
          hparamDefaultFilters: new Map([['optimizer', buildDiscreteFilter()]]),
        })
      );

      expect(selectors.getRunHparamFilterMap(state)).toEqual(
        new Map([['optimizer', buildDiscreteFilter()]])
      );
    });

    it('returns custom hparam filter map', () => {
      const state = buildStateFromRunsState(
        buildRunsState(undefined, {
          hparamDefaultFilters: new Map([
            [
              'optimizer',
              buildDiscreteFilter({
                filterValues: ['a', 'b', 'c'],
              }),
            ],
          ]),
          hparamFilters: new Map([
            [
              'optimizer',
              buildDiscreteFilter({
                filterValues: ['d', 'e', 'f'],
              }),
            ],
          ]),
        })
      );

      expect(selectors.getRunHparamFilterMap(state)).toEqual(
        new Map([
          [
            'optimizer',
            buildDiscreteFilter({
              filterValues: ['d', 'e', 'f'],
            }),
          ],
        ])
      );
    });
  });

  describe('#getRunMetricFilterMap', () => {
    beforeEach(() => {
      // Clear the memoization.
      selectors.getRunMetricFilterMap.release();
    });

    it('returns default metric filter map', () => {
      const state = buildStateFromRunsState(
        buildRunsState(undefined, {
          metricDefaultFilters: new Map([
            [
              'loss',
              buildIntervalFilter({
                minValue: 0.1,
                maxValue: 1,
              }),
            ],
          ]),
        })
      );

      expect(selectors.getRunMetricFilterMap(state)).toEqual(
        new Map([
          [
            'loss',
            buildIntervalFilter({
              minValue: 0.1,
              maxValue: 1,
            }),
          ],
        ])
      );
    });

    it('returns custom metric filter map', () => {
      const state = buildStateFromRunsState(
        buildRunsState(undefined, {
          metricDefaultFilters: new Map([
            [
              'loss',
              buildIntervalFilter({
                minValue: 100,
                maxValue: 200,
              }),
            ],
          ]),
          metricFilters: new Map([
            [
              'loss',
              buildIntervalFilter({
                minValue: 0.1,
                maxValue: 1,
              }),
            ],
          ]),
        })
      );

      expect(selectors.getRunMetricFilterMap(state)).toEqual(
        new Map([
          [
            'loss',
            buildIntervalFilter({
              minValue: 0.1,
              maxValue: 1,
            }),
          ],
        ])
      );
    });
  });
});
