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
import * as actions from '../actions';
import {reducers} from './debugger_reducers';
import {DataLoadState} from './debugger_types';
import {createDebuggerState} from '../testing';

describe('Debugger reducers', () => {
  describe('Runs loading', () => {
    it('sets runsLoaded to loading on requesting runs', () => {
      const state = createDebuggerState();
      const nextState = reducers(state, actions.debuggerRunsRequested());
      expect(nextState.runsLoaded.state).toEqual(DataLoadState.LOADING);
      expect(nextState.runsLoaded.lastLoadedTimeInMs).toBeNull();
    });

    it('set runsLoad to failed on request failure', () => {
      const state = createDebuggerState({
        runsLoaded: {state: DataLoadState.LOADING, lastLoadedTimeInMs: null},
      });
      const nextState = reducers(state, actions.debuggerRunsRequestFailed());
      expect(nextState.runsLoaded.state).toEqual(DataLoadState.FAILED);
      expect(nextState.runsLoaded.lastLoadedTimeInMs).toBeNull();
    });

    it('sets runsLoaded and runs on successful runs loading', () => {
      const state = createDebuggerState();
      const t0 = Date.now();
      const nextState = reducers(
        state,
        actions.debuggerRunsLoaded({
          runs: {
            foo_debugger_run: {
              start_time: 111,
            },
          },
        })
      );
      expect(nextState.runsLoaded.state).toEqual(DataLoadState.LOADED);
      expect(nextState.runsLoaded.lastLoadedTimeInMs).toBeGreaterThanOrEqual(
        t0
      );
      expect(nextState.runs).toEqual({
        foo_debugger_run: {
          start_time: 111,
        },
      });
    });

    it('Overrides existing runs on successful runs loading', () => {
      const state = createDebuggerState({
        runs: {
          foo_debugger_run: {
            start_time: 111,
          },
        },
        runsLoaded: {
          state: DataLoadState.LOADED,
          lastLoadedTimeInMs: 0,
        },
      });
      const t0 = Date.now();
      const nextState = reducers(
        state,
        actions.debuggerRunsLoaded({
          runs: {
            bar_debugger_run: {
              start_time: 222,
            },
          },
        })
      );
      expect(nextState.runsLoaded.state).toEqual(DataLoadState.LOADED);
      expect(nextState.runsLoaded.lastLoadedTimeInMs).toBeGreaterThanOrEqual(
        t0
      );
      expect(nextState.runs).toEqual({
        bar_debugger_run: {
          start_time: 222,
        },
      });
    });
  });
});
