/* Copyright 2020 The TensorFlow Authors. All Rights Reserved.

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
/**
 * Internal helper functions for the NgRx store of Debugger V2.
 */

import {CodeLocationType, DebuggerState, StackFrame} from './debugger_types';

/**
 * Helper function that extracts the stack trace being focused on.
 *
 * This examines whether the current focused code location is for an
 * eager (top-level) execution or a graph-op creation, and then queries
 * the corresponding substates accordingly.
 *
 * @param state
 */
export function getFocusedStackFramesHelper(
  state: DebuggerState
): StackFrame[] | null {
  if (state.codeLocationFocusType === null) {
    return null;
  }
  let stackFrameIds: string[] = [];
  if (state.codeLocationFocusType === CodeLocationType.EXECUTION) {
    const {focusIndex, executionData} = state.executions;
    if (focusIndex === null || executionData[focusIndex] === undefined) {
      return null;
    }
    stackFrameIds = executionData[focusIndex].stack_frame_ids;
  } else {
    // This is CodeLocationType.GRAPH_OP_CREATION.
    if (state.graphs.focusedOp === null) {
      return null;
    }
    const {graphId, opName} = state.graphs.focusedOp;
    if (
      state.graphs.ops[graphId] === undefined ||
      !state.graphs.ops[graphId].has(opName)
    ) {
      return null;
    }
    stackFrameIds = state.graphs.ops[graphId].get(opName)!.stack_frame_ids;
  }
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
