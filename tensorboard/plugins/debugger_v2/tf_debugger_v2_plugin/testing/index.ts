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

import {Component, NgModule} from '@angular/core';
import {Store} from '@ngrx/store';
import {
  createInitialExecutionsState,
  createInitialGraphExecutionsState,
  createInitialGraphsState,
} from '../store/debugger_reducers';
import {
  Alerts,
  AlertType,
  DataLoadState,
  DebuggerState,
  DEBUGGER_FEATURE_KEY,
  Execution,
  ExecutionDigest,
  Executions,
  GraphExecution,
  GraphExecutions,
  GraphOpInfo,
  Graphs,
  InfNanAlert,
  SourceCodeState,
  StackFrame,
  State,
} from '../store/debugger_types';

export function createTestInfNanAlert(
  override?: Partial<InfNanAlert>
): InfNanAlert {
  return {
    alert_type: AlertType.INF_NAN_ALERT,
    op_type: 'InfNanGeneratingOp',
    output_slot: 0,
    size: 8,
    num_neg_inf: 1,
    num_pos_inf: 2,
    num_nan: 3,
    execution_index: 0,
    graph_execution_trace_index: null,
    ...override,
  };
}

export function createTestExecutionData(
  override?: Partial<Execution>
): Execution {
  return {
    op_type: 'Identity',
    output_tensor_device_ids: ['d0'],
    input_tensor_ids: [0],
    output_tensor_ids: [1],
    host_name: 'localhost',
    stack_frame_ids: ['aaa', 'bbb', 'ccc'],
    graph_id: null,
    tensor_debug_mode: 2,
    debug_tensor_values: [[-1, 0]],
    ...override,
  };
}

let testOpCounter = 0;

export function createTestGraphOpInfo(
  override?: Partial<GraphOpInfo>
): GraphOpInfo {
  return {
    op_type: 'ChainOp',
    op_name: `ChainOp_${testOpCounter++}`,
    device_name: '/GPU:0',
    num_outputs: 1,
    output_tensor_ids: [testOpCounter],
    graph_ids: ['g0', 'g1'],
    host_name: 'localhost',
    stack_frame_ids: ['a0', 'b1', 'c2'],
    inputs: [
      {
        op_name: `ChainOp_${testOpCounter - 1}`,
        output_slot: 0,
      },
    ],
    consumers: [
      [
        {
          op_name: `ChainOp_${testOpCounter + 1}`,
          input_slot: 0,
        },
      ],
    ],
    ...override,
  };
}

export function createTestStackFrame(options?: {
  host_name?: string;
  file_path?: string;
  lineno?: number;
  function_name?: string;
}): StackFrame {
  options = options || {};
  return {
    host_name: options.host_name || 'localhost',
    file_path:
      options.file_path || `/tmp/file_${Math.floor(Math.random() * 1e6)}.py`,
    // `lineno` is assumed to be 1-based. So a value of 0 means use default
    // behavior.
    lineno: options.lineno || 1 + Math.floor(Math.random() * 1e3),
    function_name:
      options.function_name || `function_${Math.floor(Math.random() * 1e3)}`,
  };
}

export function createTestExecutionDigest(
  override?: Partial<ExecutionDigest>
): ExecutionDigest {
  return {
    op_type: 'TestOp',
    output_tensor_device_ids: ['d0'],
    ...override,
  };
}

export function createTestGraphExecution(
  override?: Partial<GraphExecution>
): GraphExecution {
  return {
    op_name: 'test_namescope/TestOp',
    op_type: 'TestOp',
    output_slot: 0,
    graph_id: 'g1',
    graph_ids: ['g0', 'g1,'],
    device_name: '/GPU:0',
    tensor_debug_mode: 2,
    debug_tensor_value: [0, 1],
    ...override,
  };
}

export function createDebuggerState(
  override?: Partial<DebuggerState>
): DebuggerState {
  return {
    runs: {},
    runsLoaded: {
      state: DataLoadState.NOT_LOADED,
      lastLoadedTimeInMs: null,
    },
    lastDataPollOnsetTimeMs: -1,
    lastNonEmptyPollDataTimeMs: -1,
    activeRunId: null,
    alerts: createAlertsState(),
    executions: createDebuggerExecutionsState(),
    graphExecutions: createDebuggerGraphExecutionsState(),
    graphs: createDebuggerGraphsState(),
    stackFrames: {},
    stickToBottommostFrameInFocusedFile: false,
    codeLocationFocusType: null,
    sourceCode: {
      sourceFileListLoaded: {
        state: DataLoadState.NOT_LOADED,
        lastLoadedTimeInMs: null,
      },
      sourceFileList: [],
      fileContents: [],
      focusLineSpec: null,
    },
    ...override,
  };
}

export function createAlertsState(override?: Partial<Alerts>): Alerts {
  return {
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
    ...override,
  };
}

export function createDebuggerExecutionsState(
  override?: Partial<Executions>
): Executions {
  return {
    ...createInitialExecutionsState(),
    ...override,
  };
}

export function createDebuggerGraphExecutionsState(
  override?: Partial<GraphExecutions>
): GraphExecutions {
  return {
    ...createInitialGraphExecutionsState(),
    ...override,
  };
}

export function createDebuggerGraphsState(override?: Partial<Graphs>) {
  return {
    ...createInitialGraphsState(),
    ...override,
  };
}

export function createDebuggerSourceCodeState(
  override?: Partial<SourceCodeState>
): SourceCodeState {
  return {
    sourceFileListLoaded: {
      state: DataLoadState.NOT_LOADED,
      lastLoadedTimeInMs: null,
    },
    sourceFileList: [],
    fileContents: [],
    focusLineSpec: null,
    ...override,
  };
}

/**
 * Create a DebuggerState the emulates the state during the loading of
 * executionDigests, for testing.
 */
export function createDigestsStateWhileLoadingExecutionDigests(args: {
  pageSize: number;
  numExecutions: number;
  loadingBegin: number;
  loadingEnd: number;
  executionDigests?: {[index: number]: ExecutionDigest};
  pageLoadedSize?: {[page: number]: number};
}): DebuggerState {
  const {
    pageSize,
    numExecutions,
    loadingBegin,
    loadingEnd,
    executionDigests,
    pageLoadedSize,
  } = args;
  return createDebuggerState({
    runs: {
      __default_debugger_run__: {
        start_time: 111,
      },
    },
    runsLoaded: {
      state: DataLoadState.LOADED,
      lastLoadedTimeInMs: 222,
    },
    activeRunId: '__default_debugger_run__',
    executions: createDebuggerExecutionsState({
      numExecutionsLoaded: {
        state: DataLoadState.LOADED,
        lastLoadedTimeInMs: 333,
      },
      pageSize,
      executionDigestsLoaded: {
        numExecutions,
        pageLoadedSizes: pageLoadedSize || {},
        loadingRanges: [
          {
            begin: loadingBegin,
            end: loadingEnd,
          },
        ],
      },
      executionDigests: executionDigests == null ? {} : executionDigests,
    }),
  });
}

/**
 * Create DebubgerStat with ExecutionDigests loaded.
 */
export function createDebuggerStateWithLoadedExecutionDigests(
  scrollBeginIndex: number,
  displayCount = 50,
  opTypes?: string[]
): DebuggerState {
  const state = createDebuggerState({
    runs: {
      __default_debugger_run__: {
        start_time: 111,
      },
    },
    runsLoaded: {
      state: DataLoadState.LOADED,
      lastLoadedTimeInMs: 222,
    },
    activeRunId: '__default_debugger_run__',
    executions: createDebuggerExecutionsState({
      numExecutionsLoaded: {
        state: DataLoadState.LOADED,
        lastLoadedTimeInMs: 333,
      },
      pageSize: 1000,
      scrollBeginIndex,
      focusIndex: null,
      displayCount,
      executionDigestsLoaded: {
        numExecutions: opTypes == null ? 1500 : opTypes.length,
        pageLoadedSizes: {},
        loadingRanges: [],
      },
      executionDigests: {},
      executionData: {},
    }),
  });
  const numExecutions = state.executions.executionDigestsLoaded.numExecutions;
  const pageSize = state.executions.pageSize;
  const numPages = Math.ceil(numExecutions / pageSize);
  for (let i = 0; i < numPages; ++i) {
    state.executions.executionDigestsLoaded.pageLoadedSizes[i] =
      i < numPages ? pageSize : numExecutions - (numPages - 1) * pageSize;
  }
  for (let i = 0; i < numExecutions; ++i) {
    state.executions.executionDigests[i] = {
      op_type: opTypes == null ? 'Identity' : opTypes[i],
      output_tensor_device_ids: ['d0'],
    };
  }
  return state;
}

export function createState(
  debuggerState: DebuggerState = createDebuggerState()
): State {
  return {[DEBUGGER_FEATURE_KEY]: debuggerState};
}

// Below are minimalist Angular contains and modules only for testing. They
// serve to decouple the details of Debugger from the testing of outside modules
// that use it.

@Component({
  standalone: false,
  selector: 'tf-debugger-v2',
  template: ``,
})
export class TestingDebuggerContainer {
  constructor(private readonly store: Store<{}>) {}
}

@NgModule({
  declarations: [TestingDebuggerContainer],
  exports: [TestingDebuggerContainer],
})
export class TestingDebuggerModule {}
