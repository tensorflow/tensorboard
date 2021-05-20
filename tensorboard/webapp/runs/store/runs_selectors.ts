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
import {createFeatureSelector, createSelector} from '@ngrx/store';

import {DataLoadState, LoadState} from '../../types/data';
import {SortDirection} from '../../types/ui';
import {GroupBy, SortKey} from '../types';
import {
  Run,
  RunsDataState,
  RunsState,
  RunsUiState,
  RUNS_FEATURE_KEY,
  State,
} from './runs_types';
import {serializeExperimentIds} from './utils';

/** @typehack */ import * as _typeHackStore from '@ngrx/store';

const getRunsState = createFeatureSelector<State, RunsState>(RUNS_FEATURE_KEY);

const getDataState = createSelector(
  getRunsState,
  (state: RunsState): RunsDataState => {
    return state.data;
  }
);

/**
 * Returns Observable that emits run object.
 */
export const getExperimentIdForRunId = createSelector(
  getDataState,
  (state: RunsDataState, props: {runId: string}): string | null => {
    return state.runIdToExpId[props.runId] ?? null;
  }
);

/**
 * Returns Observable that emits run object.
 */
export const getRun = createSelector(
  getDataState,
  (state: RunsDataState, props: {runId: string}): Run | null => {
    return state.runMetadata[props.runId] ?? null;
  }
);

/**
 * Returns Observable that emits runs list for an experiment.
 */
export const getRuns = createSelector(
  getDataState,
  (state: RunsDataState, props: {experimentId: string}): Run[] => {
    const runIds = state.runIds[props.experimentId] || [];
    return runIds
      .filter((id) => Boolean(state.runMetadata[id]))
      .map((id) => state.runMetadata[id]);
  }
);

/**
 * Returns an Observable that emits a map from RunIds to Runs. Note: the keys
 * do NOT necessarily correspond to the current route's runs.
 */
export const getRunMap = createSelector(
  getDataState,
  (state: RunsDataState): Map<string, Run> => {
    return new Map(Object.entries(state.runMetadata));
  }
);

/**
 * Returns Observable that emits load state of the runs list.
 */
export const getRunsLoadState = createSelector(
  getDataState,
  (state: RunsDataState, props: {experimentId: string}): LoadState => {
    return (
      state.runsLoadState[props.experimentId] || {
        lastLoadedTimeInMs: null,
        state: DataLoadState.NOT_LOADED,
      }
    );
  }
);

/**
 * Returns Observable that emits selection state of runs. If the runs for the
 * current route are desired, please see ui_selectors.ts's
 * getCurrentRouteRunSelection instead.
 */
export const getRunSelectionMap = createSelector(
  getDataState,
  (
    dataState: RunsDataState,
    props: {experimentIds: string[]}
  ): Map<string, boolean> => {
    const stateKey = serializeExperimentIds(props.experimentIds);
    return dataState.selectionState.get(stateKey) || new Map();
  }
);

/**
 * Returns current run grouping setting.
 */
export const getRunGroupBy = createSelector(
  getDataState,
  (dataState: RunsDataState): GroupBy => {
    return dataState.groupBy;
  }
);

const getUiState = createSelector(
  getRunsState,
  (state: RunsState): RunsUiState => {
    return state.ui;
  }
);

/**
 * Returns Observable that emits pagination option on the run selector.
 */
export const getRunSelectorPaginationOption = createSelector(
  getUiState,
  (state: RunsUiState): {pageIndex: number; pageSize: number} => {
    return state.paginationOption;
  }
);

/**
 * Returns Observable that emits regex filter on the run selector.
 */
export const getRunSelectorRegexFilter = createSelector(
  getUiState,
  (state: RunsUiState): string => {
    return state.regexFilter;
  }
);

/**
 * Returns Observable that emits sort options on the run selector.
 */
export const getRunSelectorSort = createSelector(
  getUiState,
  (state: RunsUiState): {key: SortKey | null; direction: SortDirection} => {
    return state.sort;
  }
);

/**
 * Returns Observable that emits map of run id to run color (hex).
 */
export const getRunColorMap = createSelector(
  getDataState,
  (state: RunsDataState): Record<string, string> => {
    const map = new Map([
      ...state.defaultRunColorForGroupBy,
      ...state.runColorOverrideForGroupBy,
    ]);
    const colorObject: Record<string, string> = {};
    map.forEach((value, key) => {
      colorObject[key] = value;
    });
    return colorObject;
  }
);
