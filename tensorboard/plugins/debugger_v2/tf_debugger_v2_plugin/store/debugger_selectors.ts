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

import {createSelector, createFeatureSelector} from '@ngrx/store';
import {
  DEBUGGER_FEATURE_KEY,
  DebuggerRunListing,
  DebuggerState,
  ExecutionDigest,
  ExecutionDigestLoadState,
  LoadState,
  State,
} from './debugger_types';

// HACK: These imports are for type inference.
// https://github.com/bazelbuild/rules_nodejs/issues/1013
/** @typehack */ import * as _typeHackSelector from '@ngrx/store/src/selector';
/** @typehack */ import * as _typeHackStore from '@ngrx/store/store';

const selectDebuggerState = createFeatureSelector<State, DebuggerState>(
  DEBUGGER_FEATURE_KEY
);

export const getDebuggerRunListing = createSelector(
  selectDebuggerState,
  (state: DebuggerState): DebuggerRunListing => {
    return state.runs;
  }
);

export const getDebuggerRunsLoaded = createSelector(
  selectDebuggerState,
  (state: DebuggerState): LoadState => state.runsLoaded
);

export const getActiveRunId = createSelector(
  selectDebuggerState,
  (state: DebuggerState): string | null => state.activeRunId
);

export const getNumExecutionsLoaded = createSelector(
  selectDebuggerState,
  (state: DebuggerState): LoadState => {
    return state.executions.numExecutionsLoaded;
  }
);

export const getExecutionDigestsLoaded = createSelector(
  selectDebuggerState,
  (state: DebuggerState): ExecutionDigestLoadState => {
    return state.executions.executionDigestsLoaded;
  }
);

export const getNumExecutions = createSelector(
  selectDebuggerState,
  (state: DebuggerState): number => {
    return state.executions.executionDigestsLoaded.numExecutions;
  }
);

export const getExecutionScrollBeginIndex = createSelector(
  selectDebuggerState,
  (state: DebuggerState): number => {
    return state.executions.scrollBeginIndex;
  }
);

export const getExecutionPageSize = createSelector(
  selectDebuggerState,
  (state: DebuggerState): number => {
    return state.executions.pageSize;
  }
);

export const getDisplayCount = createSelector(
  selectDebuggerState,
  (state: DebuggerState): number => {
    return state.executions.displayCount;
  }
);

export const getVisibleExecutionDigests = createSelector(
  selectDebuggerState,
  (state: DebuggerState): Array<ExecutionDigest | null> => {
    const digests: Array<ExecutionDigest | null> = [];
    for (
      let executionIndex = state.executions.scrollBeginIndex;
      executionIndex <
      state.executions.scrollBeginIndex + state.executions.displayCount;
      ++executionIndex
    ) {
      if (executionIndex in state.executions.executionDigests) {
        digests.push(state.executions.executionDigests[executionIndex]);
      } else {
        digests.push(null);
      }
    }
    return digests;
  }
);

export const getFocusedExecutionIndex = createSelector(
  selectDebuggerState,
  (state: DebuggerState): number | null => {
    return state.executions.focusIndex;
  }
);

/**
 * Get the display index of the execution digest being focused on (if any).
 */
export const getFocusedExecutionDisplayIndex = createSelector(
  selectDebuggerState,
  (state: DebuggerState): number | null => {
    if (state.executions.focusIndex === null) {
      return null;
    } else {
      const {focusIndex, scrollBeginIndex, displayCount} = state.executions;
      if (
        focusIndex >= scrollBeginIndex &&
        focusIndex < scrollBeginIndex + displayCount
      ) {
        return focusIndex - scrollBeginIndex;
      } else {
        return null;
      }
    }
  }
);
