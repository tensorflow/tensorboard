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
  Action,
  ActionReducer,
  combineReducers,
  createReducer,
  on,
} from '@ngrx/store';

import {createRouteContextedState} from '../../app_routing/route_contexted_reducer_helper';
import {DataLoadState} from '../../types/data';
import {SortDirection} from '../../types/ui';
import {CHART_COLOR_PALLETE} from '../../util/colors';
import {composeReducers} from '../../util/ngrx';
import * as runsActions from '../actions';
import {GroupByKey} from '../types';
import {
  MAX_NUM_RUNS_TO_ENABLE_BY_DEFAULT,
  RunsDataRoutefulState,
  RunsDataRoutelessState,
  RunsDataState,
  RunsState,
  RunsUiRoutefulState,
  RunsUiState,
} from './runs_types';
import {groupRuns, serializeExperimentIds} from './utils';

const {
  initialState: dataInitialState,
  reducers: dataRouteContextReducers,
} = createRouteContextedState<RunsDataRoutefulState, RunsDataRoutelessState>(
  {
    runColorOverrideForGroupBy: new Map(),
    defaultRunColorForGroupBy: new Map(),
    groupKeyToColorString: new Map(),
    groupBy: {key: GroupByKey.RUN},
  },
  {
    runIds: {},
    runIdToExpId: {},
    runMetadata: {},
    runsLoadState: {},
    selectionState: new Map<string, Map<string, boolean>>(),
  }
);

const dataReducer: ActionReducer<RunsDataState, Action> = createReducer(
  dataInitialState,
  on(runsActions.fetchRunsRequested, (state, action) => {
    const nextRunsLoadState = {...state.runsLoadState};
    for (const eid of action.requestedExperimentIds) {
      nextRunsLoadState[eid] = {
        lastLoadedTimeInMs: null,
        ...nextRunsLoadState[eid],
        state: DataLoadState.LOADING,
      };
    }

    return {...state, runsLoadState: nextRunsLoadState};
  }),
  on(runsActions.fetchRunsSucceeded, (state, action) => {
    const nextRunIds = {...state.runIds};
    const nextRunMetadata = {...state.runMetadata};
    const nextRunIdToExpId = {...state.runIdToExpId};
    const nextRunsLoadState = {...state.runsLoadState};
    const nextSelectionState = new Map(state.selectionState);

    for (const eid of Object.keys(action.newRunsAndMetadata)) {
      const {runs, metadata} = action.newRunsAndMetadata[eid];
      nextRunIds[eid] = runs.map(({id}) => id);
      nextRunsLoadState[eid] = {
        ...nextRunsLoadState[eid],
        lastLoadedTimeInMs: Date.now(),
        state: DataLoadState.LOADED,
      };

      for (const run of runs) {
        const hparamAndMetrics = metadata.runToHparamsAndMetrics[run.id];
        nextRunMetadata[run.id] = {
          ...run,
          hparams: hparamAndMetrics ? hparamAndMetrics.hparams : null,
          metrics: hparamAndMetrics ? hparamAndMetrics.metrics : null,
        };
        nextRunIdToExpId[run.id] = eid;
      }
    }

    // Populate selection states for previously unseen runs.
    const eidsBasedKey = serializeExperimentIds(action.experimentIds);
    const selectionMap = new Map(nextSelectionState.get(eidsBasedKey) ?? []);
    const runSelected =
      action.runsForAllExperiments.length <= MAX_NUM_RUNS_TO_ENABLE_BY_DEFAULT;
    for (const run of action.runsForAllExperiments) {
      if (!selectionMap.has(run.id)) {
        selectionMap.set(run.id, runSelected);
      }
    }
    nextSelectionState.set(eidsBasedKey, selectionMap);

    return {
      ...state,
      runIds: nextRunIds,
      runIdToExpId: nextRunIdToExpId,
      runMetadata: nextRunMetadata,
      runsLoadState: nextRunsLoadState,
      selectionState: nextSelectionState,
    };
  }),
  on(runsActions.fetchRunsFailed, (state, action) => {
    const nextRunsLoadState = {...state.runsLoadState};
    for (const eid of action.requestedExperimentIds) {
      nextRunsLoadState[eid] = {
        lastLoadedTimeInMs: null,
        ...nextRunsLoadState[eid],
        state: DataLoadState.FAILED,
      };
    }
    return {...state, runsLoadState: nextRunsLoadState};
  }),
  on(runsActions.runSelectionToggled, (state, {experimentIds, runId}) => {
    const stateKey = serializeExperimentIds(experimentIds);
    const nextSelectionState = new Map(state.selectionState);
    const subSelectionState = new Map(nextSelectionState.get(stateKey) ?? []);

    subSelectionState.set(runId, !Boolean(subSelectionState.get(runId)));
    nextSelectionState.set(stateKey, subSelectionState);

    return {
      ...state,
      selectionState: nextSelectionState,
    };
  }),
  on(runsActions.runPageSelectionToggled, (state, {experimentIds, runIds}) => {
    const stateKey = serializeExperimentIds(experimentIds);
    const nextSelectionState = new Map(state.selectionState);
    const subSelectionState = new Map(nextSelectionState.get(stateKey) ?? []);

    const nextValue = !runIds.every((runId) => {
      return Boolean(subSelectionState.get(runId));
    });
    for (const runId of runIds) {
      subSelectionState.set(runId, nextValue);
    }

    nextSelectionState.set(stateKey, subSelectionState);

    return {
      ...state,
      selectionState: nextSelectionState,
    };
  }),
  on(runsActions.runsSelectAll, (state, {experimentIds}) => {
    const stateKey = serializeExperimentIds(experimentIds);
    const nextSelectionState = new Map(state.selectionState);
    const subSelectionState = new Map(nextSelectionState.get(stateKey) ?? []);

    for (const experimentId of experimentIds) {
      for (const runId of state.runIds[experimentId]) {
        subSelectionState.set(runId, true);
      }
    }

    nextSelectionState.set(stateKey, subSelectionState);

    return {
      ...state,
      selectionState: nextSelectionState,
    };
  }),
  on(runsActions.fetchRunsSucceeded, (state, {runsForAllExperiments}) => {
    const groupKeyToColorString = new Map(state.groupKeyToColorString);
    const defaultRunColorForGroupBy = new Map(state.defaultRunColorForGroupBy);

    const groups = groupRuns(
      state.groupBy,
      runsForAllExperiments,
      state.runIdToExpId
    );
    Object.entries(groups).forEach(([groupId, runs]) => {
      const color =
        groupKeyToColorString.get(groupId) ??
        CHART_COLOR_PALLETE[
          groupKeyToColorString.size % CHART_COLOR_PALLETE.length
        ];
      groupKeyToColorString.set(groupId, color);

      for (const run of runs) {
        defaultRunColorForGroupBy.set(run.id, color);
      }
    });

    return {
      ...state,
      defaultRunColorForGroupBy,
      groupKeyToColorString,
    };
  }),
  on(
    runsActions.runGroupByChanged,
    (state: RunsDataState, {experimentIds, groupBy}): RunsDataState => {
      // Reset the groupKeyToColorString
      const groupKeyToColorString = new Map<string, string>();
      const defaultRunColorForGroupBy = new Map(
        state.defaultRunColorForGroupBy
      );

      const allRuns = experimentIds
        .flatMap((experimentId) => {
          return state.runIds[experimentId];
        })
        .map((runId) => {
          return state.runMetadata[runId];
        })
        .filter(Boolean);

      const groups = groupRuns(groupBy, allRuns, state.runIdToExpId);

      Object.entries(groups).forEach(([groupId, runs]) => {
        const color =
          groupKeyToColorString.get(groupId) ??
          CHART_COLOR_PALLETE[
            groupKeyToColorString.size % CHART_COLOR_PALLETE.length
          ];
        groupKeyToColorString.set(groupId, color);

        for (const run of runs) {
          defaultRunColorForGroupBy.set(run.id, color);
        }
      });

      return {
        ...state,
        defaultRunColorForGroupBy,
        groupKeyToColorString,
        // Resets the color override when the groupBy changes.
        runColorOverrideForGroupBy: new Map(),
      };
    }
  ),
  on(runsActions.runColorChanged, (state, {runId, newColor}) => {
    const nextRunColorOverride = new Map(state.runColorOverrideForGroupBy);
    nextRunColorOverride.set(runId, newColor);

    return {...state, runColorOverrideForGroupBy: nextRunColorOverride};
  })
);

const routeStatefulDataReducers = composeReducers(
  dataReducer,
  dataRouteContextReducers
);

const initialSort: RunsUiRoutefulState['sort'] = {
  key: null,
  direction: SortDirection.UNSET,
};
const {
  initialState: uiInitialState,
  reducers: uiRouteContextReducers,
} = createRouteContextedState(
  {
    paginationOption: {
      pageIndex: 0,
      pageSize: 10,
    },
    regexFilter: '',
    sort: initialSort,
  },
  {}
);

const uiReducer: ActionReducer<RunsUiState, Action> = createReducer(
  uiInitialState,
  on(
    runsActions.runSelectorPaginationOptionChanged,
    (state, {pageSize, pageIndex}) => {
      return {
        ...state,
        paginationOption: {
          pageSize,
          pageIndex,
        },
      };
    }
  ),
  on(runsActions.runSelectorRegexFilterChanged, (state, action) => {
    return {
      ...state,
      regexFilter: action.regexString,
      paginationOption: {
        ...state.paginationOption,
        // Reset the page index to 0 to emulate mat-table behavior.
        pageIndex: 0,
      },
    };
  }),
  on(runsActions.runSelectorSortChanged, (state, action) => {
    return {
      ...state,
      sort: {
        key: action.key,
        direction: action.direction,
      },
    };
  })
);

const routeStatefulUiReducers = composeReducers(
  uiReducer,
  uiRouteContextReducers
);

/**
 * Reducers for the experiments.
 */
export function reducers(state: RunsState, action: Action) {
  return combineReducers({
    data: routeStatefulDataReducers,
    ui: routeStatefulUiReducers,
  })(state, action);
}
