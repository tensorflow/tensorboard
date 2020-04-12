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

import {DataLoadState, LoadState} from '../../../../webapp/types/data';

export {DataLoadState, LoadState};

export const DEBUGGER_FEATURE_KEY = 'debugger';

export enum TensorDebugMode {
  // NOTE(cais): The string name and number values of these enums
  // need to match TensorDebugMode in tensorflow. See
  // https://github.com/tensorflow/tensorflow/blob/master/tensorflow/core/protobuf/debug_event.proto
  UNSPECIFIED = 0,
  NO_TENSOR = 1,
  CURT_HEALTH = 2,
  CONCISE_HEALTH = 3,
  FULL_HEALTH = 4,
  SHAPE = 5,
  FULL_NUMERICS = 6,
  FULL_TENSOR = 7,
  REDUCE_INF_NAN_THREE_SLOTS = 8,
}

export interface DebuggerRunMetadata {
  // Time at which the debugger run started. Seconds since the epoch.
  start_time: number;
}

export interface DebuggerRunListing {
  [runId: string]: DebuggerRunMetadata;
}

// Each item is [host_name, file_path, lineno, function].
export type StackFrame = [string, string, number, string];

export type StackFramesById = {[id: string]: StackFrame};

/**
 * Digest for top-level execution.
 *
 * Mirrors Python data structure `class ExecutionDigest` in
 * https://github.com/tensorflow/tensorflow/blob/master/tensorflow/python/debug/lib/debug_events_reader.py
 */
export interface ExecutionDigest {
  // Op type executed.
  op_type: string;

  // Output tensor device ids.
  output_tensor_device_ids: string[];
}

/**
 * Non-digest, detailed data object for a top-level execution.
 *
 * Mirrors Python data structure `class Execution` in
 * https://github.com/tensorflow/tensorflow/blob/master/tensorflow/python/debug/lib/debug_events_reader.py
 */
export interface Execution extends ExecutionDigest {
  host_name: string;

  stack_frame_ids: string[];

  tensor_debug_mode: number;

  graph_id: string | null;

  input_tensor_ids: number[];

  output_tensor_ids: number[];

  debug_tensor_values: Array<number[] | null> | null;
}

/**
 * Digest for the execution of a Tensor inside a tf.Graph (e.g., tf.function).
 *
 * Mirrors data structure `class GraphExecutionTraceDigest` in
 * https://github.com/tensorflow/tensorflow/blob/master/tensorflow/python/debug/lib/debug_events_reader.py
 */
export interface GraphExecutionDigest {
  // Debugger-generated id for the inner-most (immediately-enclosing) tf.Graph.
  graph_id: string;

  op_name: string;

  op_type: string;

  // Output slot of the tensor on the op that it belongs to.
  output_slot: number;
}

/**
 * Non-digest, detaileddata object for the execution of a Tensor inside a
 * tf.Graph (e.g., tf.function).
 *
 * Mirrors data structure `class GraphExecutionTrace` in
 * https://github.com/tensorflow/tensorflow/blob/master/tensorflow/python/debug/lib/debug_events_reader.py
 */
export interface GraphExecution extends GraphExecutionDigest {
  // The debugger-generated IDs of the graphs that enclose the
  // executed op (tensor), ordered from the outermost to the innermost.
  graph_ids: string[];

  tensor_debug_mode: number;

  debug_tensor_value: number[] | null;

  device_name: string;
}

export enum AlertType {
  FUNCTION_RECOMPILE_ALERT = 'FunctionRecompilesAlert',
  INF_NAN_ALERT = 'InfNanAlert',
  TENSOR_SHAPE_ALERT = 'TensorShapeAlert',
}

export interface Alert {
  // TODO(cais): Add more possibilities to it.
  alert_type: AlertType;
}

export interface InfNanAlert extends Alert {
  alert_type: AlertType.INF_NAN_ALERT;

  op_type: string;

  output_slot: number;

  size: number;

  num_neg_inf: number;

  num_pos_inf: number;

  num_nan: number;

  execution_index: number;

  // This value is a `number` (non-negative integer) for InfNanAlerts due to
  // intra-graph execution. It is `null` for InfNanAlerts due to eager
  // execution.
  graph_execution_trace_index: number | null;
}

export interface ExecutionDigestLoadState extends LoadState {
  // A map from page number to whether the page has been loaded
  //   - in full, in which case the value is pageSize.
  //   - partially, in which case the value is an integer < pageSize.
  pageLoadedSizes: {[page: number]: number};

  // Number of top-level executions available at the data source (not
  // necessarily loaded by frontend yet.)
  numExecutions: number;
}

// A map from the type of alert (e.g., 'InfNanAlert') to count of alerts
// of that type.
// TODO(cais): Explore tighter typing for `alertType`, ideally by using
// the enum values from `AlertType`.
export type AlertsBreakdown = {[alertType: string]: number};

// Alerts indexed by indices.
// The index can be either within a particular AlertType, all across
// all AlertTypes, depending on where this type is used.
export type AlertsByIndex = {[index: number]: Alert};

export interface Alerts {
  // Load state for alerts.
  // This state can go from LOADED to LOADING, as the alerts can be loaded
  // incrementally from the backend.
  alertsLoaded: LoadState;

  // Total number of alerts.
  numAlerts: number;

  alertsBreakdown: AlertsBreakdown;

  // The alerts that have been loaded so far, by alertType.
  // The indices in the value `AlertsByIndex` are indices with in the
  // specific `alertType`.
  alerts: {[alertType: string]: AlertsByIndex};

  // A map from alert index to top-level execution index, arranged by alert
  // types. Applicable only to alerts that involve top-level execution.
  executionIndices: {[alertType: string]: number[]};

  // Which type of existing alerts is focused on (if any).
  // `null` corresponds to no focus.
  focusType: AlertType | null;
}

/**
 * Base interface shared between top-level and intra-graph executions.
 *
 * Supports paged lazy loading of digess (i.e., concise data objects
 * about the execution events.)
 */
export interface PagedExecutions {
  // Load state for the total number of top-level or intra-graph executions.
  // numExecutionsLoaded load state can go from LOADED to LOADING, as
  // the backend may keep reading in new data and see an increase in
  // the number of execution events, which the frontend will in turn see.
  numExecutionsLoaded: LoadState;

  // Load state for loading `ExecutionDigest`s or `GraphExecutionDigest`s.
  // executionDigestsLoaded load state can go from LOADED to LOADING, as
  // the execution digests are loaded in pages.
  executionDigestsLoaded: ExecutionDigestLoadState;

  // Page size used for accessing data source. For example,
  // if `pageSize` is 1000, each request to the data source
  // will have a beginning index `1000 * N`, where N is a non-negative
  // integer. It will have an ending index of `1000 * (N + 1)` if it
  // doesn't exceed `numExecutions`; otherwise, the ending index will
  // be `numExecutions`.
  pageSize: number;

  // Number of indices to display on the screen at a time.
  displayCount: number;

  // Beginning index of the current scrolling position.
  scrollBeginIndex: number;

  // Index of focusing. `null` means no focus has been selected.
  focusIndex: number | null;
}

/**
 * State of loading of top-level executions.
 */
export interface Executions extends PagedExecutions {
  // Top-level (eager) execution digests the frontend has loaded so far.
  executionDigests: {[index: number]: ExecutionDigest};

  // Detailed data objects about top-level execution.
  executionData: {[index: number]: Execution};
}

/**
 * State of loading of intra-graph executions.
 */
export interface GraphExecutions extends PagedExecutions {
  // Intra-graph execution digests the frontend has loaded so far.
  graphExecutionDigests: {[index: number]: GraphExecutionDigest};

  // Detailed data objects about intra-graph execution.
  graphExecutionData: {[index: number]: Execution};
}

// The state of a loaded DebuggerV2 run.
export interface RunState {
  executions: Executions;
}

// A source-code file.
export interface SourceFileSpec {
  host_name: string;
  file_path: string;
}

// A specific line of a source-code file, i.e., a stack frame.
export interface SourceLineSpec extends SourceFileSpec {
  lineno: number;
}

// The content and loading state of a single source file.
export interface SourceFileContent {
  loadState: DataLoadState;

  // Text of the source file, line-by-line.
  // Use `null` for the state wherein the file is not loaded yet.
  lines: string[] | null;
}

export interface SourceCodeState {
  sourceFileListLoaded: LoadState;

  // An index for all source-code files involved in the
  // execution of the debugged proram, including eager
  // execution and graph building.
  sourceFileList: SourceFileSpec[];

  // The contents and loading states of individual source files,
  // in the order that corresponds to `sourceFileList`.
  fileContents: SourceFileContent[];

  // Index for the source line being focused on. The index is for
  // the array in `sourceFileList`.
  // Use `null` for the case wherein no line is focused on.
  focusLineSpec: SourceLineSpec | null;
}

export interface DebuggerState {
  // Runs that are available in the backend.
  runs: DebuggerRunListing;
  runsLoaded: LoadState;

  // ID of the run being currently displayed.
  // TODO(cais): The Debugger V2 plugin currently handles only one single run in
  // its frontend. Expand the support to multiple runs.
  activeRunId: string | null;

  alerts: Alerts;

  // Per-run data for top-level (eager) executions.
  executions: Executions;

  // Per-run data for intra-graph (eager) executions.
  graphExecutions: GraphExecutions;

  // Stack frames that have been loaded from data source so far, keyed by
  // stack-frame IDs.
  stackFrames: StackFramesById;

  sourceCode: SourceCodeState;
}

export interface State {
  [DEBUGGER_FEATURE_KEY]: DebuggerState;
}
