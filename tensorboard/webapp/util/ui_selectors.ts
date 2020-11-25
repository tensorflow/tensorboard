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

import {getExperimentIdsFromRoute} from '../app_routing/store/app_routing_selectors';
import {State} from '../app_state';
import {getRunSelectionMap} from '../runs/store/runs_selectors';

/** @typehack */ import * as _typeHackStore from '@ngrx/store';

/**
 * Selects the run selection (runId to boolean) of current routeId.
 *
 * Note that emits null when current route is not about an experiment.
 */
export const getCurrentRouteRunSelection = createSelector(
  (state: State): Map<string, boolean> | null => {
    const experimentIds = getExperimentIdsFromRoute(state);
    if (experimentIds === null) {
      return null;
    }
    return getRunSelectionMap(state, {experimentIds});
  },
  (runSelection) => runSelection
);
