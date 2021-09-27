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
 * @fileoverview Module that provides convenience selector for UI.
 *
 * NOTE: For accessing a specific feature, please define and use the selectors
 * provided by the feature.
 *
 * This module provides selectors that access states across multiple features
 * for convenience of the UI[1].
 *
 * [1]: In most cases, one should be able to use combination of rxjs primitives
 * like `mergeMap` and `withLatestFrom` to achieve the same thing.
 */

import {createSelector} from '@ngrx/store';

import {
  getExperimentIdsFromRoute,
  getExperimentIdToAliasMap,
  getRouteKind,
} from '../app_routing/store/app_routing_selectors';
import {RouteKind} from '../app_routing/types';
import {State} from '../app_state';
import {getExperiment} from '../experiments/store/experiments_selectors';
import {
  getDefaultRunColorIdMap,
  getRunColorOverride,
  getRuns,
  getRunSelectionMap,
  getRunSelectorRegexFilter,
} from '../runs/store/runs_selectors';
import {Run} from '../runs/types';
import {CHART_COLOR_PALLETE, NON_MATCHED_COLOR} from './colors';
import {matchRunToRegex, RunMatchable} from './matcher';

interface RunAndNames extends Run {
  experimentAlias: string;
  experimentName: string;
}

/**
 * Selects the run selection (runId to boolean) of current routeId.
 *
 * Note that emits null when current route is not about an experiment.
 */
export const getCurrentRouteRunSelection = createSelector(
  (state: State): Map<string, boolean> | null => {
    const experimentIds = getExperimentIdsFromRoute(state);
    return experimentIds ? getRunSelectionMap(state, {experimentIds}) : null;
  },
  getRunSelectorRegexFilter,
  (state: State): Map<string, RunMatchable> => {
    const experimentIds = getExperimentIdsFromRoute(state) ?? [];
    const aliasMap = getExperimentIdToAliasMap(state);

    const runMatchableMap = new Map<string, RunMatchable>();
    for (const experimentId of experimentIds) {
      const experiment = getExperiment(state, {experimentId});
      if (!experiment) continue;
      const runs = getRuns(state, {experimentId});
      for (const run of runs) {
        runMatchableMap.set(run.id, {
          runName: run.name,
          experimentName: experiment.name,
          experimentAlias: aliasMap[experimentId],
        });
      }
    }
    return runMatchableMap;
  },
  getRouteKind,
  (runSelection, regexFilter, runMatchableMap, routeKind) => {
    if (!runSelection) return null;
    const includeExperimentInfo = routeKind === RouteKind.COMPARE_EXPERIMENT;
    const filteredSelection = new Map<string, boolean>();

    for (const [runId, value] of runSelection.entries()) {
      const runMatchable = runMatchableMap.get(runId)!;
      filteredSelection.set(
        runId,
        matchRunToRegex(runMatchable, regexFilter, includeExperimentInfo) &&
          value
      );
    }
    return filteredSelection;
  }
);

/**
 * Returns Observable that emits map of run id to run color (hex) from
 * current color palettes.
 */
export const getRunColorMap = createSelector(
  getDefaultRunColorIdMap,
  getRunColorOverride,
  (defaultRunColorId, colorOverride): Record<string, string> => {
    const colorObject: Record<string, string> = {};
    defaultRunColorId.forEach((colorId, runId) => {
      let colorHexValue = NON_MATCHED_COLOR;
      if (colorOverride.has(runId)) {
        colorHexValue = colorOverride.get(runId)!;
      } else if (colorId >= 0) {
        colorHexValue =
          CHART_COLOR_PALLETE[colorId % CHART_COLOR_PALLETE.length];
      }
      colorObject[runId] = colorHexValue;
    });
    return colorObject;
  }
);
