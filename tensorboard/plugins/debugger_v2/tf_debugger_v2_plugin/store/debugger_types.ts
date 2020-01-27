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

import {LoadState} from '../../../../webapp/types/data';

export {DataLoadState, LoadState} from '../../../../webapp/types/data';

export const DEBUGGER_FEATURE_KEY = 'debugger';

export enum TensorDebugMode {
  UNSPECIFIED = 0,
  NO_TENSOR = 'NO_TENSOR',
  CURT_HEALTH = 'CURT_HEALTH',
  CONCISE_HEALTH = 'CONCISE_HEALTH',
  FULL_HEALTH = 'FULL_HEALTH',
  SHAPE = 'SHAPE',
  FULL_NUMERICS = 'FULL_NUMERICS',
  FULL_TENSOR = 'FULL_TENSOR',
  REDUCE_INF_NAN_THREE_SLOTS = 'REDUCE_INF_NAN_THREE_SLOTS',
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

export interface StackFramesResponse {
  stack_frames: Array<StackFrame>;
}

export interface ExecutionDigest {
  // Op type executed.
  op_type: string;

  // Output tensor device ids.
  output_tensor_device_ids: string[];
}

/** Non-digest, detailed data object for top-level execution events. */
export interface Execution extends ExecutionDigest {
  host_name: string;

  stack_frame_ids: string[];

  tensor_debug_mode: TensorDebugMode;

  graph_id: string | null;

  input_tensor_ids: number[];

  output_tensor_ids: number[];

  debug_tensor_values: Array<number[] | null>;
}

export interface ExecutionDigestsResponse {
  begin: number;

  end: number;

  num_digests: number;

  execution_digests: ExecutionDigest[];
}

export interface ExecutionDigestLoadState extends LoadState {
  // A map from page number to whether the page has been loaded
  //   - in full, in which case the value is pageSize.
  //   - partially, in which case the value is an integer < pageSize.
  pageLoadedSizes: {[page: number]: number};

  // Number of top-level executions available at the data source (not
  // necessarilty loaded by frontend yet.)
  numExecutions: number;
}

export interface ExecutionDataResponse {
  begin: number;

  end: number;

  executions: Execution[];
}

export interface Executions {
  // Load state for the total number of top-level executions.
  // numExecutionsLoaded load state can go from LOADED to LOADING, as
  // the backend may keep reading in new data and see an increase in
  // the number of execution events, which the frontend will in turn see.
  numExecutionsLoaded: LoadState;

  // Load state for loading ExecutionDigests.
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

  // Index of focusing.
  focusIndex: number | null;

  // Execution digests the frontend has loaded so far.
  executionDigests: {[index: number]: ExecutionDigest};

  // Detailed data objects.
  executionData: {[index: number]: Execution};
}

// The state of a loaded DebuggerV2 run.
export interface RunState {
  executions: Executions;
}

export interface DebuggerState {
  // Runs that are available in the backend.
  runs: DebuggerRunListing;
  runsLoaded: LoadState;

  // ID of the run being currently displayed.
  activeRunId: string | null;

  // Per-run detailed data.
  executions: Executions;

  // Stack frames that have been loaded from data source so far, keyed by
  // stack-frame IDs.
  stackFrames: {[stack_frame_id: string]: StackFrame};
}

export interface State {
  [DEBUGGER_FEATURE_KEY]: DebuggerState;
}
