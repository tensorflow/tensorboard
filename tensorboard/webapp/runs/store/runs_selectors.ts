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
import {GroupBy, RunToHparamMap} from '../types';
import {
  ExperimentId,
  Run,
  RunId,
  RunsDataState,
  RunsState,
  RunsUiState,
  RUNS_FEATURE_KEY,
} from './runs_types';
import {createGroupBy} from './utils';
import {getExperimentIdsFromRoute} from '../../app_routing/store/app_routing_selectors';
import {
  getDashboardDisplayedHparamColumns,
  getDashboardSessionGroups,
} from '../../hparams/_redux/hparams_selectors';
import {HparamValue, RunToHparamsAndMetrics} from '../../hparams/types';
import {ColumnHeader, SortingInfo} from '../../widgets/data_table/types';
import {dataTableUtils} from '../../widgets/data_table/utils';

const getRunsState = createFeatureSelector<RunsState>(RUNS_FEATURE_KEY);

const getDataState = createSelector(
  getRunsState,
  (state: RunsState): RunsDataState => {
    return state.data;
  }
);

/**
 * Returns Observable that emits map of RunId to ExperimentId.
 */
export const getRunIdToExperimentId = createSelector(
  getDataState,
  (state: RunsDataState): Record<RunId, ExperimentId> => {
    return state.runIdToExpId;
  }
);

/**
 * Returns Observable that emits ExperimentId of given Run.
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
 * This is intended to be used in the experiment_list page.
 * TODO(rileyajones) remove usage of this selector from the timeseries dashboard.
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
 * Determines hparam data for each run in the active route.
 *
 * Attempts to match each run with a session and, if found, copies the hparam
 * values from the corresponding session group to the run.
 *
 * Note, it returns an RunToHparamsAndMetrics but leaves the `metrics` field
 * blank since the Hparams data sources does not actually retrieve metrics
 * data.
 *
 * Meant for usage in the Dashboard views.
 */
export const getDashboardRunsToHparams = createSelector(
  getDashboardSessionGroups,
  getExperimentIdsFromRoute,
  getDataState,
  (dashboardSessionGroups, experimentIds, state): RunToHparamsAndMetrics => {
    if (!experimentIds) {
      return {};
    }

    const runIds: string[] = [];
    for (const experimentId of experimentIds) {
      runIds.push(...(state.runIds[experimentId] || []));
    }

    const sessionToHparams: Record<string, HparamValue[]> = {};
    for (const sessionGroup of dashboardSessionGroups) {
      const hparams: HparamValue[] = Object.entries(sessionGroup.hparams).map(
        (keyValue) => {
          const [hparam, value] = keyValue;
          return {name: hparam, value};
        }
      );
      for (const session of sessionGroup.sessions) {
        sessionToHparams[session.name] = hparams;
      }
    }

    // Sort sessions based on length of name. We want to match runs with the
    // longest matching session name. So, for example, given sessions "1" and
    // "11", a run with name "11/train" should match with session "11".
    const sortedSessionKeys = Object.keys(sessionToHparams).sort(
      (a, b) => b.length - a.length
    );

    const runToHparamsAndMetrics: RunToHparamsAndMetrics = {};
    for (const runId of runIds) {
      for (const sessionName of sortedSessionKeys) {
        if (runId.startsWith(sessionName)) {
          runToHparamsAndMetrics[runId] = {
            hparams: sessionToHparams[sessionName],
            // The underlying data source that fetches the session groups data
            // does not retrieve metrics.
            metrics: [],
          };
          break;
        }
      }
    }
    return runToHparamsAndMetrics;
  }
);

export const getRunToHparamMap = createSelector(
  getDashboardRunsToHparams,
  (runToHparamsAndMetrics: RunToHparamsAndMetrics): RunToHparamMap => {
    const runToHparamMap: RunToHparamMap = {};
    for (const [runName, {hparams}] of Object.entries(runToHparamsAndMetrics)) {
      runToHparamMap[runName] = new Map(
        hparams.map(({name, value}) => [name, value])
      );
    }
    return runToHparamMap;
  }
);

/**
 * Get the runs used on the dashboard.
 */
export const getDashboardRuns = createSelector(
  getDataState,
  getExperimentIdsFromRoute,
  getDashboardRunsToHparams,
  (
    state: RunsDataState,
    experimentIds: string[] | null,
    runsToHparamsAndMetrics: RunToHparamsAndMetrics
  ): Array<Run & {experimentId: string}> => {
    if (!experimentIds) {
      return [];
    }
    return experimentIds
      .map((experimentId) => {
        return (state.runIds[experimentId] || [])
          .filter((id) => Boolean(state.runMetadata[id]))
          .map((runId) => {
            const run = {...state.runMetadata[runId], experimentId};
            run.hparams = runsToHparamsAndMetrics[runId]?.hparams ?? null;
            run.metrics = runsToHparamsAndMetrics[runId]?.metrics ?? null;
            return run;
          });
      })
      .flat();
  }
);

/**
 * Returns Observable that emits runs list for an experiment.
 */
export const getRunIdsForExperiment = createSelector(
  getDataState,
  (state: RunsDataState, props: {experimentId: string}): string[] => {
    return state.runIds[props.experimentId] ?? [];
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
 * Returns user defined run grouping setting.
 *
 * User can define it by either specifying it in URL or by interacting with the
 * color group by menu. Returns `null` if user has not defined one and is
 * currently its default.
 *
 * @see getRunGroupBy for actual groupBy that you should use for a view. This
 * selector was meant to be for settings persistence.
 */
export const getRunUserSetGroupBy = createSelector(
  getDataState,
  (dataState: RunsDataState): GroupBy | null => {
    return dataState.userSetGroupByKey !== null
      ? createGroupBy(
          dataState.userSetGroupByKey,
          dataState.colorGroupRegexString
        )
      : null;
  }
);

/**
 * Returns current run grouping setting.
 */
export const getRunGroupBy = createSelector(
  getRunUserSetGroupBy,
  getDataState,
  (userSetGroupBy: GroupBy | null, dataState: RunsDataState): GroupBy => {
    return userSetGroupBy ?? dataState.initialGroupBy;
  }
);

/**
 * Returns Observable that emits regex filter on the run selector.
 */
export const getRunSelectorRegexFilter = createSelector(
  getDataState,
  (state: RunsDataState): string => {
    return state.regexFilter;
  }
);

const getUiState = createSelector(
  getRunsState,
  (state: RunsState): RunsUiState => {
    return state.ui;
  }
);

/**
 * Returns Observable that emits selection state of runs. If the runs for the
 * current route are desired, please see ui_selectors.ts's
 * getCurrentRouteRunSelection instead.
 */
export const getRunSelectionMap = createSelector(
  getUiState,
  (uiState: RunsUiState): Map<string, boolean> => {
    return uiState.selectionState;
  }
);

export const getRunColorOverride = createSelector(
  getDataState,
  (state: RunsDataState): Map<string, string> => {
    return state.runColorOverrideForGroupBy;
  }
);

export const getDefaultRunColorIdMap = createSelector(
  getDataState,
  (state: RunsDataState): Map<string, number> => {
    return state.defaultRunColorIdForGroupBy;
  }
);

/**
 * Returns Observable that emits color grouping regex string.
 */
export const getColorGroupRegexString = createSelector(
  getDataState,
  (state: RunsDataState): string => {
    return state.colorGroupRegexString;
  }
);

/**
 * Gets the standard columns to be displayed by the runs table.
 */
export const getRunsTableHeaders = createSelector(
  getUiState,
  (state: RunsUiState): ColumnHeader[] => {
    return state.runsTableHeaders;
  }
);

/**
 * Gets the information needed to sort the runs data table.
 */
export const getRunsTableSortingInfo = createSelector(
  getUiState,
  (state: RunsUiState): SortingInfo => {
    return state.sortingInfo;
  }
);

/**
 * Gets the grouped columns to be displayed by the runs table.
 */
export const getGroupedRunsTableHeaders = createSelector(
  getRunsTableHeaders,
  getDashboardDisplayedHparamColumns,
  (runsTableHeaders, hparamColumns) =>
    dataTableUtils.groupColumns([...runsTableHeaders, ...hparamColumns])
);
