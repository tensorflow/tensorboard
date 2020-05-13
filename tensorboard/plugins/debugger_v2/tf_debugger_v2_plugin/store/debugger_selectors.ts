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

import {createSelector, createFeatureSelector} from '@ngrx/store';
import {findFileIndex} from './debugger_store_utils';
import {
  AlertsBreakdown,
  AlertsByIndex,
  AlertType,
  DataLoadState,
  DEBUGGER_FEATURE_KEY,
  DebuggerRunListing,
  DebuggerState,
  Execution,
  ExecutionDigest,
  ExecutionDigestLoadState,
  GraphExecution,
  GraphOpConsumerSpec,
  GraphOpInfo,
  GraphOpInputSpec,
  Graphs,
  LoadState,
  SourceFileContent,
  SourceFileSpec,
  SourceLineSpec,
  StackFrame,
  StackFramesById,
  State,
} from './debugger_types';

// HACK: These imports are for type inference.
// https://github.com/bazelbuild/rules_nodejs/issues/1013
/** @typehack */ import * as _typeHackSelector from '@ngrx/store/src/selector';
/** @typehack */ import * as _typeHackStore from '@ngrx/store/store';

const selectDebuggerState = createFeatureSelector<State, DebuggerState>(
  DEBUGGER_FEATURE_KEY
);

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

export const getAlertsLoaded = createSelector(
  selectDebuggerState,
  (state: DebuggerState): LoadState => {
    return state.alerts.alertsLoaded;
  }
);

export const getNumAlerts = createSelector(
  selectDebuggerState,
  (state: DebuggerState): number => {
    return state.alerts.numAlerts;
  }
);

export const getAlertsFocusType = createSelector(
  selectDebuggerState,
  (state: DebuggerState): AlertType | null => {
    return state.alerts.focusType;
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
  selectDebuggerState,
  (state: DebuggerState): number => {
    if (state.alerts.focusType === null) {
      return 0;
    }
    return state.alerts.alertsBreakdown[state.alerts.focusType] || 0;
  }
);

/**
 * Get the Alerts that are 1) of the type being focused on, and
 * 2) already loaded by the front end.
 *
 * If no alert type focus exists, returns null.
 */
export const getLoadedAlertsOfFocusedType = createSelector(
  selectDebuggerState,
  (state: DebuggerState): AlertsByIndex | null => {
    if (state.alerts.focusType === null) {
      return null;
    }
    if (state.alerts.alerts[state.alerts.focusType] === undefined) {
      return null;
    }
    return state.alerts.alerts[state.alerts.focusType];
  }
);

export const getAlertsBreakdown = createSelector(
  selectDebuggerState,
  (state: DebuggerState): AlertsBreakdown => {
    return state.alerts.alertsBreakdown;
  }
);

/**
 * Selectors related to top-level (eager) execution.
 */

export const getNumExecutionsLoaded = createSelector(
  selectDebuggerState,
  (state: DebuggerState): LoadState => {
    return state.executions.numExecutionsLoaded;
  }
);

export const getExecutionDigestsLoaded = createSelector(
  selectDebuggerState,
  (state: DebuggerState): ExecutionDigestLoadState => {
    return state.executions.executionDigestsLoaded;
  }
);

export const getNumExecutions = createSelector(
  selectDebuggerState,
  (state: DebuggerState): number => {
    return state.executions.executionDigestsLoaded.numExecutions;
  }
);

export const getExecutionScrollBeginIndex = createSelector(
  selectDebuggerState,
  (state: DebuggerState): number => {
    return state.executions.scrollBeginIndex;
  }
);

export const getExecutionPageSize = createSelector(
  selectDebuggerState,
  (state: DebuggerState): number => {
    return state.executions.pageSize;
  }
);

export const getDisplayCount = createSelector(
  selectDebuggerState,
  (state: DebuggerState): number => {
    return state.executions.displayCount;
  }
);

export const getVisibleExecutionDigests = createSelector(
  selectDebuggerState,
  (state: DebuggerState): Array<ExecutionDigest | null> => {
    const digests: Array<ExecutionDigest | null> = [];
    for (
      let executionIndex = state.executions.scrollBeginIndex;
      executionIndex <
      state.executions.scrollBeginIndex + state.executions.displayCount;
      ++executionIndex
    ) {
      if (executionIndex in state.executions.executionDigests) {
        digests.push(state.executions.executionDigests[executionIndex]);
      } else {
        digests.push(null);
      }
    }
    return digests;
  }
);

/**
 * Selectors related to intra-graph execution.
 */

export const getNumGraphExecutionsLoaded = createSelector(
  selectDebuggerState,
  (state: DebuggerState): LoadState => {
    return state.graphExecutions.numExecutionsLoaded;
  }
);

export const getNumGraphExecutions = createSelector(
  selectDebuggerState,
  (state: DebuggerState): number => {
    return state.graphExecutions.executionDigestsLoaded.numExecutions;
  }
);

export const getGraphExecutionScrollBeginIndex = createSelector(
  selectDebuggerState,
  (state: DebuggerState): number => {
    return state.graphExecutions.scrollBeginIndex;
  }
);

export const getGraphExecutionDisplayCount = createSelector(
  selectDebuggerState,
  (state: DebuggerState): number => {
    return state.graphExecutions.displayCount;
  }
);

export const getGraphExecutionPageSize = createSelector(
  selectDebuggerState,
  (state: DebuggerState): number => {
    return state.graphExecutions.pageSize;
  }
);

export const getGraphExecutionDataLoadingPages = createSelector(
  selectDebuggerState,
  (state: DebuggerState): number[] => {
    return state.graphExecutions.graphExecutionDataLoadingPages;
  }
);

export const getGraphExecutionDataPageLoadedSizes = createSelector(
  selectDebuggerState,
  (state: DebuggerState): {[page: number]: number} => {
    return state.graphExecutions.graphExecutionDataPageLoadedSizes;
  }
);

export const getGraphExecutionData = createSelector(
  selectDebuggerState,
  (state: DebuggerState): {[index: number]: GraphExecution} => {
    return state.graphExecutions.graphExecutionData;
  }
);

export const getGraphExecutionFocusIndex = createSelector(
  selectDebuggerState,
  (state: DebuggerState): number | null => {
    return state.graphExecutions.focusIndex;
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
      return ops[focusedOp.graphId][focusedOp.opName] || null;
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
      ops[focusedOp.graphId][focusedOp.opName] === undefined
    ) {
      return null;
    } else {
      const graph = ops[focusedOp.graphId];
      const {inputs} = graph[focusedOp.opName];
      return inputs.map((inputSpec) => {
        const spec: GraphOpInputSpec = {
          ...inputSpec,
        };
        if (graph[inputSpec.op_name]) {
          spec.data = graph[inputSpec.op_name];
        }
        return spec;
      });
    }
  }
);

export const getFocusedGraphOpConsumers = createSelector(
  selectDebuggerGraphs,
  (graphs: Graphs): GraphOpConsumerSpec[][] | null => {
    const {focusedOp, ops} = graphs;
    if (
      focusedOp === null ||
      ops[focusedOp.graphId] === undefined ||
      ops[focusedOp.graphId][focusedOp.opName] === undefined
    ) {
      return null;
    } else {
      const graph = ops[focusedOp.graphId];
      const {consumers} = graph[focusedOp.opName];
      return consumers.map((slotConsumers) => {
        return slotConsumers.map((consumerSpec) => {
          const spec: GraphOpConsumerSpec = {...consumerSpec};
          if (graph[consumerSpec.op_name]) {
            spec.data = graph[consumerSpec.op_name];
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

export const getFocusedExecutionIndex = createSelector(
  selectDebuggerState,
  (state: DebuggerState): number | null => {
    return state.executions.focusIndex;
  }
);

/**
 * Get the display index of the execution digest being focused on (if any).
 */
export const getFocusedExecutionDisplayIndex = createSelector(
  selectDebuggerState,
  (state: DebuggerState): number | null => {
    if (state.executions.focusIndex === null) {
      return null;
    }
    const {focusIndex, scrollBeginIndex, displayCount} = state.executions;
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
  selectDebuggerState,
  (state: DebuggerState): {[index: number]: Execution} =>
    state.executions.executionData
);

export const getLoadingGraphOps = createSelector(
  selectDebuggerState,
  (
    state: DebuggerState
  ): {[graph_id: string]: {[op_name: string]: DataLoadState}} =>
    state.graphs.loadingOps
);

export const getLoadedStackFrames = createSelector(
  selectDebuggerState,
  (state: DebuggerState): StackFramesById => state.stackFrames
);

export const getFocusedExecutionData = createSelector(
  selectDebuggerState,
  (state: DebuggerState): Execution | null => {
    const {focusIndex, executionData} = state.executions;
    if (focusIndex === null || executionData[focusIndex] === undefined) {
      return null;
    }
    return executionData[focusIndex];
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
export const getFocusedExecutionStackFrames = createSelector(
  selectDebuggerState,
  (state: DebuggerState): StackFrame[] | null => {
    const {focusIndex, executionData} = state.executions;
    if (focusIndex === null || executionData[focusIndex] === undefined) {
      return null;
    }
    const stackFrameIds = executionData[focusIndex].stack_frame_ids;
    const stackFrames: StackFrame[] = [];
    for (const stackFrameId of stackFrameIds) {
      if (state.stackFrames[stackFrameId] != null) {
        stackFrames.push(state.stackFrames[stackFrameId]);
      } else {
        return null;
      }
    }
    return stackFrames;
  }
);

export const getSourceFileListLoaded = createSelector(
  selectDebuggerState,
  (state: DebuggerState): LoadState => {
    return state.sourceCode.sourceFileListLoaded;
  }
);

export const getSourceFileList = createSelector(
  selectDebuggerState,
  (state: DebuggerState): SourceFileSpec[] => {
    return state.sourceCode.sourceFileList;
  }
);

export const getFocusedSourceFileIndex = createSelector(
  selectDebuggerState,
  (state: DebuggerState): number => {
    const {sourceFileList, focusLineSpec} = state.sourceCode;
    if (focusLineSpec === null) {
      return -1;
    }
    return findFileIndex(sourceFileList, focusLineSpec);
  }
);

export const getFocusedSourceFileContent = createSelector(
  selectDebuggerState,
  getFocusedSourceFileIndex,
  (state: DebuggerState, fileIndex: number): SourceFileContent | null => {
    if (fileIndex === -1) {
      return null;
    }
    return state.sourceCode.fileContents[fileIndex] || null;
  }
);

export const getFocusedSourceLineSpec = createSelector(
  selectDebuggerState,
  (state: DebuggerState): SourceLineSpec | null => {
    return state.sourceCode.focusLineSpec;
  }
);
