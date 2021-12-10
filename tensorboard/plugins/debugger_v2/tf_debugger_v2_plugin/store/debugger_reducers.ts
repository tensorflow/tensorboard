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
  GraphExecutionDataResponse,
  SourceFileResponse,
} from '../data_source/tfdbg2_data_source';
import {getFocusedStackFramesHelper} from './debugger_store_helpers';
import {
  computeBottommostLineSpec,
  findBeginEndRangeIndex,
  findFileIndex,
  isFrameBottommostInStackTrace,
} from './debugger_store_utils';
import {
  AlertsByIndex,
  AlertType,
  CodeLocationType,
  DataLoadState,
  DebuggerState,
  Executions,
  GraphExecutions,
  Graphs,
  InfNanAlert,
  SourceFileSpec,
  StackFrame,
  StackFramesById,
} from './debugger_types';

const DEFAULT_EXECUTION_PAGE_SIZE = 100;
const DEFAULT_GRAPH_EXECUTION_PAGE_SIZE = 200;

export function createInitialExecutionsState(): Executions {
  return {
    numExecutionsLoaded: {
      state: DataLoadState.NOT_LOADED,
      lastLoadedTimeInMs: null,
    },
    executionDigestsLoaded: {
      loadingRanges: [],
      numExecutions: 0,
      pageLoadedSizes: {},
    },
    // TODO(cais) Remove the hardcoding of this, which is coupled with css width
    // properties.
    displayCount: 50,
    pageSize: DEFAULT_EXECUTION_PAGE_SIZE,
    scrollBeginIndex: 0,
    focusIndex: null,
    executionDigests: {},
    executionData: {},
  };
}

export function createInitialGraphExecutionsState(): GraphExecutions {
  return {
    numExecutionsLoaded: {
      state: DataLoadState.NOT_LOADED,
      lastLoadedTimeInMs: null,
    },
    executionDigestsLoaded: {
      loadingRanges: [],
      numExecutions: 0,
      pageLoadedSizes: {},
    },
    // TODO(cais) Remove the hardcoding of this, which is coupled with css width
    // properties.
    displayCount: 100,
    pageSize: DEFAULT_GRAPH_EXECUTION_PAGE_SIZE,
    scrollBeginIndex: 0,
    focusIndex: null,
    graphExecutionDigests: {},
    graphExecutionDataLoadingPages: [],
    graphExecutionDataPageLoadedSizes: {},
    graphExecutionData: {},
  };
}

export function createInitialGraphsState(): Graphs {
  return {
    ops: {},
    loadingOps: {},
    focusedOp: null,
  };
}

const initialState: DebuggerState = {
  runs: {},
  runsLoaded: {
    state: DataLoadState.NOT_LOADED,
    lastLoadedTimeInMs: null,
  },
  activeRunId: null,
  // The initial values of lastDataPollOnsetTimeMs and
  // lastNonEmptyPollDataTimeMs ensures that initially, before
  // the onset of any data polling, the difference of the two
  // is 0, which causes a backing-off polling algorithm to use
  // the lower-bound polling interval.
  lastDataPollOnsetTimeMs: -1,
  lastNonEmptyPollDataTimeMs: 1,
  alerts: {
    alertsLoaded: {
      state: DataLoadState.NOT_LOADED,
      lastLoadedTimeInMs: null,
    },
    numAlerts: 0,
    alertsBreakdown: {},
    alerts: {},
    executionIndices: {},
    graphExecutionIndices: {},
    focusType: null,
  },
  executions: createInitialExecutionsState(),
  graphExecutions: createInitialGraphExecutionsState(),
  graphs: createInitialGraphsState(),
  stackFrames: {},
  codeLocationFocusType: null,
  stickToBottommostFrameInFocusedFile: false,
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
  on(actions.debuggerRunsRequested, (state: DebuggerState): DebuggerState => {
    return {
      ...state,
      runsLoaded: {
        ...state.runsLoaded,
        state: DataLoadState.LOADING,
      },
    };
  }),
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
      const activeRunChanged = runIds.length > 0 && state.activeRunId === null;
      return {
        ...state,
        lastNonEmptyPollDataTimeMs: activeRunChanged
          ? Date.now()
          : state.lastNonEmptyPollDataTimeMs,
        runs,
        runsLoaded: {
          state: DataLoadState.LOADED,
          lastLoadedTimeInMs: Date.now(),
        },
        activeRunId: runIds.length > 0 ? runIds[0] : null,
        // TODO(cais): Handle multiple runs. We currently assumes there is only
        // one run, which is okay because the backend supports only one run
        // per experiment.
      };
    }
  ),
  on(actions.debuggerDataPollOnset, (state: DebuggerState): DebuggerState => {
    return {
      ...state,
      lastDataPollOnsetTimeMs: Date.now(),
    };
  }),
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
      const numAlertsIncreased = numAlerts > state.alerts.numAlerts;
      return {
        ...state,
        lastNonEmptyPollDataTimeMs: numAlertsIncreased
          ? Date.now()
          : state.lastNonEmptyPollDataTimeMs,
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
      const graphExecutionIndices: number[] = state.alerts
        .graphExecutionIndices[alertType]
        ? state.alerts.graphExecutionIndices[alertType].slice()
        : [];
      for (let i = 0; i < alerts.length; ++i) {
        const alertIndex = begin + i;
        const alert = alerts[i];
        updatedAlerts[alertIndex] = alert;
        if (alert.alert_type === AlertType.INF_NAN_ALERT) {
          // TOOD(cais): Deal with other alert types with execution index.
          const infNanAlert = alert as InfNanAlert;
          executionIndices[alertIndex] = infNanAlert.execution_index;
          if (infNanAlert.graph_execution_trace_index !== null) {
            graphExecutionIndices[alertIndex] =
              infNanAlert.graph_execution_trace_index;
          }
        }
      }
      if (state.alerts.alerts[alertType] !== undefined) {
        Object.assign(updatedAlerts, state.alerts.alerts[alertType]);
      }

      let scrollBeginIndex = state.executions.scrollBeginIndex;
      let graphExecutionFocusIndex = state.graphExecutions.focusIndex;
      if (alertType === AlertType.INF_NAN_ALERT && begin === 0) {
        // TOOD(cais): Deal with other alert types with execution index.
        const alert = alerts[0] as InfNanAlert;
        const executionIndex = alert.execution_index;
        // Try to scroll the first alert to the center of the view.
        scrollBeginIndex = Math.max(
          0,
          executionIndex - Math.floor(state.executions.displayCount / 2)
        );
        if (alert.graph_execution_trace_index !== null) {
          graphExecutionFocusIndex = alert.graph_execution_trace_index;
        }
      }

      return {
        ...state,
        executions: {
          ...state.executions,
          scrollBeginIndex,
        },
        graphExecutions: {
          ...state.graphExecutions,
          focusIndex: graphExecutionFocusIndex,
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
          graphExecutionIndices: {
            ...state.alerts.graphExecutionIndices,
            [alertType]: graphExecutionIndices,
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
          newState.executions = {
            ...newState.executions,
            scrollBeginIndex: Math.max(
              0,
              Number(executionIndices[0]) -
                Math.floor(newState.executions.displayCount / 2)
            ),
          };
        }
      }
      return newState;
    }
  ),
  //////////////////////////////////////////////
  // Reducers related to top-level execution. //
  //////////////////////////////////////////////
  on(actions.numExecutionsRequested, (state: DebuggerState): DebuggerState => {
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
  }),
  on(
    actions.numExecutionsLoaded,
    (state: DebuggerState, {numExecutions}): DebuggerState => {
      const runId = state.activeRunId;
      if (runId === null) {
        return state;
      }
      const numExecutionsIncreased =
        numExecutions > state.executions.executionDigestsLoaded.numExecutions;
      const newState = {
        ...state,
        lastNonEmptyPollDataTimeMs: numExecutionsIncreased
          ? Date.now()
          : state.lastNonEmptyPollDataTimeMs,
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
    (
      state: DebuggerState,
      range: {begin: number; end: number}
    ): DebuggerState => {
      const runId = state.activeRunId;
      if (runId === null) {
        return state;
      }
      const loadingRanges = [
        ...state.executions.executionDigestsLoaded.loadingRanges,
      ];
      const match = findBeginEndRangeIndex(
        loadingRanges,
        range.begin,
        range.end
      );
      if (match === -1) {
        loadingRanges.push({begin: range.begin, end: range.end});
      }
      const newState = {
        ...state,
        executions: {
          ...state.executions,
          executionDigestsLoaded: {
            ...state.executions.executionDigestsLoaded,
            loadingRanges,
          },
        },
      };
      return newState;
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
      const loadingRanges = [
        ...state.executions.executionDigestsLoaded.loadingRanges,
      ];
      const matchIndex = findBeginEndRangeIndex(
        loadingRanges,
        digests.begin,
        digests.end
      );
      if (matchIndex !== -1) {
        loadingRanges.splice(matchIndex, 1);
      }
      const newState: DebuggerState = {
        ...state,
        executions: {
          ...state.executions,
          executionDigestsLoaded: {
            ...state.executions.executionDigestsLoaded,
            numExecutions: digests.num_digests,
            loadingRanges,
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
  on(actions.executionScrollLeft, (state: DebuggerState): DebuggerState => {
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
  }),
  on(actions.executionScrollRight, (state: DebuggerState): DebuggerState => {
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
  }),
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
      const newState = {
        ...state,
        executions: {
          ...state.executions,
          focusIndex: state.executions.scrollBeginIndex + action.displayIndex,
        },
        // An eager-execution event was last focused on, update the
        // code-location focus type to `EXECUTION`.
        codeLocationFocusType: CodeLocationType.EXECUTION,
        sourceCode: {
          ...state.sourceCode,
        },
      };
      newState.sourceCode.focusLineSpec = computeBottommostLineSpec(newState);
      return newState;
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
  ////////////////////////////////////////////////
  // Reducers related to intra-graph execution. //
  ////////////////////////////////////////////////
  on(
    actions.numGraphExecutionsRequested,
    (state: DebuggerState): DebuggerState => {
      if (state.activeRunId === null) {
        return state;
      }
      return {
        ...state,
        graphExecutions: {
          ...state.graphExecutions,
          numExecutionsLoaded: {
            ...state.graphExecutions.numExecutionsLoaded,
            state: DataLoadState.LOADING,
          },
        },
      };
    }
  ),
  on(
    actions.numGraphExecutionsLoaded,
    (state: DebuggerState, {numGraphExecutions}): DebuggerState => {
      if (state.activeRunId === null) {
        return state;
      }
      const numGraphExecutionsIncreased =
        numGraphExecutions >
        state.graphExecutions.executionDigestsLoaded.numExecutions;
      const newState = {
        ...state,
        lastNonEmptyPollDataTimeMs: numGraphExecutionsIncreased
          ? Date.now()
          : state.lastNonEmptyPollDataTimeMs,
        graphExecutions: {
          ...state.graphExecutions,
          numExecutionsLoaded: {
            ...state.graphExecutions.numExecutionsLoaded,
            state: DataLoadState.LOADED,
            lastLoadedTimeInMs: Date.now(),
          },
          executionDigestsLoaded: {
            ...state.graphExecutions.executionDigestsLoaded,
            numExecutions: numGraphExecutions,
          },
        },
      };
      if (numGraphExecutions > 0 && state.graphExecutions.focusIndex === null) {
        newState.graphExecutions.focusIndex = 0;
      }
      return newState;
    }
  ),
  on(
    actions.graphExecutionDataRequested,
    (state: DebuggerState, {pageIndex}): DebuggerState => {
      if (state.activeRunId === null) {
        return state;
      }
      const graphExecutionDataLoadingPages =
        state.graphExecutions.graphExecutionDataLoadingPages.slice();
      if (graphExecutionDataLoadingPages.indexOf(pageIndex) === -1) {
        graphExecutionDataLoadingPages.push(pageIndex);
      }
      return {
        ...state,
        graphExecutions: {
          ...state.graphExecutions,
          graphExecutionDataLoadingPages,
        },
      };
    }
  ),
  on(
    actions.graphExecutionDataLoaded,
    (state: DebuggerState, data: GraphExecutionDataResponse): DebuggerState => {
      if (state.activeRunId === null) {
        return state;
      }
      const {pageSize} = state.graphExecutions;
      const graphExecutionDataLoadingPages =
        state.graphExecutions.graphExecutionDataLoadingPages.slice();
      const graphExecutionDataPageLoadedSizes = {
        ...state.graphExecutions.graphExecutionDataPageLoadedSizes,
      };
      const graphExecutionData = {...state.graphExecutions.graphExecutionData};
      for (let i = data.begin; i < data.end; ++i) {
        const pageIndex = Math.floor(i / pageSize);
        if (graphExecutionDataLoadingPages.indexOf(pageIndex) !== -1) {
          graphExecutionDataLoadingPages.splice(
            graphExecutionDataLoadingPages.indexOf(pageIndex),
            1
          );
        }
        if (graphExecutionDataPageLoadedSizes[pageIndex] === undefined) {
          graphExecutionDataPageLoadedSizes[pageIndex] = 0;
        }
        if (graphExecutionData[i] === undefined) {
          graphExecutionDataPageLoadedSizes[pageIndex]++;
        }
        graphExecutionData[i] = data.graph_executions[i - data.begin];
      }
      return {
        ...state,
        graphExecutions: {
          ...state.graphExecutions,
          graphExecutionDataLoadingPages,
          graphExecutionDataPageLoadedSizes,
          graphExecutionData,
        },
      };
    }
  ),
  on(
    actions.graphExecutionScrollToIndex,
    (state: DebuggerState, action: {index: number}): DebuggerState => {
      if (action.index < 0 || !Number.isInteger(action.index)) {
        throw new Error(
          `Attempt to scroll to negative or non-integer graph-execution ` +
            `index (${action.index})`
        );
      }
      return {
        ...state,
        graphExecutions: {
          ...state.graphExecutions,
          scrollBeginIndex: action.index,
        },
      };
    }
  ),
  on(
    actions.graphExecutionFocused,
    (
      state: DebuggerState,
      action: {index: number; graph_id: string; op_name: string}
    ): DebuggerState => {
      return graphOpFocusReducerHelper(
        state,
        action.graph_id,
        action.op_name,
        action.index
      );
    }
  ),
  ////////////////////////////////////////////////
  // Reducers related to graph structures.      //
  ////////////////////////////////////////////////
  on(
    actions.graphOpFocused,
    (
      state: DebuggerState,
      action: {graph_id: string; op_name: string}
    ): DebuggerState => {
      return graphOpFocusReducerHelper(state, action.graph_id, action.op_name);
    }
  ),
  on(
    actions.graphOpInfoRequested,
    (
      state: DebuggerState,
      data: {graph_id: string; op_name: string}
    ): DebuggerState => {
      const {graph_id, op_name} = data;
      const newState: DebuggerState = {
        ...state,
        graphs: {
          ...state.graphs,
          loadingOps: {
            ...state.graphs.loadingOps,
          },
        },
      };
      if (newState.graphs.loadingOps[graph_id] === undefined) {
        newState.graphs.loadingOps[graph_id] = new Map<string, DataLoadState>();
      }
      if (!newState.graphs.loadingOps[graph_id].has(op_name)) {
        newState.graphs.loadingOps[graph_id].set(
          op_name,
          DataLoadState.LOADING
        );
      }
      return newState;
    }
  ),
  on(actions.graphOpInfoLoaded, (state: DebuggerState, data): DebuggerState => {
    const {graphOpInfoResponse} = data;
    const {graph_ids} = graphOpInfoResponse;
    const graphId = graph_ids[graph_ids.length - 1];
    const newState: DebuggerState = {
      ...state,
      graphs: {
        ...state.graphs,
        ops: {
          ...state.graphs.ops,
          [graphId]: new Map(state.graphs.ops[graphId]),
        },
        loadingOps: {
          ...state.graphs.loadingOps,
          [graphId]: new Map(state.graphs.loadingOps[graphId]),
        },
      },
    };
    for (const input of graphOpInfoResponse.inputs) {
      if (!input.data) {
        // `input.data` can be undefined when the backend fails to look up
        // detailed information regarding the input op (e.g., for certain
        // TF-internal ops such as StatefulPartitionedCall).
        // Same for `consumer.data` below.
        continue;
      }
      newState.graphs.ops[graphId].set(input.op_name, input.data);
    }
    for (let i = 0; i < graphOpInfoResponse.consumers.length; ++i) {
      for (const consumer of graphOpInfoResponse.consumers[i]) {
        if (!consumer.data) {
          continue;
        }
        newState.graphs.ops[graphId].set(consumer.op_name, consumer.data);
      }
    }
    newState.graphs.ops[graphId].set(graphOpInfoResponse.op_name, {
      ...graphOpInfoResponse,
      // Remove `input.data` to avoid duplicated data in `opInfo`,
      // which is put into `newState.graphs.ops[graphId][opInfo.op_name]`
      // later.d
      // Same for `consumer.data` below.
      inputs: graphOpInfoResponse.inputs.map((input) => ({
        op_name: input.op_name,
        output_slot: input.output_slot,
      })),
      consumers: graphOpInfoResponse.consumers.map((slotConsumers) => {
        return slotConsumers.map((consumer) => ({
          op_name: consumer.op_name,
          input_slot: consumer.input_slot,
        }));
      }),
    });
    // Remove the loading marker for the op.
    newState.graphs.loadingOps[graphId].set(
      graphOpInfoResponse.op_name,
      DataLoadState.LOADED
    );
    return newState;
  }),
  ////////////////////////////////////////////////////////
  // Reducers related to source files and stack traces. //
  ////////////////////////////////////////////////////////
  on(actions.sourceFileListRequested, (state: DebuggerState): DebuggerState => {
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
  }),
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
        fileContents[i] = state.sourceCode.fileContents[i] ?? {
          loadState: DataLoadState.NOT_LOADED,
          lines: null,
        };
      }
      return newState;
    }
  ),
  on(
    actions.sourceLineFocused,
    (state: DebuggerState, focus: {stackFrame: StackFrame}): DebuggerState => {
      const focusedStackTrace = getFocusedStackFramesHelper(state);
      const newState = {
        ...state,
        sourceCode: {
          ...state.sourceCode,
          focusLineSpec: focus.stackFrame,
        },
      };
      if (focusedStackTrace !== null) {
        newState.stickToBottommostFrameInFocusedFile =
          isFrameBottommostInStackTrace(focusedStackTrace, focus.stackFrame);
      }
      return newState;
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
        newState.sourceCode.fileContents.splice(fileIndex, 1, {
          ...newState.sourceCode.fileContents[fileIndex],
          loadState: DataLoadState.LOADING,
        });
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
        newState.sourceCode.fileContents.splice(fileIndex, 1, {
          loadState: DataLoadState.LOADED,
          lines: sourceFileResponse.lines,
        });
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
        sourceCode: {
          ...state.sourceCode,
        },
      };
      newState.sourceCode.focusLineSpec = computeBottommostLineSpec(newState);
      return newState;
    }
  )
);

function graphOpFocusReducerHelper(
  state: DebuggerState,
  graphId: string,
  opName: string,
  graphExecutionIndex?: number
): DebuggerState {
  const newState: DebuggerState = {
    ...state,
    graphs: {
      ...state.graphs,
      focusedOp: {
        graphId,
        opName,
      },
    },
    // An graph event was last focused on, update the
    // code-location focus type to `GRAPH_OP_CREATION`.
    codeLocationFocusType: CodeLocationType.GRAPH_OP_CREATION,
    sourceCode: {
      ...state.sourceCode,
    },
  };
  newState.sourceCode.focusLineSpec = computeBottommostLineSpec(newState);
  if (graphExecutionIndex !== undefined) {
    newState.graphExecutions = {
      ...state.graphExecutions,
      focusIndex: graphExecutionIndex,
    };
  }
  return newState;
}

// TODO(cais): Refactor the reducers into separate child reducers and
// move them to separate files. Combine them with `combineReducers()`
// for better maintainability.
export function reducers(state: DebuggerState, action: Action) {
  return reducer(state, action);
}
