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

import {
  getFocusedExecutionData,
  getFocusedExecutionIndex,
} from './debugger_selectors';
import {DataLoadState, DEBUGGER_FEATURE_KEY} from './debugger_types';
import {createDebuggerState, createTestExecutionData} from '../testing';

describe('debugger selectors', () => {
  describe('getFocusedExecutionIndex', () => {
    for (const focusIndex of [null, 0, 1]) {
      it(`returns null correctly: focusIndex=${focusIndex}`, () => {
        const state = {
          [DEBUGGER_FEATURE_KEY]: createDebuggerState({
            activeRunId: '__default_debugger_run__',
            executions: {
              numExecutionsLoaded: {
                state: DataLoadState.LOADING,
                lastLoadedTimeInMs: null,
              },
              executionDigestsLoaded: {
                state: DataLoadState.NOT_LOADED,
                lastLoadedTimeInMs: null,
                pageLoadedSizes: {},
                numExecutions: 0,
              },
              pageSize: 1000,
              displayCount: 50,
              focusIndex,
              scrollBeginIndex: 0,
              executionDigests: {},
              executionData: {},
            },
          }),
        };
        expect(getFocusedExecutionIndex(state)).toBe(focusIndex);
      });
    }
  });

  describe('getFocusedExecutionData', () => {
    it('returns correct execution data in focus: null', () => {
      const state = {
        [DEBUGGER_FEATURE_KEY]: createDebuggerState({
          activeRunId: '__default_debugger_run__',
          executions: {
            numExecutionsLoaded: {
              state: DataLoadState.LOADING,
              lastLoadedTimeInMs: null,
            },
            executionDigestsLoaded: {
              state: DataLoadState.NOT_LOADED,
              lastLoadedTimeInMs: null,
              pageLoadedSizes: {},
              numExecutions: 0,
            },
            pageSize: 1000,
            displayCount: 50,
            focusIndex: null,
            scrollBeginIndex: 0,
            executionDigests: {},
            executionData: {},
          },
        }),
      };
      expect(getFocusedExecutionData(state)).toBe(null);
    });

    it('returns correct execution data in focus: data present, non-null', () => {
      const executionData = createTestExecutionData({op_type: 'FocusedOp'});
      const state = {
        [DEBUGGER_FEATURE_KEY]: createDebuggerState({
          activeRunId: '__default_debugger_run__',
          executions: {
            numExecutionsLoaded: {
              state: DataLoadState.LOADING,
              lastLoadedTimeInMs: null,
            },
            executionDigestsLoaded: {
              state: DataLoadState.NOT_LOADED,
              lastLoadedTimeInMs: null,
              pageLoadedSizes: {},
              numExecutions: 10,
            },
            pageSize: 1000,
            displayCount: 50,
            focusIndex: 1,
            scrollBeginIndex: 0,
            executionDigests: {},
            executionData: {
              0: createTestExecutionData(),
              1: executionData,
            },
          },
        }),
      };
      expect(getFocusedExecutionData(state)).toEqual(executionData);
    });

    it('returns correct execution data in focus: null due to data missing', () => {
      const state = {
        [DEBUGGER_FEATURE_KEY]: createDebuggerState({
          activeRunId: '__default_debugger_run__',
          executions: {
            numExecutionsLoaded: {
              state: DataLoadState.LOADING,
              lastLoadedTimeInMs: null,
            },
            executionDigestsLoaded: {
              state: DataLoadState.NOT_LOADED,
              lastLoadedTimeInMs: null,
              pageLoadedSizes: {},
              numExecutions: 10,
            },
            pageSize: 1000,
            displayCount: 50,
            focusIndex: 3,
            scrollBeginIndex: 0,
            executionDigests: {},
            executionData: {
              0: createTestExecutionData(),
            },
          },
        }),
      };
      expect(getFocusedExecutionData(state)).toBe(null);
    });
  });
});
