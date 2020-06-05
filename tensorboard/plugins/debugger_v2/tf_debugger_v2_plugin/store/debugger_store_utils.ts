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
 * Utility functions for the NgRx store of Debugger V2.
 */

import {
  CodeLocationType,
  DebuggerState,
  SourceFileSpec,
  SourceLineSpec,
  StackFrame,
} from './debugger_types';

/**
 * Find the index of a file spec among an array of file specs.
 * @param fileList
 * @param fileSpec
 * @returns The index of `fileSpec` in `fileList`. If not found, `-1`.
 */
export function findFileIndex(
  fileList: SourceFileSpec[],
  fileSpec: SourceFileSpec
): number {
  return fileList.findIndex(
    (item: SourceFileSpec) =>
      item.host_name === fileSpec.host_name &&
      item.file_path === fileSpec.file_path
  );
}

/**
 * Determines if a source-line spec points at the bottommost in its file
 * in a given stack trace.
 *
 * @param stackFrames The stack trace to examine.
 * @param sourceLineSpec A spec that describes a frame in the stack trace.
 * @returns Whether `sourceLineSpec` points to the bottommost stack frame
 *   (in the Python sense) of the file it belongs to among the frames in
 *   `stackFrames`.
 * @throws Error if `sourceLineSpec` is not a frame in `stackFrames`.
 */
export function isFrameBottommostInStackTrace(
  stackFrames: StackFrame[],
  sourceLineSpec: SourceLineSpec
): boolean {
  let matchingIndex = -1;
  let bottommostIndex = -1;
  stackFrames.forEach((stackFrame, i) => {
    const [, file_path, lineno] = stackFrame;
    if (file_path === sourceLineSpec.file_path) {
      bottommostIndex = i;
      if (lineno === sourceLineSpec.lineno) {
        matchingIndex = i;
      }
    }
  });
  if (matchingIndex === -1) {
    throw new Error(
      `sourceLineSpec ${JSON.stringify(sourceLineSpec)} ` +
        `is not found in stack frames.`
    );
  }
  return matchingIndex === bottommostIndex;
}

/**
 * Finds the bottommost stack frame in a stack trace.
 *
 * @param stackFrames Stack frames of the stack trace to look in.
 * @param focusedSourceLineSpec The currently focused stack frame.
 * @returns The stack frame that is in the same file as `focusedSourceLineSpec`,
 *   but at the bottommost location.
 */
export function getBottommostStackFrameInFocusedFile(
  stackFrames: StackFrame[],
  focusedSourceLineSpec: SourceLineSpec | null
): SourceLineSpec | null {
  if (focusedSourceLineSpec === null) {
    return null;
  }
  for (let i = stackFrames.length - 1; i >= 0; --i) {
    const stackFrame = stackFrames[i];
    const [host_name, file_path] = stackFrame;
    if (
      host_name === focusedSourceLineSpec.host_name &&
      file_path === focusedSourceLineSpec.file_path
    ) {
      return {
        host_name: stackFrame[0],
        file_path: stackFrame[1],
        lineno: stackFrame[2],
      };
    }
  }
  return null;
}

/**
 * Find the first range (with begin and end properties) in an array of ranges
 * that equals `[begin, end)`.
 *
 * @param ranges The ranges to search in.
 * @param begin The begin of the range to search for (inclusive).
 * @param end The end of the range to search for (exclusive).
 * @returns Index (>=0) if found. -1 if not found.
 */
export function findBeginEndRangeIndex(
  ranges: Array<{begin: number; end: number}>,
  begin: number,
  end: number
): number {
  if (begin >= end) {
    throw new Error(
      `Expected begin to be less than end, ` +
        `but got begin=${begin}, end=${end}`
    );
  }
  return ranges.findIndex(
    (range) => range.begin === begin && range.end === end
  );
}

/**
 * Determines if an array of ranges contains a range that strictly includes
 * `[begin, end)`.
 *
 * @param ranges The ranges to search in.
 * @param begin The begin of the range to search for (inclusive).
 * @param end The end of the range to search for (exclusive).
 * @returns `True` if and only if one of the ranges of `ranges` strictly
 *   includes `[begin, end)`.
 */
export function beginEndRangesInclude(
  ranges: Array<{begin: number; end: number}>,
  begin: number,
  end: number
): boolean {
  if (begin >= end) {
    throw new Error(
      `Expected begin to be less than end, ` +
        `but got begin=${begin}, end=${end}`
    );
  }
  return (
    ranges.findIndex((range) => range.begin >= begin && range.end <= end) !== -1
  );
}

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

/**
 * Computes bottommost stack frame in the currently-focused stack trace.
 *
 * @param state Input DebuggerState (will not be mutated).
 * @returns If `stickToBottommostFrameInFocusedFile` and there is a stack trace
 *   in focus and if a bottommost frame can be found in the file currently in
 *   focus, return the bottommost frame. Else, return the current value of
 *   `focusLineSpec` in `state.sourceCode`.
 */
export function computeBottommostLineSpec(
  state: DebuggerState
): SourceLineSpec | null {
  const currentFocusLineSpec = state.sourceCode.focusLineSpec;
  if (!state.stickToBottommostFrameInFocusedFile) {
    return currentFocusLineSpec;
  }
  const focusedStackFrame = getFocusedStackFramesHelper(state);
  if (focusedStackFrame === null) {
    return currentFocusLineSpec;
  }
  const bottommost = getBottommostStackFrameInFocusedFile(
    focusedStackFrame,
    currentFocusLineSpec
  );
  if (bottommost === null) {
    return currentFocusLineSpec;
  } else {
    return bottommost;
  }
}
