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

import {createFeatureSelector, createSelector} from '@ngrx/store';
import {getFocusedStackFramesHelper} from './debugger_store_helpers';
import {findFileIndex} from './debugger_store_utils';
import {
  Alerts,
  AlertsBreakdown,
  AlertsByIndex,
  AlertType,
  CodeLocationExecutionOrigin,
  CodeLocationGraphOpCreationOrigin,
  CodeLocationType,
  DataLoadState,
  DebuggerRunListing,
  DebuggerState,
  DEBUGGER_FEATURE_KEY,
  Execution,
  ExecutionDigest,
  ExecutionDigestLoadState,
  Executions,
  GraphExecution,
  GraphExecutions,
  GraphOpConsumerSpec,
  GraphOpInfo,
  GraphOpInputSpec,
  Graphs,
  LoadState,
  SourceCodeState,
  SourceFileContent,
  SourceFileSpec,
  StackFrame,
  StackFramesById,
} from './debugger_types';

const selectDebuggerState =
  createFeatureSelector<DebuggerState>(DEBUGGER_FEATURE_KEY);

export const getDebuggerRunListing = createSelector(
  selectDebuggerState,
  (state: DebuggerState): DebuggerRunListing => {
    return state.runs;
  }
);

export const getDebuggerRunsLoaded = createSelector(
  selectDebuggerState,
  (state: DebuggerState): LoadState => state.runsLoaded
);

export const getActiveRunId = createSelector(
  selectDebuggerState,
  (state: DebuggerState): string | null => state.activeRunId
);

/**
 * Selectors related to data polling.
 */

/**
 * Get the time elapsed from the last time at which a data polling
 * yielded new data and the last polling time, in milliseconds.
 * That is: this is how long polling has yielded no new data.
 */
export const getPollSilenceTimeMs = createSelector(
  selectDebuggerState,
  (state: DebuggerState): number => {
    return state.lastDataPollOnsetTimeMs - state.lastNonEmptyPollDataTimeMs;
  }
);

/**
 * Intermediate selector for alerts.
 */
const selectAlerts = createSelector(
  selectDebuggerState,
  (state: DebuggerState): Alerts => state.alerts
);

export const getAlertsLoaded = createSelector(
  selectAlerts,
  (alerts: Alerts): LoadState => {
    return alerts.alertsLoaded;
  }
);

export const getNumAlerts = createSelector(
  selectAlerts,
  (alerts: Alerts): number => {
    return alerts.numAlerts;
  }
);

export const getAlertsFocusType = createSelector(
  selectAlerts,
  (alerts: Alerts): AlertType | null => {
    return alerts.focusType;
  }
);

/**
 * Get number of alerts of the alert type being focused on.
 *
 * If no alert type focus exists, returns 0.
 * The returned number is regardless of whether the detailed Alerts
 * data have been loaded by the front end.
 */
export const getNumAlertsOfFocusedType = createSelector(
  selectAlerts,
  (alerts: Alerts): number => {
    if (alerts.focusType === null) {
      return 0;
    }
    return alerts.alertsBreakdown[alerts.focusType] || 0;
  }
);

/**
 * Get the Alerts that are 1) of the type being focused on, and
 * 2) already loaded by the front end.
 *
 * If no alert type focus exists, returns null.
 */
export const getLoadedAlertsOfFocusedType = createSelector(
  selectAlerts,
  (alerts: Alerts): AlertsByIndex | null => {
    if (alerts.focusType === null) {
      return null;
    }
    if (alerts.alerts[alerts.focusType] === undefined) {
      return null;
    }
    return alerts.alerts[alerts.focusType];
  }
);

export const getAlertsBreakdown = createSelector(
  selectAlerts,
  (alerts: Alerts): AlertsBreakdown => {
    return alerts.alertsBreakdown;
  }
);

/**
 * Selectors related to top-level (eager) execution.
 */

/**
 * Intermeidate selector for executions.
 */
export const selectExecutionsState = createSelector(
  selectDebuggerState,
  (state: DebuggerState): Executions => state.executions
);

export const getNumExecutionsLoaded = createSelector(
  selectExecutionsState,
  (executions: Executions): LoadState => {
    return executions.numExecutionsLoaded;
  }
);

export const getExecutionDigestsLoaded = createSelector(
  selectExecutionsState,
  (executions: Executions): ExecutionDigestLoadState => {
    return executions.executionDigestsLoaded;
  }
);

export const getNumExecutions = createSelector(
  selectExecutionsState,
  (executions: Executions): number => {
    return executions.executionDigestsLoaded.numExecutions;
  }
);

export const getExecutionScrollBeginIndex = createSelector(
  selectExecutionsState,
  (executions: Executions): number => {
    return executions.scrollBeginIndex;
  }
);

export const getExecutionPageSize = createSelector(
  selectExecutionsState,
  (executions: Executions): number => {
    return executions.pageSize;
  }
);

export const getDisplayCount = createSelector(
  selectExecutionsState,
  (executions: Executions): number => {
    return executions.displayCount;
  }
);

export const getVisibleExecutionDigests = createSelector(
  selectExecutionsState,
  (executions: Executions): Array<ExecutionDigest | null> => {
    const digests: Array<ExecutionDigest | null> = [];
    for (
      let executionIndex = executions.scrollBeginIndex;
      executionIndex < executions.scrollBeginIndex + executions.displayCount;
      ++executionIndex
    ) {
      if (executionIndex in executions.executionDigests) {
        digests.push(executions.executionDigests[executionIndex]);
      } else {
        digests.push(null);
      }
    }
    return digests;
  }
);

/**
 * Selectors related to intra-graph executions.
 */

/**
 * Intermediate selector for alerts.
 */
export const selectGraphExecutions = createSelector(
  selectDebuggerState,
  (state: DebuggerState): GraphExecutions => state.graphExecutions
);

export const getNumGraphExecutionsLoaded = createSelector(
  selectGraphExecutions,
  (graphExecutions: GraphExecutions): LoadState => {
    return graphExecutions.numExecutionsLoaded;
  }
);

export const getNumGraphExecutions = createSelector(
  selectDebuggerState,
  (state: DebuggerState): number => {
    return state.graphExecutions.executionDigestsLoaded.numExecutions;
  }
);

export const getGraphExecutionScrollBeginIndex = createSelector(
  selectGraphExecutions,
  (graphExecutions: GraphExecutions): number => {
    return graphExecutions.scrollBeginIndex;
  }
);

export const getGraphExecutionDisplayCount = createSelector(
  selectGraphExecutions,
  (graphExecutions: GraphExecutions): number => {
    return graphExecutions.displayCount;
  }
);

export const getGraphExecutionPageSize = createSelector(
  selectGraphExecutions,
  (graphExecutions: GraphExecutions): number => {
    return graphExecutions.pageSize;
  }
);

export const getGraphExecutionDataLoadingPages = createSelector(
  selectGraphExecutions,
  (graphExecutions: GraphExecutions): number[] => {
    return graphExecutions.graphExecutionDataLoadingPages;
  }
);

export const getGraphExecutionDataPageLoadedSizes = createSelector(
  selectGraphExecutions,
  (graphExecutions: GraphExecutions): {[page: number]: number} => {
    return graphExecutions.graphExecutionDataPageLoadedSizes;
  }
);

export const getGraphExecutionData = createSelector(
  selectGraphExecutions,
  (graphExecutions: GraphExecutions): {[index: number]: GraphExecution} => {
    return graphExecutions.graphExecutionData;
  }
);

export const getGraphExecutionFocusIndex = createSelector(
  selectGraphExecutions,
  (graphExecutions: GraphExecutions): number | null => {
    return graphExecutions.focusIndex;
  }
);

/**
 * Intermediate selector for the graphs state of debugger.
 */
const selectDebuggerGraphs = createSelector(
  selectDebuggerState,
  (state: DebuggerState): Graphs => state.graphs
);

export const getFocusedGraphOpInfo = createSelector(
  selectDebuggerGraphs,
  (graphs: Graphs): GraphOpInfo | null => {
    const {focusedOp, ops} = graphs;
    if (focusedOp === null || ops[focusedOp.graphId] === undefined) {
      return null;
    } else {
      return ops[focusedOp.graphId].get(focusedOp.opName) || null;
    }
  }
);

export const getFocusedGraphOpInputs = createSelector(
  selectDebuggerGraphs,
  (graphs: Graphs): GraphOpInputSpec[] | null => {
    const {focusedOp, ops} = graphs;
    if (
      focusedOp === null ||
      ops[focusedOp.graphId] === undefined ||
      !ops[focusedOp.graphId].has(focusedOp.opName)
    ) {
      return null;
    } else {
      const graph = ops[focusedOp.graphId];
      const {inputs} = graph.get(focusedOp.opName)!;
      return inputs.map((inputSpec) => {
        const spec: GraphOpInputSpec = {
          ...inputSpec,
        };
        if (graph.has(inputSpec.op_name)) {
          spec.data = graph.get(inputSpec.op_name)!;
        }
        return spec;
      });
    }
  }
);

// How many graph-execution indices at most to look back in order to find the
// indices of the graph-execution events that consistute the immediate input to
// the currently focused graph-execution event.
const MAX_LOOK_BACK = 200;

/**
 * Makes best-effort attempt to find the graph-execution indices that
 * constitutes the immediate inputs to the currently-focused graph-execution
 * event.
 *
 * If no graph-execution event is currently focused on, returns `null`.
 * It may skip indices if some of the data for the graph-execution events that
 * are immediate inputs has not been loaded yet.
 * If the currently-focused graph-execution events is a no-input op, returns
 * an empty array.
 * If the immediate input events are more than `MAX_LOOK_BACK` before the
 * currently focused index (rare), the returned array may be incomplete.
 */
export const getFocusedGraphExecutionInputIndices = createSelector(
  getGraphExecutionFocusIndex,
  getGraphExecutionData,
  getFocusedGraphOpInputs,
  (
    focusIndex: number | null,
    data: {[index: number]: GraphExecution},
    opInputs: GraphOpInputSpec[] | null
  ): number[] | null => {
    if (focusIndex === null || opInputs === null) {
      return null;
    }
    const inputFound: boolean[] = opInputs.map((_) => false);
    const inputIndices: number[] = [];
    if (opInputs.length === 0) {
      return inputIndices;
    }
    const graph_id = data[focusIndex].graph_id;
    const limit = Math.max(0, focusIndex - MAX_LOOK_BACK);
    for (let i = focusIndex - 1; i >= limit; --i) {
      if (data[i] === undefined) {
        continue;
      }
      for (let j = 0; j < opInputs.length; ++j) {
        if (
          !inputFound[j] &&
          data[i].graph_id === graph_id &&
          data[i].op_name === opInputs[j].op_name &&
          data[i].output_slot === opInputs[j].output_slot
        ) {
          inputIndices.push(i);
          inputFound[j] = true;
          if (inputIndices.length === opInputs.length) {
            break;
          }
        }
      }
    }
    return inputIndices;
  }
);

export const getFocusedGraphOpConsumers = createSelector(
  selectDebuggerGraphs,
  (graphs: Graphs): GraphOpConsumerSpec[][] | null => {
    const {focusedOp, ops} = graphs;
    if (
      focusedOp === null ||
      ops[focusedOp.graphId] === undefined ||
      !ops[focusedOp.graphId].has(focusedOp.opName)
    ) {
      return null;
    } else {
      const graph = ops[focusedOp.graphId];
      const {consumers} = graph.get(focusedOp.opName)!;
      return consumers.map((slotConsumers) => {
        return slotConsumers.map((consumerSpec) => {
          const spec: GraphOpConsumerSpec = {...consumerSpec};
          if (graph.has(consumerSpec.op_name)) {
            spec.data = graph.get(consumerSpec.op_name)!;
          }
          return spec;
        });
      });
    }
  }
);

/**
 * Get the focused alert types (if any) of the execution digests current being
 * displayed. For each displayed execution digest, there are two possibilities:
 * - `null` represents no alert.
 * - An instance of the `AlertType`
 */
export const getFocusAlertTypesOfVisibleExecutionDigests = createSelector(
  selectDebuggerState,
  (state: DebuggerState): Array<AlertType | null> => {
    const beginExecutionIndex = state.executions.scrollBeginIndex;
    const endExecutionIndex =
      state.executions.scrollBeginIndex + state.executions.displayCount;
    const alertTypes: Array<AlertType | null> = new Array(
      endExecutionIndex - beginExecutionIndex
    ).fill(null);
    const focusType = state.alerts.focusType;
    if (focusType === null) {
      return alertTypes;
    }
    const executionIndices = state.alerts.executionIndices[focusType];
    if (executionIndices === undefined) {
      return alertTypes;
    }
    // TODO(cais): Explore using a Set for execution indices if this
    // part becomes a performance bottleneck in the future.
    for (let i = beginExecutionIndex; i < endExecutionIndex; ++i) {
      if (executionIndices.includes(i)) {
        alertTypes[i - beginExecutionIndex] = state.alerts.focusType;
      }
    }
    return alertTypes;
  }
);

/**
 * Intermediate selector for top-level executions.
 */
export const selectExecutions = createSelector(
  selectDebuggerState,
  (state: DebuggerState): Executions => state.executions
);

export const getFocusedExecutionIndex = createSelector(
  selectExecutions,
  (executions: Executions): number | null => {
    return executions.focusIndex;
  }
);

/**
 * Get the display index of the execution digest being focused on (if any).
 */
export const getFocusedExecutionDisplayIndex = createSelector(
  selectExecutions,
  (executions: Executions): number | null => {
    if (executions.focusIndex === null) {
      return null;
    }
    const {focusIndex, scrollBeginIndex, displayCount} = executions;
    if (
      focusIndex < scrollBeginIndex ||
      focusIndex >= scrollBeginIndex + displayCount
    ) {
      return null;
    }
    return focusIndex - scrollBeginIndex;
  }
);

export const getLoadedExecutionData = createSelector(
  selectExecutions,
  (executions: Executions): {[index: number]: Execution} =>
    executions.executionData
);

export const getLoadingGraphOps = createSelector(
  selectDebuggerState,
  (state: DebuggerState): {[graph_id: string]: Map<string, DataLoadState>} =>
    state.graphs.loadingOps
);

export const getLoadedStackFrames = createSelector(
  selectDebuggerState,
  (state: DebuggerState): StackFramesById => state.stackFrames
);

export const getFocusedExecutionData = createSelector(
  selectExecutions,
  (executions: Executions): Execution | null => {
    const {focusIndex, executionData} = executions;
    if (focusIndex === null || executionData[focusIndex] === undefined) {
      return null;
    }
    return executionData[focusIndex];
  }
);

/**
 * Get information regarding the op that's the origin of the focused
 * code location (stack trace).
 * This selector covers both eager execution and graph-op creation.
 */
export const getCodeLocationOrigin = createSelector(
  selectDebuggerState,
  getFocusedExecutionIndex,
  getFocusedExecutionData,
  getFocusedGraphOpInfo,
  (
    state: DebuggerState,
    executionIndex: number | null,
    executionData: Execution | null,
    graphOpInfo: GraphOpInfo | null
  ): CodeLocationExecutionOrigin | CodeLocationGraphOpCreationOrigin | null => {
    const {codeLocationFocusType} = state;
    if (codeLocationFocusType === null) {
      return null;
    }
    if (codeLocationFocusType === CodeLocationType.EXECUTION) {
      if (executionIndex === null || executionData === null) {
        return null;
      }
      return {
        codeLocationType: CodeLocationType.EXECUTION,
        opType: executionData.op_type,
        executionIndex,
      };
    } else {
      // This is CodeLocationType.GRAPH_OP_CREATION.
      if (graphOpInfo === null) {
        return null;
      }
      return {
        codeLocationType: CodeLocationType.GRAPH_OP_CREATION,
        opType: graphOpInfo.op_type,
        opName: graphOpInfo.op_name,
      };
    }
  }
);

/**
 * Get the stack trace (frames) of the execution event currently focused on
 * (if any).
 *
 * If no execution is focused on, returns null.
 * If any of the stack frames is missing (i.e., hasn't been loaded from
 * the data source yet), returns null.
 */
export const getFocusedStackFrames = createSelector(
  // TODO(cais): Rename this function as `getFocusedStackTrace()` to
  // minimize confusion with `getFocusedSourceLineSpec()`.
  selectDebuggerState,
  getFocusedStackFramesHelper
);

/**
 * Intermediate selector for source code.
 */
export const selectSourceCode = createSelector(
  selectDebuggerState,
  (state: DebuggerState): SourceCodeState => state.sourceCode
);

export const getSourceFileListLoaded = createSelector(
  selectSourceCode,
  (sourceCode: SourceCodeState): LoadState => {
    return sourceCode.sourceFileListLoaded;
  }
);

export const getSourceFileList = createSelector(
  selectSourceCode,
  (sourceCode: SourceCodeState): SourceFileSpec[] => {
    return sourceCode.sourceFileList;
  }
);

export const getFocusedSourceFileIndex = createSelector(
  selectSourceCode,
  (sourceCode: SourceCodeState): number => {
    const {sourceFileList, focusLineSpec} = sourceCode;
    if (focusLineSpec === null) {
      return -1;
    }
    return findFileIndex(sourceFileList, focusLineSpec);
  }
);

export const getFocusedSourceFileContent = createSelector(
  selectSourceCode,
  getFocusedSourceFileIndex,
  (
    sourceCode: SourceCodeState,
    fileIndex: number
  ): SourceFileContent | null => {
    if (fileIndex === -1) {
      return null;
    }
    return sourceCode.fileContents[fileIndex] || null;
  }
);

/**
 * Get the source-code line being focused on.
 *
 * If the `stickingToBottommostFrameInFocusedFile` state is `true` and
 * `focusedLIneSpec` is not null, this selector will return the bottommost
 * stack frame in the file in `focusedLIneSpec`.
 * Else, it'll directly return the value of `focusedLIneSpec`.
 *
 * This selector allows the UI to "track" lines in a source file of interest
 * as a user navigates executions or graph ops.
 */
export const getFocusedSourceLineSpec = createSelector(
  selectDebuggerState,
  (state: DebuggerState): StackFrame | null => state.sourceCode.focusLineSpec
);

export const getStickToBottommostFrameInFocusedFile = createSelector(
  selectDebuggerState,
  (debuggerState: DebuggerState) => {
    return debuggerState.stickToBottommostFrameInFocusedFile;
  }
);
