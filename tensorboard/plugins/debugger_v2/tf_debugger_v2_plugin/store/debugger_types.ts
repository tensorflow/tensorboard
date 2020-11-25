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

/**
 * Information about an op in a TensorFlow graph.
 *
 * Including its enclosing graph, relation with other ops in the graph
 * (inputs and consumers), and the source-code location (stack trace)
 * at which the op was created.
 */
export interface GraphOpInfo {
  // Op type (e.g., "MatMul").
  op_type: string;

  // Op name, i.e., name of the node in the graph, (e.g., "Dense_2/MatMul").
  op_name: string;

  device_name: string;

  // IDs of the enclosing graphs for this op, from outermost to innermost.
  graph_ids: string[];

  // Number of symoblic tensors output by the op.
  // This is equal to the length of `output_tensor_ids`.
  num_outputs: number;

  // Debugger-generated IDs for the symbolic output tensor(s) of this op.
  // For an op without output tensors, this is an empty array.
  output_tensor_ids: number[];

  // The name of the host on which the op is created.
  host_name: string;

  // IDs of the frame of the stack trace at which the op is created.
  stack_frame_ids: string[];

  // Op names and slots of the immediate data input to the op.
  //`[]` if an op has no data input tensors.
  // This field does *not* track control inputs.
  // E.g., `[{op_name: "Dense_2/ReadVariableOp_1:0", output_slot: 0},
  //         {op_name: "Input:0", output_slot: 0}]`
  inputs: GraphOpInputSpec[];

  // Op names and slots of the immediate consumers of the op's output tensors.
  // `[]` if the op provides no output tensors.
  // If any of the output tensors of the op has no consumers, the corresponding
  // element will be `[]`.
  consumers: GraphOpConsumerSpec[][];
}

/**
 * Specification of an input tensor to a graph op.
 */
export interface GraphOpInputSpec {
  // Name of the graph op that provides the input tensor.
  op_name: string;

  // 0-based output slot index at which the op provides the input tensor.
  output_slot: number;

  // Optional recursive information about the input-providing op.
  // This is not populated in two cases:
  //   1. At the "leaf nodes" of this recursive data structure. For example,
  //      the state may contain only one level of inputs to an op, in which
  //      case the immediate inputs to the op this concerns are the leaf nodes.
  //   2. When the information is not available (e.g., backend lookup
  //      failure related to special internal ops not tracked by the debugger).
  data?: GraphOpInfo;
}

/**
 * Specification of an op consuming an graph op's output tensor.
 */
export interface GraphOpConsumerSpec {
  // Name of the graph op that consumes the output tensor.
  op_name: string;

  // 0-based input slot index at which the op consumes the output tensor.
  input_slot: number;

  // Optional recursive information about the output-consuming op.
  // This is not populated in two cases:
  //   1. At the "leaf nodes" of this recursive data structure. For example,
  //      the state may contain only one level of consumers to an op, in which
  //      case the immediate consumers of the op this concerns are the leaf nodes.
  //   2. When the information is not available (e.g., backend lookup
  //      failure related to special internal ops not tracked by the debugger).
  data?: GraphOpInfo;
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

/**
 * Values that summarize a tensor watched by the debugger.
 */
export interface DebugTensorValue {
  // Data type of the tensor.
  dtype?: string;

  // Rank of the tensor (e.g., 0 for scalar, 1 for 1D tensor, etc.)
  rank?: number;

  // Shape of the tensor.
  // In the case where the shape is truncated beyond the highest
  // rank a debug mode can represent, the truncated part is filled with
  // `undefined`s.
  shape?: Array<undefined | number>;

  // Size (total element count) of the tensor.
  size?: number;

  // Number of NaN elements.
  numNaNs?: number;

  // Number of -Infinity elements.
  numNegativeInfs?: number;

  // Number of +Infinity elements.
  numPositiveInfs?: number;

  // Number of finite negative elements.
  numNegativeFinites?: number;

  // Numbe of zeros elements.
  numZeros?: number;

  // Number of finite positive elements.
  numPositiveFinites?: number;

  // Whether the tensor contains any NaN or Infinity elements.
  hasInfOrNaN?: boolean;

  // Minimum value.
  min?: number;

  // Maximum value.
  max?: number;

  // Arithmetic mean.
  mean?: number;

  // Variance.
  variance?: number;
}

export interface ExecutionDigestLoadState {
  // A map from page number to whether the page has been loaded
  //   - in full, in which case the value is pageSize.
  //   - partially, in which case the value is an integer < pageSize.
  pageLoadedSizes: {[page: number]: number};

  // Execution-digest indices that are currently loading.
  loadingRanges: Array<{begin: number; end: number}>;

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

  // A map from alert type to top-level execution indices.
  // Applicable only to alerts that involve top-level execution.
  executionIndices: {[alertType: string]: number[]};

  // A map from alert type to intra-graph execution indices.
  // Applicable only to alerts that involve intra-graph execution.
  graphExecutionIndices: {[alertType: string]: number[]};

  // Which type of existing alerts is focused on (if any).
  // `null` corresponds to no focus.
  focusType: AlertType | null;
}

/**
 * Base interface shared between top-level and intra-graph executions.
 *
 * Supports paged, lazy loading of digests (i.e., concise data objects
 * about the top-level or intra-graph execution events.)
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

  // Indices to GraphExecution pages currently being loaded.
  graphExecutionDataLoadingPages: number[];

  // Number of items in each `GraphExecution` page that have been loaded.
  graphExecutionDataPageLoadedSizes: {[page: number]: number};

  // Detailed data objects about intra-graph execution.
  graphExecutionData: {[index: number]: GraphExecution};
}

/**
 * State of TensorFlow computation graphs known to the debugger.
 */
export interface Graphs {
  // Information about ops in graphs, indexed by: graph_id / op_name.
  // `graph_id` refers to the immediately-enclosing graph of the ops.
  ops: {
    [graph_id: string]: Map<string, GraphOpInfo>;
  };

  // What ops are currently being loaded from the data source.
  // `graph_id` refers to the immediately-enclosing graph of the ops.
  loadingOps: {
    [graph_id: string]: Map<string, DataLoadState>;
  };

  // Op being focused on in the UI (if any).
  // `null` is for the case in which there is no focus on any graph op.
  focusedOp: {
    graphId: string;
    opName: string;
  } | null;
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
export interface StackFrame extends SourceFileSpec {
  lineno: number;
  function_name: string;
}

// Stack frame represented as an array. Used to represent the
// stack-frame-related responses from the data soruces.
// The semantics of the elements are:
//   `[host_name, file_path, lineno, function_name]`,
// wherein `lineno` is 1-based.
export type StackFrameAsArray = [string, string, number, string];

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

  // Index for the source line being focused on by the user.
  // The index is for the array in `sourceFileList`.
  // Use `null` for the case wherein no line is focused on.
  focusLineSpec: StackFrame | null;
}

export interface DebuggerState {
  // Runs that are available in the backend.
  runs: DebuggerRunListing;
  runsLoaded: LoadState;

  // Timestamp for the onset of the last data polling (including the
  // initial data-loading event triggered by plugin loading,
  // and those triggered by TensorBoard's core auto and manual
  // reloading).
  // -1 is used as the initial value to indicate that no polling
  // has ever happened.
  lastDataPollOnsetTimeMs: number;
  // Timestamp for the last non-empty data polling result (including errors).
  // This is updated when any of the following is refreshed:
  // - activeRunId
  // - executions.executionDigestsLoaded.numExecutions
  // - graphExecutions.executionDigestsLoaded.numExecutions
  // - alerts.alertsLoaded.numAlerts
  // -1 is used as the initial value to indicate that no non-empty
  // polling result has arrived.
  lastNonEmptyPollDataTimeMs: number;

  // ID of the run being currently displayed.
  // TODO(cais): The Debugger V2 plugin currently handles only one single run in
  // its frontend. Expand the support to multiple runs.
  activeRunId: string | null;

  alerts: Alerts;

  // Per-run data for top-level (eager) executions.
  executions: Executions;

  // Per-run data for intra-graph (eager) executions.
  graphExecutions: GraphExecutions;

  // Per-run data for graph ops.
  graphs: Graphs;

  // Stack frames that have been loaded from data source so far, keyed by
  // stack-frame IDs.
  stackFrames: StackFramesById;

  // Whether the bottommost frame in a focused source file should be
  // automatically focused on.
  //
  // N.B.: Python stack frames are printed from bottommost to topmost,
  // so what we mean by a "bottommost" stack frame is actually the one that
  // appears at the top in a stack trace in most other languages such as
  // Java and C++.
  stickToBottommostFrameInFocusedFile: boolean;

  // What the currently focused code location (stack trace) describes.
  //   - `null` is for the case where no code location is focused on.
  //   - `CodeLocationType.EXECUTION` is for the code location of an eager
  //     (top-level) execution.
  //   - `CodeLocationType.GRAPH_OP_CREATION` is for the code location of
  //     the creation of a graph op.
  // This state is currently set based on what relevant part of the UI
  // was clicked by the user most recently: whether it is an event in the
  // eager-execution timeline or an item in the graph-execution scroll.
  codeLocationFocusType: CodeLocationType | null;

  sourceCode: SourceCodeState;
}

/**
 * The type of origin of a code location (incl. stack trace).
 */
export enum CodeLocationType {
  // The code location for an eager (top-level) execution.
  EXECUTION,

  // The code location for the creation of of an op (node) in a graph.
  GRAPH_OP_CREATION,
}

/**
 * Information regarding the origin of a code location (incl. stack trace).
 * This base interface is inherited by child interfaces for eager execution
 * and graph-op creation, respectively.
 */
export interface CodeLocationOrigin {
  codeLocationType: CodeLocationType;

  opType: string;
}

/**
 * A code location originated from an eager (top-level) execution event.
 */
export interface CodeLocationExecutionOrigin extends CodeLocationOrigin {
  codeLocationType: CodeLocationType.EXECUTION;

  executionIndex: number;
}

/**
 * A code location originated from a graph-op creation event.
 */
export interface CodeLocationGraphOpCreationOrigin extends CodeLocationOrigin {
  codeLocationType: CodeLocationType.GRAPH_OP_CREATION;

  opName: string;
}

export interface State {
  [DEBUGGER_FEATURE_KEY]?: DebuggerState;
}
