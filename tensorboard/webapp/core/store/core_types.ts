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

// It is an abstraction leak to incorporate the API types directly into our
// state.  However, it's OK for now, in that it's expedient and avoids keeping
// redundant copies in sync.  If the state shape and the API types need to
// diverge in the future, that's straightforward: we'll leave types/api in place,
// remove this import, and write the divergent state types explicitly here.
import {Environment, PluginId, PluginsListing} from '../../types/api';
import {DataLoadState, LoadState} from '../../types/data';
import {PluginsListFailureCode, Run, RunId} from '../types';

export const CORE_FEATURE_KEY = 'core';

export interface CoreState {
  activePlugin: PluginId | null;
  plugins: PluginsListing;
  // LoadState of all data that is critical for applicational operations.
  coreDataLoadState: LoadState;
  pluginsListLoaded: PluginsListLoadState;
  polymerRunsLoadState: LoadState;
  environment: Environment;
  // TODO(stephanwlee): move these state to the `runs` features.
  // For now, we want them here for Polymer interop states reasons, too.
  polymerInteropRuns: Run[];
  polymerInteropRunSelection: Set<RunId>;
  // Number between 0 and 100.
  sideBarWidthInPercent: number;
  // Whether the runs table should occupy the full screen.
  runsTableFullScreen: boolean;
  unknownQueryParams: Record<string, string>;
}

/*
 * LoadState enhanced with a failureCode field.
 */
export type PluginsListLoadState =
  | NotLoadedPluginsListLoadState
  | LoadedPluginsListLoadState
  | LoadingPluginsListLoadState
  | FailedPluginsListLoadState;

interface NotLoadedPluginsListLoadState extends LoadState {
  state: DataLoadState.NOT_LOADED;
  failureCode: null;
}

interface LoadedPluginsListLoadState extends LoadState {
  state: DataLoadState.LOADED;
  failureCode: null;
}

interface LoadingPluginsListLoadState extends LoadState {
  state: DataLoadState.LOADING;
  // Reason for failure of most recently completed request. This should not be
  // set if there has not been a failure or if the most recently completed
  // request was successful.
  failureCode: PluginsListFailureCode | null;
}

interface FailedPluginsListLoadState extends LoadState {
  state: DataLoadState.FAILED;
  failureCode: PluginsListFailureCode;
}

export interface State {
  [CORE_FEATURE_KEY]?: CoreState;
}

export const initialState: CoreState = {
  activePlugin: null,
  plugins: {},
  coreDataLoadState: {
    state: DataLoadState.NOT_LOADED,
    lastLoadedTimeInMs: null,
  },
  pluginsListLoaded: {
    state: DataLoadState.NOT_LOADED,
    lastLoadedTimeInMs: null,
    failureCode: null,
  },
  environment: {
    data_location: '',
    window_title: '',
  },
  polymerRunsLoadState: {
    state: DataLoadState.NOT_LOADED,
    lastLoadedTimeInMs: null,
  },
  polymerInteropRuns: [],
  polymerInteropRunSelection: new Set(),
  sideBarWidthInPercent: 20,
  runsTableFullScreen: false,
  // Query parameters not recognized by TensorBoard will be stored here.
  // This is necessary so that they can be readded to the query params
  // when the application serializes itself in the deeplink_provider.
  unknownQueryParams: {},
};
