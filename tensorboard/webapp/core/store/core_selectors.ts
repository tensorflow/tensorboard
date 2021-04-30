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
import {createFeatureSelector, createSelector} from '@ngrx/store';

import {Environment, PluginId, PluginsListing} from '../../types/api';
import {DataLoadState, LoadState} from '../../types/data';
import {
  CoreState,
  CORE_FEATURE_KEY,
  PluginsListLoadState,
  State,
} from './core_types';

// HACK: These imports are for type inference.
// https://github.com/bazelbuild/rules_nodejs/issues/1013
/** @typehack */ import * as _typeHackSelector from '@ngrx/store/src/selector';

const selectCoreState = createFeatureSelector<State, CoreState>(
  CORE_FEATURE_KEY
);

export const getPluginsListLoaded = createSelector(
  selectCoreState,
  (state: CoreState): PluginsListLoadState => state.pluginsListLoaded
);

export const getPolymerRunsLoadState = createSelector(
  selectCoreState,
  (state: CoreState): LoadState => state.polymerRunsLoadState
);

export const getCoreDataLoadedState = createSelector(
  getPluginsListLoaded,
  getPolymerRunsLoadState,
  ({state: pluginsLoadState}, {state: runsLoadState}): DataLoadState => {
    if (pluginsLoadState === runsLoadState) {
      return pluginsLoadState;
    }
    if (
      pluginsLoadState === DataLoadState.LOADING ||
      runsLoadState === DataLoadState.LOADING
    ) {
      return DataLoadState.LOADING;
    }
    if (
      pluginsLoadState === DataLoadState.FAILED ||
      runsLoadState === DataLoadState.FAILED
    ) {
      return DataLoadState.FAILED;
    }
    // State is LOADED only when both states are `LOADED` which is handled by
    // the first if statement.
    return DataLoadState.NOT_LOADED;
  }
);

// TODO(tensorboard-team): AppLastLoaded is currently derived from only plugins
// listing loaded state and runs load state. It should be broken down further
// (such as the environments) and derive this state from the combination of
// other core data load state.
/**
 * Returns last _successful_ loaded time of the applicational state where an
 * applicational state is defined as combinations of plugins listing, runs, and
 * environment.
 *
 * When `getCoreDataLoadedState` returns LOADING, `getAppLastLoadedTimeInMs`
 * returns loaded time for the minimum timestamp of all load states.
 */
export const getAppLastLoadedTimeInMs = createSelector(
  getPluginsListLoaded,
  getPolymerRunsLoadState,
  (
    pluginListLoadState: PluginsListLoadState,
    runsLoadState: LoadState
  ): number | null => {
    if (
      pluginListLoadState.lastLoadedTimeInMs === null ||
      runsLoadState.lastLoadedTimeInMs === null
    ) {
      return null;
    }
    if (pluginListLoadState.state === runsLoadState.state) {
      return Math.max(
        pluginListLoadState.lastLoadedTimeInMs,
        runsLoadState.lastLoadedTimeInMs
      );
    }

    return Math.min(
      pluginListLoadState.lastLoadedTimeInMs,
      runsLoadState.lastLoadedTimeInMs
    );
  }
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
