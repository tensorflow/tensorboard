/* Copyright 2019 The TensorFlow Authors. All Rights Reserved.

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
import {Action, createReducer, on} from '@ngrx/store';

import * as actions from '../actions';
import {
  ExecutionDataResponse,
  ExecutionDigestsResponse,
} from '../data_source/tfdbg2_data_source';
import {DataLoadState, DebuggerState, StackFramesById} from './debugger_types';

// HACK: These imports are for type inference.
// https://github.com/bazelbuild/rules_nodejs/issues/1013
/** @typehack */ import * as _typeHackStore from '@ngrx/store/store';

const DEFAULT_EXECUTION_PAGE_SIZE = 100; // TODO(cais): Restore.

const initialState: DebuggerState = {
  runs: {},
  runsLoaded: {
    state: DataLoadState.NOT_LOADED,
    lastLoadedTimeInMs: null,
  },
  activeRunId: null,
  alerts: {
    alertsLoaded: {
      state: DataLoadState.NOT_LOADED,
      lastLoadedTimeInMs: null,
    },
    numAlerts: 0,
    alerts: {},
    alertsBreakdown: {},
  },
  executions: {
    numExecutionsLoaded: {
      state: DataLoadState.NOT_LOADED,
      lastLoadedTimeInMs: null,
    },
    executionDigestsLoaded: {
      numExecutions: 0,
      pageLoadedSizes: {},
      state: DataLoadState.NOT_LOADED,
      lastLoadedTimeInMs: null,
    },
    scrollBeginIndex: 0,
    focusIndex: null,
    pageSize: DEFAULT_EXECUTION_PAGE_SIZE,
    // TODO(cais) Remove the hardcoding of this, which is coupled with css width
    // properties.
    displayCount: 50,
    executionDigests: {},
    executionData: {},
  },
  stackFrames: {},
};
// TODO(cais): As `executions` is getting large, create a subreducer for it.

const reducer = createReducer(
  initialState,
  on(
    actions.debuggerRunsRequested,
    (state: DebuggerState): DebuggerState => {
      return {
        ...state,
        runsLoaded: {
          ...state.runsLoaded,
          state: DataLoadState.LOADING,
        },
      };
    }
  ),
  on(
    actions.debuggerRunsRequestFailed,
    (state: DebuggerState): DebuggerState => {
      return {
        ...state,
        runsLoaded: {
          ...state.runsLoaded,
          state: DataLoadState.FAILED,
        },
      };
    }
  ),
  on(
    actions.debuggerRunsLoaded,
    (state: DebuggerState, {runs}): DebuggerState => {
      const runIds = Object.keys(runs);
      return {
        ...state,
        runs,
        runsLoaded: {
          state: DataLoadState.LOADED,
          lastLoadedTimeInMs: Date.now(),
        },
        activeRunId: runIds.length ? runIds[0] : null,
        // TODO(cais): Handle multiple runs. We currently assumes there is only
        // one run, which is okay because the backend supports only one run
        // per experiment.
      };
    }
  ),
  on(
    actions.numAlertsAndBreakdownRequested,
    (state: DebuggerState): DebuggerState => {
      const runId = state.activeRunId;
      if (runId === null) {
        return state;
      }
      return {
        ...state,
        alerts: {
          ...state.alerts,
          alertsLoaded: {
            ...state.alerts.alertsLoaded,
            state: DataLoadState.LOADING,
          },
        },
      };
    }
  ),
  on(
    actions.numAlertsAndBreakdownLoaded,
    (state: DebuggerState, {numAlerts, alertsBreakdown}): DebuggerState => {
      const runId = state.activeRunId;
      if (runId === null) {
        return state;
      }
      return {
        ...state,
        alerts: {
          ...state.alerts,
          alertsLoaded: {
            ...state.alerts.alertsLoaded,
            state: DataLoadState.LOADED,
            lastLoadedTimeInMs: Date.now(),
          },
          numAlerts,
          alertsBreakdown,
        },
      };
    }
  ),
  on(
    actions.numExecutionsRequested,
    (state: DebuggerState): DebuggerState => {
      const runId = state.activeRunId;
      if (runId === null) {
        return state;
      }
      return {
        ...state,
        executions: {
          ...state.executions,
          numExecutionsLoaded: {
            ...state.executions.numExecutionsLoaded,
            state: DataLoadState.LOADING,
          },
        },
      };
    }
  ),
  on(
    actions.numExecutionsLoaded,
    (state: DebuggerState, {numExecutions}): DebuggerState => {
      const runId = state.activeRunId;
      if (runId === null) {
        return state;
      }
      const newState = {
        ...state,
        executions: {
          ...state.executions,
          numExecutionsLoaded: {
            ...state.executions.numExecutionsLoaded,
            state: DataLoadState.LOADED,
            lastLoadedTimeInMs: Date.now(),
          },
          executionDigestsLoaded: {
            ...state.executions.executionDigestsLoaded,
            numExecutions,
          },
        },
      };
      if (numExecutions > 0 && state.executions.focusIndex === null) {
        newState.executions.focusIndex = 0;
      }
      return newState;
    }
  ),
  on(
    actions.executionDigestsRequested,
    (state: DebuggerState): DebuggerState => {
      const runId = state.activeRunId;
      if (runId === null) {
        return state;
      }
      return {
        ...state,
        executions: {
          ...state.executions,
          executionDigestsLoaded: {
            ...state.executions.executionDigestsLoaded,
            state: DataLoadState.LOADING,
          },
        },
      };
    }
  ),
  on(
    actions.executionDigestsLoaded,
    (
      state: DebuggerState,
      digests: ExecutionDigestsResponse
    ): DebuggerState => {
      const runId = state.activeRunId;
      if (runId === null) {
        return state;
      }
      const newState: DebuggerState = {
        ...state,
        executions: {
          ...state.executions,
          executionDigestsLoaded: {
            ...state.executions.executionDigestsLoaded,
            numExecutions: digests.num_digests,
            state: DataLoadState.LOADED,
            lastLoadedTimeInMs: Date.now(),
          },
          executionDigests: {...state.executions.executionDigests},
        },
      };
      for (let i = digests.begin; i < digests.end; ++i) {
        newState.executions.executionDigests[i] =
          digests.execution_digests[i - digests.begin];
      }
      // Update pagesLoadedInFull.
      if (digests.end > digests.begin) {
        const pageIndex = digests.begin / state.executions.pageSize;
        newState.executions.executionDigestsLoaded.pageLoadedSizes = {
          ...newState.executions.executionDigestsLoaded.pageLoadedSizes,
          [pageIndex]: digests.end - digests.begin,
        };
      }
      return newState;
    }
  ),
  on(
    actions.executionScrollLeft,
    (state: DebuggerState): DebuggerState => {
      // TODO(cais): Left-right navigation should have more context-depedent
      // behavior, e.g., when alerts are present.
      const runId = state.activeRunId;
      if (runId === null) {
        return state;
      }
      let scrollBeginIndex = state.executions.scrollBeginIndex;
      if (scrollBeginIndex > 0) {
        scrollBeginIndex--;
      }
      return {
        ...state,
        executions: {
          ...state.executions,
          scrollBeginIndex,
        },
      };
    }
  ),
  on(
    actions.executionScrollRight,
    (state: DebuggerState): DebuggerState => {
      // TODO(cais): Left-right navigation should have more context-depedent
      // behavior, e.g., when alerts are present.
      const runId = state.activeRunId;
      if (runId === null) {
        return state;
      }
      let scrollBeginIndex = state.executions.scrollBeginIndex;
      if (
        scrollBeginIndex + state.executions.displayCount + 1 <=
        state.executions.executionDigestsLoaded.numExecutions
      ) {
        scrollBeginIndex++;
      }
      return {
        ...state,
        executions: {
          ...state.executions,
          scrollBeginIndex,
        },
      };
    }
  ),
  on(
    actions.executionDigestFocused,
    (state: DebuggerState, action): DebuggerState => {
      return {
        ...state,
        executions: {
          ...state.executions,
          focusIndex: state.executions.scrollBeginIndex + action.displayIndex,
        },
      };
    }
  ),
  on(
    actions.executionDataLoaded,
    (state: DebuggerState, data: ExecutionDataResponse): DebuggerState => {
      const runId = state.activeRunId;
      if (runId === null) {
        return state;
      }
      const newState: DebuggerState = {
        ...state,
        executions: {
          ...state.executions,
          executionData: {...state.executions.executionData},
        },
      };
      for (let i = data.begin; i < data.end; ++i) {
        newState.executions.executionData[i] = data.executions[i - data.begin];
      }
      return newState;
    }
  ),
  on(
    actions.stackFramesLoaded,
    (
      state: DebuggerState,
      stackFrames: {stackFrames: StackFramesById}
    ): DebuggerState => {
      const runId = state.activeRunId;
      if (runId === null) {
        return state;
      }
      const newState: DebuggerState = {
        ...state,
        stackFrames: {...state.stackFrames, ...stackFrames.stackFrames},
      };
      return newState;
    }
  )
);

export function reducers(state: DebuggerState, action: Action) {
  return reducer(state, action);
}
