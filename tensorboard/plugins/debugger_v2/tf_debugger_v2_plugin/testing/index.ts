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
  DataLoadState,
  DEBUGGER_FEATURE_KEY,
  DebuggerState,
  Executions,
  ExecutionDigest,
  State,
} from '../store/debugger_types';

export function createDebuggerState(
  override?: Partial<DebuggerState>
): DebuggerState {
  return {
    runs: {},
    runsLoaded: {
      state: DataLoadState.NOT_LOADED,
      lastLoadedTimeInMs: null,
    },
    activeRunId: null,
    executions: createDebuggerExecutionsState(),
    ...override,
  };
}

export function createDebuggerExecutionsState(override?: Partial<Executions>) {
  return {
    numExecutionsLoaded: {
      state: DataLoadState.NOT_LOADED,
      lastLoadedTimeInMs: null,
    },
    executionDigestsLoaded: {
      state: DataLoadState.NOT_LOADED,
      lastLoadedTimeInMs: null,
      numExecutions: 0,
      pageLoadedSizes: {},
    },
    displayCount: 50,
    pageSize: 1000,
    scrollBeginIndex: 0,
    executionDigests: {},
    ...override,
  };
}

/**
 * Create a DebuggerState the emulates the state during the loading of
 * executionDigests, for testing.
 */
export function createDigestsStateWhileLoadingExecutionDigests(
  pageSize: number,
  numExecutions: number,
  executionDigests?: {[index: number]: ExecutionDigest},
  pageLoadedSize?: {[page: number]: number}
): DebuggerState {
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
        state: DataLoadState.LOADING,
        lastLoadedTimeInMs: executionDigests == null ? Date.now() : null,
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
      displayCount,
      executionDigestsLoaded: {
        numExecutions: opTypes == null ? 1500 : opTypes.length,
        pageLoadedSizes: {},
        state: DataLoadState.LOADED,
        lastLoadedTimeInMs: Date.now(),
      },
      executionDigests: {},
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

export function createState(debuggerState: DebuggerState): State {
  return {[DEBUGGER_FEATURE_KEY]: debuggerState};
}

// Below are minimalist Angular contains and modules only for testing. They
// serve to decouple the details of Debugger from the testing of outside modules
// that use it.

@Component({
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
