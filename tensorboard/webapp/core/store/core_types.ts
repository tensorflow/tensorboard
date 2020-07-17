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

import {Run, RunId} from '../types';

export const CORE_FEATURE_KEY = 'core';

export interface CoreState {
  activePlugin: PluginId | null;
  plugins: PluginsListing;
  pluginsListLoaded: LoadState;
  reloadPeriodInMs: number;
  reloadEnabled: boolean;
  // Size of a page in a general paginated view that is configurable by user via
  // settings.
  pageSize: number;
  environment: Environment;
  // TODO(stephanwlee): move these state to the `runs` features.
  // For now, we want them here for Polymer interop states reasons, too.
  polymerInteropRuns: Run[];
  polymerInteropRunSelection: Set<RunId>;
}

export interface State {
  [CORE_FEATURE_KEY]?: CoreState;
}

export const initialState: CoreState = {
  activePlugin: null,
  plugins: {},
  pluginsListLoaded: {
    state: DataLoadState.NOT_LOADED,
    lastLoadedTimeInMs: null,
  },
  reloadPeriodInMs: 30000,
  reloadEnabled: false,
  pageSize: 12,
  environment: {
    data_location: '',
    window_title: '',
  },
  polymerInteropRuns: [],
  polymerInteropRunSelection: new Set(),
};
