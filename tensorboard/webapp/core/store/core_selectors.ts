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
import {Environment, PluginId, PluginsListing} from '../../types/api';
import {LoadState} from '../../types/data';
import {CoreState, State, CORE_FEATURE_KEY} from './core_types';
import {Run, RunId} from '../types';

// HACK: These imports are for type inference.
// https://github.com/bazelbuild/rules_nodejs/issues/1013
/** @typehack */ import * as _typeHackSelector from '@ngrx/store/src/selector';
/** @typehack */ import * as _typeHackStore from '@ngrx/store/store';

const selectCoreState = createFeatureSelector<State, CoreState>(
  CORE_FEATURE_KEY
);

export const getPluginsListLoaded = createSelector(
  selectCoreState,
  (state: CoreState): LoadState => state.pluginsListLoaded
);

export const getActivePlugin = createSelector(
  selectCoreState,
  (state: CoreState): PluginId | null => {
    return state.activePlugin;
  }
);

export const getPlugins = createSelector(
  selectCoreState,
  (state: CoreState): PluginsListing => {
    return state.plugins;
  }
);

export const getEnvironment = createSelector(
  selectCoreState,
  (state: CoreState): Environment => {
    return state.environment;
  }
);

export const getReloadEnabled = createSelector(
  selectCoreState,
  (state: CoreState): boolean => {
    return state.reloadEnabled;
  }
);

export const getReloadPeriodInMs = createSelector(
  selectCoreState,
  (state: CoreState): number => {
    return state.reloadPeriodInMs;
  }
);

export const getPageSize = createSelector(
  selectCoreState,
  (state: CoreState): number => {
    return state.pageSize;
  }
);

export const getRuns = createSelector(
  selectCoreState,
  (state: CoreState): Run[] => {
    return state.polymerInteropRuns;
  }
);

const selectSelection = createSelector(
  selectCoreState,
  (state: CoreState): Set<RunId> => {
    return state.polymerInteropRunSelection;
  }
);

/**
 * runSelection can be `null` when information is yet missing; e.g., run selection for an
 * experiment that is not yet fetched.
 */
export const getRunSelection = createSelector(
  getRuns,
  selectSelection,
  (runs: Run[], selection: Set<RunId>): Map<RunId, boolean> | null => {
    const runSelection = new Map();

    for (const {id} of runs) {
      runSelection.set(id, selection.has(id));
    }

    return runSelection;
  }
);
