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
  SourceFileResponse,
} from '../data_source/tfdbg2_data_source';
import {findFileIndex} from './debugger_store_utils';
import {
  AlertsByIndex,
  AlertType,
  DataLoadState,
  DebuggerState,
  InfNanAlert,
  StackFramesById,
  SourceFileSpec,
  SourceLineSpec,
} from './debugger_types';

// HACK: These imports are for type inference.
// https://github.com/bazelbuild/rules_nodejs/issues/1013
/** @typehack */ import * as _typeHackStore from '@ngrx/store/store';

const DEFAULT_EXECUTION_PAGE_SIZE = 100;

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
    alertsBreakdown: {},
    alerts: {},
    executionIndices: {},
    focusType: null,
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
  sourceCode: {
    sourceFileListLoaded: {
      state: DataLoadState.NOT_LOADED,
      lastLoadedTimeInMs: null,
    },
    sourceFileList: [],
    fileContents: [],
    focusLineSpec: null,
  },
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
    actions.alertsOfTypeLoaded,
    (
      state: DebuggerState,
      {numAlerts, alertsBreakdown, alertType, begin, alerts}
    ): DebuggerState => {
      const runId = state.activeRunId;
      if (runId === null) {
        return state;
      }

      const updatedAlerts: AlertsByIndex = {};
      const executionIndices: number[] = state.alerts.executionIndices[
        alertType
      ]
        ? state.alerts.executionIndices[alertType].slice()
        : [];
      for (let i = 0; i < alerts.length; ++i) {
        const alertIndex = begin + i;
        const alert = alerts[i];
        updatedAlerts[alertIndex] = alert;
        if (alert.alert_type === AlertType.INF_NAN_ALERT) {
          // TOOD(cais): Deal with other alert types with execution index.
          executionIndices[alertIndex] = (alert as InfNanAlert).execution_index;
        }
      }
      if (state.alerts.alerts[alertType] !== undefined) {
        Object.assign(updatedAlerts, state.alerts.alerts[alertType]);
      }

      let scrollBeginIndex = state.executions.scrollBeginIndex;
      if (alertType === AlertType.INF_NAN_ALERT && begin === 0) {
        // TOOD(cais): Deal with other alert types with execution index.
        const alert = alerts[0] as InfNanAlert;
        const executionIndex = alert.execution_index;
        // Try to scroll the first alert to the center of the view.
        scrollBeginIndex = Math.max(
          0,
          executionIndex - Math.floor(state.executions.displayCount / 2)
        );
      }

      return {
        ...state,
        executions: {
          ...state.executions,
          scrollBeginIndex,
        },
        alerts: {
          ...state.alerts,
          alertsLoaded: {
            ...state.alerts.alertsLoaded,
            state: DataLoadState.LOADED,
            lastLoadedTimeInMs: Date.now(),
          },
          numAlerts,
          alertsBreakdown,
          alerts: {
            ...state.alerts.alerts,
            [alertType]: updatedAlerts,
          },
          executionIndices: {
            ...state.alerts.executionIndices,
            [alertType]: executionIndices,
          },
        },
      };
    }
  ),
  on(
    actions.alertTypeFocusToggled,
    (state: DebuggerState, {alertType}): DebuggerState => {
      const newState = {
        ...state,
        alerts: {
          ...state.alerts,
          focusType: state.alerts.focusType === alertType ? null : alertType,
        },
      };
      // If alert data is available, focus onto the execution digest that
      // corresponds to the first alert.
      const currentFocusType = newState.alerts.focusType;
      if (currentFocusType !== null) {
        const executionIndices =
          newState.alerts.executionIndices[currentFocusType] || [];
        // Try to put the execution digest that corresponds to the first
        // alert at the center of the view.
        if (executionIndices[0] !== undefined) {
          newState.executions.scrollBeginIndex = Math.max(
            0,
            Number(executionIndices[0]) -
              Math.floor(newState.executions.displayCount / 2)
          );
        }
      }
      return newState;
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
    actions.executionScrollToIndex,
    (state: DebuggerState, action: {index: number}): DebuggerState => {
      if (action.index < 0 || !Number.isInteger(action.index)) {
        throw new Error(
          `Attempt to scroll to negative or non-integer execution index ` +
            `(${action.index})`
        );
      }
      const {displayCount} = state.executions;
      const {numExecutions} = state.executions.executionDigestsLoaded;
      if (action.index > Math.max(0, numExecutions - displayCount)) {
        throw new Error(
          `Attempt to scroll to execution index (${action.index}), ` +
            `which exceeds maximum allowed index ` +
            `(numExecutions=${numExecutions}; displayCount=${displayCount})`
        );
      }
      return {
        ...state,
        executions: {
          ...state.executions,
          scrollBeginIndex: action.index,
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
    actions.sourceFileListRequested,
    (state: DebuggerState): DebuggerState => {
      return {
        ...state,
        sourceCode: {
          ...state.sourceCode,
          sourceFileListLoaded: {
            ...state.sourceCode.sourceFileListLoaded,
            state: DataLoadState.LOADING,
          },
        },
      };
    }
  ),
  on(
    actions.sourceFileListLoaded,
    (state: DebuggerState, sourceFileList): DebuggerState => {
      const newState: DebuggerState = {
        ...state,
        sourceCode: {
          ...state.sourceCode,
          sourceFileListLoaded: {
            ...state.sourceCode.sourceFileListLoaded,
            state: DataLoadState.LOADED,
            lastLoadedTimeInMs: Date.now(),
          },
          sourceFileList: sourceFileList.sourceFiles,
          fileContents: state.sourceCode.fileContents.slice(),
        },
      };
      const newNumFiles = sourceFileList.sourceFiles.length;
      const {fileContents} = newState.sourceCode;
      for (let i = 0; i < newNumFiles; ++i) {
        fileContents[i] = state.sourceCode.fileContents[i] || {
          loadState: DataLoadState.NOT_LOADED,
          lines: null,
        };
      }
      return newState;
    }
  ),
  on(
    actions.sourceLineFocused,
    (state: DebuggerState, focus): DebuggerState => {
      return {
        ...state,
        sourceCode: {
          ...state.sourceCode,
          focusLineSpec: focus.sourceLineSpec,
        },
      };
    }
  ),
  on(
    actions.sourceFileRequested,
    (state: DebuggerState, sourceFileSpec: SourceFileSpec): DebuggerState => {
      const newState: DebuggerState = {
        ...state,
        sourceCode: {
          ...state.sourceCode,
          fileContents: state.sourceCode.fileContents.slice(),
        },
      };
      const fileIndex = findFileIndex(
        newState.sourceCode.sourceFileList,
        sourceFileSpec
      );
      if (fileIndex >= 0) {
        newState.sourceCode.fileContents[fileIndex].loadState =
          DataLoadState.LOADING;
      } else {
        throw new Error(
          `Cannot find the following file in file list: ` +
            `host_name="${sourceFileSpec.host_name}", ` +
            `file_path="${sourceFileSpec.file_path}"`
        );
      }
      return newState;
    }
  ),
  on(
    actions.sourceFileLoaded,
    (
      state: DebuggerState,
      sourceFileResponse: SourceFileResponse
    ): DebuggerState => {
      const newState: DebuggerState = {
        ...state,
        sourceCode: {
          ...state.sourceCode,
          fileContents: state.sourceCode.fileContents.slice(),
        },
      };
      const fileIndex = findFileIndex(
        newState.sourceCode.sourceFileList,
        sourceFileResponse
      );
      if (fileIndex >= 0) {
        newState.sourceCode.fileContents[fileIndex] = {
          loadState: DataLoadState.LOADED,
          lines: sourceFileResponse.lines,
        };
      } else {
        throw new Error(
          `Cannot find the following file in file list: ` +
            `host_name="${sourceFileResponse.host_name}", ` +
            `file_path="${sourceFileResponse.file_path}"`
        );
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
