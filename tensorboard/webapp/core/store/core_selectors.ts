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
import {CoreState, CORE_FEATURE_KEY, PluginsListLoadState} from './core_types';

const selectCoreState = createFeatureSelector<CoreState>(CORE_FEATURE_KEY);

export const getPluginsListLoaded = createSelector(
  selectCoreState,
  (state: CoreState): PluginsListLoadState => state.pluginsListLoaded
);

export const getPolymerRunsLoadState = createSelector(
  selectCoreState,
  (state: CoreState): LoadState => state.polymerRunsLoadState
);

export const getCoreDataLoadedState = createSelector(
  selectCoreState,
  (state: CoreState): DataLoadState => {
    return state.coreDataLoadState.state;
  }
);
/**
 * Returns last _successful_ loaded time of the applicational state where an
 * applicational state is defined as combinations of plugins listing, runs, and
 * environment.
 */
export const getAppLastLoadedTimeInMs = createSelector(
  selectCoreState,
  (coreState: CoreState): number | null => {
    return coreState.coreDataLoadState.lastLoadedTimeInMs;
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

export const getUnknownQueryParams = createSelector(
  selectCoreState,
  (state: CoreState) => {
    return state.unknownQueryParams;
  }
);

export const getEnvironment = createSelector(
  selectCoreState,
  (state: CoreState): Environment => {
    return state.environment;
  }
);

export const getSideBarWidthInPercent = createSelector(
  selectCoreState,
  (state: CoreState): number => {
    return state.sideBarWidthInPercent;
  }
);

export const getRunsTableFullScreen = createSelector(
  selectCoreState,
  (state: CoreState): boolean => {
    return state.runsTableFullScreen;
  }
);
