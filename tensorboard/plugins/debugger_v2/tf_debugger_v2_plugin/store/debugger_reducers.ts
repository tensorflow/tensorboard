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
import {Action, createReducer, on} from '@ngrx/store';

import * as actions from '../actions';
import {DataLoadState, DebuggerState} from './debugger_types';

// HACK: These imports are for type inference.
// https://github.com/bazelbuild/rules_nodejs/issues/1013
/** @typehack */ import * as _typeHackStore from '@ngrx/store/store';

const initialState: DebuggerState = {
  runs: {},
  runsLoaded: {
    state: DataLoadState.NOT_LOADED,
    lastLoadedTimeInMs: null,
  },
};

const reducer = createReducer(
  initialState,
  on(
    actions.debuggerRunsRequested,
    (state: DebuggerState): DebuggerState => {
      return {
        ...state,
        runsLoaded: {
          ...state.runsLoaded,
          state: DataLoadState.LOADING,
        },
      };
    }
  ),
  on(
    actions.debuggerRunsRequestFailed,
    (state: DebuggerState): DebuggerState => {
      return {
        ...state,
        runsLoaded: {
          ...state.runsLoaded,
          state: DataLoadState.FAILED,
        },
      };
    }
  ),
  on(
    actions.debuggerRunsLoaded,
    (state: DebuggerState, {runs}): DebuggerState => {
      return {
        ...state,
        runs,
        runsLoaded: {
          state: DataLoadState.LOADED,
          lastLoadedTimeInMs: Date.now(),
        },
      };
    }
  )
);

export function reducers(state: DebuggerState, action: Action) {
  return reducer(state, action);
}
