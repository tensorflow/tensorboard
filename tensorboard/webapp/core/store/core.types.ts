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
import {
  PluginId,
  PluginsListing,
  LoadState as DataLoadState,
} from '../../types/api';

export const CORE_FEATURE_KEY = 'core';

export interface LoadState {
  state: DataLoadState;
  // Time since epoch.
  lastLoadedTimeInMs: number | null;
}

export interface CoreState {
  activePlugin: PluginId | null;
  plugins: PluginsListing;
  pluginsListLoaded: LoadState;
  reloadPeriodInMs: number;
  reloadEnabled: boolean;
}

export interface State {
  [CORE_FEATURE_KEY]?: CoreState;
}
