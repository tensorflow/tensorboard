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
/** Unit tests for debugger ngrx store utilities. */
import {createTestStackFrame} from '../testing';
import {
  getBottommostStackFrameInFocusedFile,
  isFrameBottommostInStackTrace,
  stackFrameToSourceLineSpec,
} from './debugger_store_utils';
import {SourceLineSpec} from './debugger_types';

describe('Debugger store utils', () => {
  const stackFrame0 = createTestStackFrame('main.py', 10);
  const stackFrame1 = createTestStackFrame('main.py', 20);
  const stackFrame2 = createTestStackFrame('train.py', 5);
  const stackFrame3 = createTestStackFrame('train.py', 15);
  const stackTrace = [stackFrame0, stackFrame1, stackFrame2, stackFrame3];

  describe('isFrameBottommostInStackTrace', () => {
    it('returns true for bottommost frame', () => {
      expect(
        isFrameBottommostInStackTrace(
          stackTrace,
          stackFrameToSourceLineSpec(stackFrame1)
        )
      ).toBe(true);
    });

    it('returns false for non-bottommost frame', () => {
      expect(
        isFrameBottommostInStackTrace(
          stackTrace,
          stackFrameToSourceLineSpec(stackFrame2)
        )
      ).toBe(false);
    });

    it('throws Error for nonexistent frame', () => {
      expect(() =>
        isFrameBottommostInStackTrace(stackTrace, {
          host_name: 'localhost',
          file_path: 'nonexistent.py',
          lineno: 5,
        })
      ).toThrowError(/nonexistent.*is not found in stack frames/);
    });
  });

  describe('getBottommostStackFrameInFocusedFile', () => {
    it('returns the bottommost frame if input is not bottommost', () => {
      expect(
        getBottommostStackFrameInFocusedFile(
          stackTrace,
          stackFrameToSourceLineSpec(stackFrame0)
        )
      ).toEqual(stackFrameToSourceLineSpec(stackFrame1));
      expect(
        getBottommostStackFrameInFocusedFile(
          stackTrace,
          stackFrameToSourceLineSpec(stackFrame2)
        )
      ).toEqual(stackFrameToSourceLineSpec(stackFrame3));
    });

    it('returns the bottommost frame if input is already bottommost', () => {
      expect(
        getBottommostStackFrameInFocusedFile(
          stackTrace,
          stackFrameToSourceLineSpec(stackFrame1)
        )
      ).toEqual(stackFrameToSourceLineSpec(stackFrame1));
      expect(
        getBottommostStackFrameInFocusedFile(
          stackTrace,
          stackFrameToSourceLineSpec(stackFrame3)
        )
      ).toEqual(stackFrameToSourceLineSpec(stackFrame3));
    });

    it('returns null if focused line spec matches no file path', () => {
      expect(
        getBottommostStackFrameInFocusedFile(stackTrace, {
          host_name: 'localhost',
          file_path: 'nonexistent.py', // file path is different.
          lineno: 66,
        })
      ).toBeNull();
    });

    it('returns null if focused line spec matches no host name', () => {
      expect(
        getBottommostStackFrameInFocusedFile(stackTrace, {
          host_name: 'remotehost', // host name is different.
          file_path: 'main.py',
          lineno: 20,
        })
      ).toBeNull();
    });

    it('returns null if focused line spec is null', () => {
      expect(getBottommostStackFrameInFocusedFile(stackTrace, null)).toBeNull();
    });
  });
});
