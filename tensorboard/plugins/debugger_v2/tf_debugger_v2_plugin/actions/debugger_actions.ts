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
  DebuggerRunListing,
  Execution,
  ExecutionDigestsResponse,
  ExecutionDataResponse,
  StackFrame,
  StackFramesResponse,
  StackFramesById,
} from '../store/debugger_types';

// HACK: Below import is for type inference.
// https://github.com/bazelbuild/rules_nodejs/issues/1013
/** @typehack */ import * as _typeHackModels from '@ngrx/store/src/models';

/**
 * Actions for Debugger V2.
 */

/**
 * Actions for the Debugger Component.
 */
export const debuggerLoaded = createAction('[Debugger] Debugger Loaded');

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
 * Actions for the Timeline Component.
 */
export const alertsViewLoaded = createAction('[Debugger] Alerts View Loaded');

export const numExecutionsRequested = createAction(
  '[Debugger] Number of Executions Requested'
);

export const numExecutionsLoaded = createAction(
  '[Debugger] Number of Executions Loaded',
  props<{numExecutions: number}>()
);

export const executionDigestsRequested = createAction(
  '[Debugger] ExecutionDigests Requested'
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

export const executionDigestFocus = createAction(
  '[Debugger] Execution Data Objects Being Focused On',
  props<{displayIndex: number}>()
);

export const executionDataLoaded = createAction(
  '[Debugger] Execution Data Objects Loaded',
  props<ExecutionDataResponse>()
);

export const executionStackFramesRequest = createAction(
  '[Debugger] Request for the Stack Frames of an Execution Event',
  props<Execution>()
);

// TODO(cais): Unit test.
export const stackFramesLoaded = createAction(
  '[Debugger] A Set of Stack Frames Have Been Loaded',
  props<{stackFrames: StackFramesById}>()
);
