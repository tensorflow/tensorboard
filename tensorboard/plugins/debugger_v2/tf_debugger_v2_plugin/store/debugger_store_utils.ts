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

import {SourceFileSpec, SourceLineSpec, StackFrame} from './debugger_types';

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
export function isFrameBottommosInStackTrace(
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
} // TODO(cais): Add unit test.

/**
 * Finds the bottommost stack frame in a stack trace.
 *
 * @param stackFrames Stack frames of the stack trace to look in.
 * @param focusedSourceLineSpec The currently focuse stack frame.
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
} // TODO(cais): Add unit test.
