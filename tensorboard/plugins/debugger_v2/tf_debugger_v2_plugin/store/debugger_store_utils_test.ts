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
} from './debugger_store_utils';

describe('Debugger store utils', () => {
  const stackFrame0 = createTestStackFrame({
    file_path: 'main.py',
    lineno: 10,
    function_name: '<module>',
  });
  const stackFrame1 = createTestStackFrame({
    file_path: 'main.py',
    lineno: 20,
    function_name: 'main',
  });
  const stackFrame2 = createTestStackFrame({
    file_path: 'train.py',
    lineno: 5,
    function_name: 'train_fn',
  });
  const stackFrame3 = createTestStackFrame({
    file_path: 'train.py',
    lineno: 15,
    function_name: 'model_fn',
  });
  const stackTrace = [stackFrame0, stackFrame1, stackFrame2, stackFrame3];

  describe('isFrameBottommostInStackTrace', () => {
    it('returns true for bottommost frame', () => {
      expect(
        isFrameBottommostInStackTrace(stackTrace, {
          host_name: 'localhost',
          file_path: 'main.py',
          lineno: 20,
          function_name: 'main',
        })
      ).toBe(true);
    });

    it('returns false for non-bottommost frame', () => {
      expect(
        isFrameBottommostInStackTrace(stackTrace, {
          host_name: 'localhost',
          file_path: 'train.py',
          lineno: 5,
          function_name: 'train_fn',
        })
      ).toBe(false);
    });

    it('throws Error for nonexistent frame', () => {
      expect(() =>
        isFrameBottommostInStackTrace(stackTrace, {
          host_name: 'localhost',
          file_path: 'nonexistent.py',
          lineno: 5,
          function_name: 'nusuth',
        })
      ).toThrowError(/nonexistent.*is not found/);
    });
  });

  describe('getBottommostStackFrameInFocusedFile', () => {
    it('returns the bottommost frame if input is not bottommost', () => {
      expect(
        getBottommostStackFrameInFocusedFile(stackTrace, {
          host_name: 'localhost',
          file_path: 'main.py',
          lineno: 10,
          function_name: '<module>',
        })
      ).toEqual({
        host_name: 'localhost',
        file_path: 'main.py',
        lineno: 20,
        function_name: 'main',
      });
      expect(
        getBottommostStackFrameInFocusedFile(stackTrace, {
          host_name: 'localhost',
          file_path: 'train.py',
          lineno: 5,
          function_name: 'train_fn',
        })
      ).toEqual({
        host_name: 'localhost',
        file_path: 'train.py',
        lineno: 15,
        function_name: 'model_fn',
      });
    });

    it('returns the bottommost frame if input is already bottommost', () => {
      expect(
        getBottommostStackFrameInFocusedFile(stackTrace, {
          host_name: 'localhost',
          file_path: 'main.py',
          lineno: 20,
          function_name: 'main',
        })
      ).toEqual({
        host_name: 'localhost',
        file_path: 'main.py',
        lineno: 20,
        function_name: 'main',
      });
      expect(
        getBottommostStackFrameInFocusedFile(stackTrace, {
          host_name: 'localhost',
          file_path: 'train.py',
          lineno: 15,
          function_name: 'model_fn',
        })
      ).toEqual({
        host_name: 'localhost',
        file_path: 'train.py',
        lineno: 15,
        function_name: 'model_fn',
      });
    });

    it('returns null if focused line spec matches no file path', () => {
      expect(
        getBottommostStackFrameInFocusedFile(stackTrace, {
          host_name: 'localhost',
          file_path: 'nonexistent.py', // file path is different.
          lineno: 66,
          function_name: 'nusuth',
        })
      ).toBeNull();
    });

    it('returns null if focused line spec matches no host name', () => {
      expect(
        getBottommostStackFrameInFocusedFile(stackTrace, {
          host_name: 'remotehost', // host name is different.
          file_path: 'main.py',
          lineno: 20,
          function_name: 'nusuth',
        })
      ).toBeNull();
    });

    it('returns null if focused line spec is null', () => {
      expect(getBottommostStackFrameInFocusedFile(stackTrace, null)).toBeNull();
    });
  });
});
