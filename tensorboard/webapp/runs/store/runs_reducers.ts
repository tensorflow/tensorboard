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
import {areSameRouteKindAndExperiments} from '../../app_routing';
import {stateRehydratedFromUrl} from '../../app_routing/actions';
import {createNamespaceContextedState} from '../../app_routing/namespaced_state_reducer_helper';
import {RouteKind} from '../../app_routing/types';
import {DataLoadState} from '../../types/data';
import {SortDirection} from '../../types/ui';
import {composeReducers} from '../../util/ngrx';
import * as runsActions from '../actions';
import {GroupByKey, URLDeserializedState} from '../types';
import {
  MAX_NUM_RUNS_TO_ENABLE_BY_DEFAULT,
  RunsDataNamespacedState,
  RunsDataNonNamespacedState,
  RunsDataState,
  RunsState,
  RunsUiNamespacedState,
  RunsUiState,
} from './runs_types';
import {createGroupBy, groupRuns} from './utils';

const {
  initialState: dataInitialState,
  reducers: dataNamespaceContextedReducers,
} = createNamespaceContextedState<
  RunsDataNamespacedState,
  RunsDataNonNamespacedState
>(
  {
    runColorOverrideForGroupBy: new Map(),
    defaultRunColorIdForGroupBy: new Map(),
    groupKeyToColorId: new Map(),
    initialGroupBy: {key: GroupByKey.RUN},
    userSetGroupByKey: null,
    colorGroupRegexString: '',
    regexFilter: '',
  },
  {
    runIds: {},
    runIdToExpId: {},
    runMetadata: {},
    runsLoadState: {},
  },
  /* onNavigated() */
  (state, oldRoute, newRoute) => {
    if (!areSameRouteKindAndExperiments(oldRoute, newRoute)) {
      return {
        ...state,
        initialGroupBy: {
          key:
            newRoute.routeKind === RouteKind.COMPARE_EXPERIMENT
              ? GroupByKey.EXPERIMENT
              : GroupByKey.RUN,
        },
      };
    }
    return state;
  }
);

const dataReducer: ActionReducer<RunsDataState, Action> = createReducer(
  dataInitialState,
  // Color grouping potentially is an expensive operation and assigning colors
  // on route changes may not actually be effective at all. Because we are
  // using NamespaceContextedState, color assignment and groupBy information
  // should not go out of sync. That is, for a given route, the condition in
  // which the colors get assigned are (1) when user changes groupBy and (2)
  // when new runs are fetched (new runs added or runs removed). Both of those
  // cases are handled by their respective reducer functions and, while there is
  // no strong guarantees at the moment, because we are using
  // NamespaceContextedState, even if new runs are fetched for a route that is
  // not active, refresh of a background experiment data will not result in
  // correct state update.
  //
  // While user can change groupBy state in the URL to trigger (1), that will
  // result in browser postback and the app will rebootstrap anyways.
  //
  // Given above, and given that user can go back and forth in history to cause
  // `stateRehydratedFromUrl` often, it would be computationally wasteful to
  // reassign the color as it will exactly be the same.
  on(stateRehydratedFromUrl, (state, {routeKind, partialState}) => {
    if (
      routeKind !== RouteKind.COMPARE_EXPERIMENT &&
      routeKind !== RouteKind.EXPERIMENT
    ) {
      return state;
    }

    const dehydratedState = partialState as URLDeserializedState;
    const groupBy = dehydratedState.runs.groupBy;
    const regexFilter = dehydratedState.runs.regexFilter ?? '';

    if (!groupBy && !regexFilter) {
      return state;
    }

    let {colorGroupRegexString, userSetGroupByKey} = state;
    if (groupBy) {
      const regexString =
        groupBy.key === GroupByKey.REGEX
          ? groupBy.regexString
          : state.colorGroupRegexString;
      colorGroupRegexString = regexString;
      userSetGroupByKey = groupBy.key ?? null;
    }

    return {
      ...state,
      colorGroupRegexString,
      regexFilter,
      userSetGroupByKey,
    };
  }),
  on(runsActions.fetchRunsRequested, (state, action) => {
    const nextRunsLoadState = {...state.runsLoadState};
    for (const eid of action.requestedExperimentIds) {
      if (!nextRunsLoadState[eid]) {
        nextRunsLoadState[eid] = {
          lastLoadedTimeInMs: null,
          state: DataLoadState.LOADING,
        };
      } else {
        nextRunsLoadState[eid] = {
          ...nextRunsLoadState[eid],
          state: DataLoadState.LOADING,
        };
      }
    }

    return {...state, runsLoadState: nextRunsLoadState};
  }),
  on(runsActions.fetchRunsSucceeded, (state, action) => {
    const nextRunIds = {...state.runIds};
    const nextRunMetadata = {...state.runMetadata};
    const nextRunIdToExpId = {...state.runIdToExpId};
    const nextRunsLoadState = {...state.runsLoadState};

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

    return {
      ...state,
      runIds: nextRunIds,
      runIdToExpId: nextRunIdToExpId,
      runMetadata: nextRunMetadata,
      runsLoadState: nextRunsLoadState,
    };
  }),
  on(runsActions.fetchRunsFailed, (state, action) => {
    const nextRunsLoadState = {...state.runsLoadState};
    for (const eid of action.requestedExperimentIds) {
      if (!nextRunsLoadState[eid]) {
        nextRunsLoadState[eid] = {
          lastLoadedTimeInMs: null,
          state: DataLoadState.FAILED,
        };
      } else {
        nextRunsLoadState[eid] = {
          ...nextRunsLoadState[eid],
          state: DataLoadState.FAILED,
        };
      }
    }
    return {...state, runsLoadState: nextRunsLoadState};
  }),
  on(runsActions.fetchRunsSucceeded, (state, {runsForAllExperiments}) => {
    const groupKeyToColorId = new Map(state.groupKeyToColorId);
    const defaultRunColorIdForGroupBy = new Map(
      state.defaultRunColorIdForGroupBy
    );

    let groupBy = state.initialGroupBy;
    if (state.userSetGroupByKey !== null) {
      groupBy = createGroupBy(
        state.userSetGroupByKey,
        state.colorGroupRegexString
      );
    }
    const groups = groupRuns(
      groupBy,
      runsForAllExperiments,
      state.runIdToExpId
    );

    Object.entries(groups.matches).forEach(([groupId, runs]) => {
      const colorId = groupKeyToColorId.get(groupId) ?? groupKeyToColorId.size;
      groupKeyToColorId.set(groupId, colorId);

      for (const run of runs) {
        defaultRunColorIdForGroupBy.set(run.id, colorId);
      }
    });

    // unassign color for nonmatched runs to apply default unassigned style
    for (const run of groups.nonMatches) {
      defaultRunColorIdForGroupBy.set(run.id, -1);
    }

    return {
      ...state,
      defaultRunColorIdForGroupBy,
      groupKeyToColorId,
    };
  }),
  on(
    runsActions.runGroupByChanged,
    (state: RunsDataState, {experimentIds, groupBy}): RunsDataState => {
      // Reset the groupKeyToColorId
      const groupKeyToColorId = new Map<string, number>();
      const defaultRunColorIdForGroupBy = new Map(
        state.defaultRunColorIdForGroupBy
      );

      const allRuns = experimentIds
        .flatMap((experimentId) => state.runIds[experimentId])
        .map((runId) => state.runMetadata[runId]);

      const groups = groupRuns(groupBy, allRuns, state.runIdToExpId);

      Object.entries(groups.matches).forEach(([groupId, runs]) => {
        const colorId =
          groupKeyToColorId.get(groupId) ?? groupKeyToColorId.size;
        groupKeyToColorId.set(groupId, colorId);

        for (const run of runs) {
          defaultRunColorIdForGroupBy.set(run.id, colorId);
        }
      });

      // unassign color for nonmatched runs to apply default unassigned style
      for (const run of groups.nonMatches) {
        defaultRunColorIdForGroupBy.set(run.id, -1);
      }

      const updatedRegexString =
        groupBy.key === GroupByKey.REGEX
          ? groupBy.regexString
          : state.colorGroupRegexString;

      return {
        ...state,
        colorGroupRegexString: updatedRegexString,
        userSetGroupByKey: groupBy.key,
        defaultRunColorIdForGroupBy,
        groupKeyToColorId,
        // Resets the color override when the groupBy changes.
        runColorOverrideForGroupBy: new Map(),
      };
    }
  ),
  on(runsActions.runColorChanged, (state, {runId, newColor}) => {
    const nextRunColorOverride = new Map(state.runColorOverrideForGroupBy);
    nextRunColorOverride.set(runId, newColor);

    return {...state, runColorOverrideForGroupBy: nextRunColorOverride};
  }),
  on(runsActions.runSelectorRegexFilterChanged, (state, action) => {
    return {
      ...state,
      regexFilter: action.regexString,
    };
  })
);

const dataReducers = composeReducers(
  dataReducer,
  dataNamespaceContextedReducers
);

const initialSort: RunsUiNamespacedState['sort'] = {
  key: null,
  direction: SortDirection.UNSET,
};
const {initialState: uiInitialState, reducers: uiNamespaceContextedReducers} =
  createNamespaceContextedState(
    {
      paginationOption: {
        pageIndex: 0,
        pageSize: 10,
      },
      sort: initialSort,
      selectionState: new Map<string, boolean>(),
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
    const nextSelectionState = new Map(state.selectionState);

    // Populate selection states for previously unseen runs.
    const runSelected =
      action.runsForAllExperiments.length <= MAX_NUM_RUNS_TO_ENABLE_BY_DEFAULT;
    for (const run of action.runsForAllExperiments) {
      if (!nextSelectionState.has(run.id)) {
        nextSelectionState.set(run.id, runSelected);
      }
    }

    return {
      ...state,
      selectionState: nextSelectionState,
    };
  }),
  on(runsActions.runSelectionToggled, (state, {runId}) => {
    const nextSelectionState = new Map(state.selectionState);
    nextSelectionState.set(runId, !Boolean(nextSelectionState.get(runId)));

    return {
      ...state,
      selectionState: nextSelectionState,
    };
  }),
  on(runsActions.runPageSelectionToggled, (state, {runIds}) => {
    const nextSelectionState = new Map(state.selectionState);

    const nextValue = !runIds.every((runId) => {
      return Boolean(nextSelectionState.get(runId));
    });
    for (const runId of runIds) {
      nextSelectionState.set(runId, nextValue);
    }

    return {
      ...state,
      selectionState: nextSelectionState,
    };
  })
);

const uiReducers = composeReducers(uiReducer, uiNamespaceContextedReducers);

/**
 * Reducers for the experiments.
 */
export function reducers(state: RunsState, action: Action) {
  return combineReducers({
    data: dataReducers,
    ui: uiReducers,
  })(state, action);
}
