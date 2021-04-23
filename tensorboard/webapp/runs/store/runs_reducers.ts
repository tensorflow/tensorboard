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
import * as colorUtils from '../../util/colors';
import {composeReducers} from '../../util/ngrx';
import * as runsActions from '../actions';
import {
  MAX_NUM_RUNS_TO_ENABLE_BY_DEFAULT,
  RunsDataState,
  RunsState,
  RunsUiRoutefulState,
  RunsUiRoutelessState,
  RunsUiState,
} from './runs_types';
import {serializeExperimentIds} from './utils';

const dataInitialState: RunsDataState = {
  runIds: {},
  runIdToExpId: {},
  runMetadata: {},
  runsLoadState: {},
  selectionState: new Map<string, Map<string, boolean>>(),
};

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

    const eidsBasedKey = serializeExperimentIds(action.experimentIds);
    if (!nextSelectionState.has(eidsBasedKey)) {
      const selectionMap = new Map<string, boolean>();
      const runSelected =
        action.runsForAllExperiments.length <=
        MAX_NUM_RUNS_TO_ENABLE_BY_DEFAULT;
      for (const run of action.runsForAllExperiments) {
        selectionMap.set(run.id, runSelected);
      }
      nextSelectionState.set(eidsBasedKey, selectionMap);
    } else {
      // There could be new runs that were previously unseen.
      // Populate their selection states.
      const selectionMap = new Map(nextSelectionState.get(eidsBasedKey)!);
      for (const run of action.runsForAllExperiments) {
        if (!selectionMap.has(run.id)) {
          selectionMap.set(run.id, false);
        }
      }
      nextSelectionState.set(eidsBasedKey, selectionMap);
    }

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
  })
);

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
    sort: {
      key: null,
      direction: SortDirection.UNSET,
    },
    hparamFilters: new Map(),
    metricFilters: new Map(),
    runColorOverride: new Map(),
  } as RunsUiRoutefulState,
  {
    hparamDefaultFilters: new Map(),
    metricDefaultFilters: new Map(),
    defaultRunColor: new Map(),
  } as RunsUiRoutelessState
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
  }),
  on(runsActions.fetchRunsSucceeded, (state, action) => {
    const nextDefaultRunColor = new Map(state.defaultRunColor);

    action.runsForAllExperiments
      .filter((run) => !Boolean(nextDefaultRunColor.get(run.id)))
      .forEach((run) => {
        nextDefaultRunColor.set(run.id, colorUtils.getNextChartColor());
      });

    return {
      ...state,
      defaultRunColor: nextDefaultRunColor,
    };
  }),
  on(runsActions.runColorChanged, (state, {runId, newColor}) => {
    const nextRunColorOverride = new Map(state.runColorOverride);

    nextRunColorOverride.set(runId, newColor);

    return {...state, runColorOverride: nextRunColorOverride};
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
    data: dataReducer,
    ui: routeStatefulUiReducers,
  })(state, action);
}
