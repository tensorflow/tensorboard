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
import {PluginMetadata, LoadingMechanismType, LoadState} from '../../types/api';
import {CoreState, State, CORE_FEATURE_KEY} from '../core.reducers';

export function createPluginMetadata(displayName: string): PluginMetadata {
  return {
    disable_reload: false,
    enabled: true,
    loading_mechanism: {
      type: LoadingMechanismType.NONE,
    },
    tab_name: displayName,
    remove_dom: false,
  };
}

export function createCoreState(override?: Partial<CoreState>): CoreState {
  return {
    activePlugin: null,
    plugins: {},
    pluginsListLoaded: {
      state: LoadState.NOT_LOADED,
      lastLoadedTimeInMs: null,
    },
    reloadPeriodInMs: 30000,
    reloadEnabled: true,
    ...override,
  };
}

export function createState(coreState: CoreState): State {
  return {[CORE_FEATURE_KEY]: coreState};
}
