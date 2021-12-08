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

import {createAction, props} from '@ngrx/store';
import {
  ExecutionDataResponse,
  ExecutionDigestsResponse,
  GraphExecutionDataResponse,
  SourceFileResponse,
} from '../data_source/tfdbg2_data_source';
import {
  Alert,
  AlertsBreakdown,
  AlertType,
  DebuggerRunListing,
  GraphOpInfo,
  SourceFileSpec,
  StackFrame,
  StackFramesById,
} from '../store/debugger_types';

/**
 * Actions for Debugger V2.
 */

/**
 * Actions for the Debugger Component.
 */
export const debuggerLoaded = createAction('[Debugger] Debugger Loaded');

export const debuggerUnloaded = createAction('[Debugger] Debugger Unloaded');

export const debuggerDataPollOnset = createAction(
  '[Debugger] A New Debugger Data Polling Event Begins'
);

export const debuggerRunsRequested = createAction(
  '[Debugger] Debugger Runs Requested'
);

export const debuggerRunsLoaded = createAction(
  '[Debugger] Debugger Runs Loaded',
  props<{runs: DebuggerRunListing}>()
);

export const debuggerRunsRequestFailed = createAction(
  '[Debugger] Debugger Runs Request Failed'
);

/**
 * Number of alerts and their type breakdown or detailed alerts are requested.
 */
export const numAlertsAndBreakdownRequested = createAction(
  '[Debugger] Number and Breakdown of Alerts Requested'
);

/**
 * Number of alerts and their type breakdown are loaded.
 */
export const numAlertsAndBreakdownLoaded = createAction(
  '[Debugger] Number and Breakdown of Alerts Loaded',
  props<{numAlerts: number; alertsBreakdown: AlertsBreakdown}>()
);

export const alertsOfTypeLoaded = createAction(
  '[Debugger] Alerts Data of an AlertType Is Loaded',
  props<{
    numAlerts: number;
    alertsBreakdown: AlertsBreakdown;
    alertType: string; // TODO(cais): Better typing.
    begin: number;
    end: number;
    alerts: Alert[];
  }>()
);

export const alertTypeFocusToggled = createAction(
  '[Debugger] Alert Type Focus Toggled',
  props<{alertType: AlertType}>()
);

/**
 * Actions related to top-level (eager) execution
 */
export const numExecutionsRequested = createAction(
  '[Debugger] Number of Top-Level Executions Requested'
);

export const numExecutionsLoaded = createAction(
  '[Debugger] Number of Top-Level Executions Loaded',
  props<{numExecutions: number}>()
);

export const executionDigestsRequested = createAction(
  '[Debugger] ExecutionDigests Requested',
  props<{begin: number; end: number}>()
);

export const executionDigestsLoaded = createAction(
  '[Debugger] ExecutionDigests Loaded',
  props<ExecutionDigestsResponse>()
);

export const executionScrollLeft = createAction(
  '[Debugger] Scroll Leftward on the Execution Timeline'
);

export const executionScrollRight = createAction(
  '[Debugger] Scroll Rightward on the Execution Timeline'
);

export const executionScrollToIndex = createAction(
  '[Debugger] Scroll the Execution Timeline to Given Index',
  props<{index: number}>()
);

export const executionDigestFocused = createAction(
  '[Debugger] Execution Data Objects Being Focused On',
  props<{displayIndex: number}>()
);

export const executionDataLoaded = createAction(
  '[Debugger] Execution Data Objects Loaded',
  props<ExecutionDataResponse>()
);

/**
 * Actions related to intra-graph execution
 */
export const numGraphExecutionsRequested = createAction(
  '[Debugger] Number of Intra-Graph Executions Requested'
);

export const numGraphExecutionsLoaded = createAction(
  '[Debugger] Number of Intra-Graph Executions Loaded',
  props<{numGraphExecutions: number}>()
);

export const graphExecutionDataRequested = createAction(
  '[Debugger] Intra-Graph Execution Data Requested',
  props<{pageIndex: number}>()
);

export const graphExecutionDataLoaded = createAction(
  '[Debugger] Intra-Graph Execution Data Loaded',
  props<GraphExecutionDataResponse>()
);

export const graphExecutionScrollToIndex = createAction(
  '[Debugger] Scroll Intra-Graph Execution List to Given Index',
  props<{index: number}>()
);

export const graphExecutionFocused = createAction(
  '[Debugger] Graph Execution is Focused On',
  props<{index: number; graph_id: string; op_name: string}>()
);

/**
 * Actions related to graph ops.
 */

export const graphOpFocused = createAction(
  '[Debugger] Graph Op Is Focused On',
  props<{graph_id: string; op_name: string}>()
);

export const graphOpInfoRequested = createAction(
  '[Debugger] Graph Op Info Requested',
  props<{graph_id: string; op_name: string}>()
);

export const graphOpInfoLoaded = createAction(
  '[Debugger] Graph Op Info Loaded',
  props<{graphOpInfoResponse: GraphOpInfo}>()
);

/**
 * Actions related to source files and stack traces.
 */
export const sourceFileListRequested = createAction(
  '[Debugger] Source File List Requested.'
);

export const sourceFileListLoaded = createAction(
  '[Debugger] Source File List Loaded',
  props<{sourceFiles: SourceFileSpec[]}>()
);

export const sourceLineFocused = createAction(
  '[Debugger] Source File Line Is Focused on',
  props<{stackFrame: StackFrame}>()
);

export const sourceFileRequested = createAction(
  '[Debugger] Source File Requested',
  props<SourceFileSpec>()
);

export const sourceFileLoaded = createAction(
  '[Debugger] Source File Loaded',
  props<SourceFileResponse>()
);

export const stackFramesLoaded = createAction(
  '[Debugger] A Set of Stack Frames Have Been Loaded',
  props<{stackFrames: StackFramesById}>()
);
