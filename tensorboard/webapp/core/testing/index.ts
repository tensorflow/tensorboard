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
import {
  Environment,
  LoadingMechanismType,
  PluginMetadata,
} from '../../types/api';
import {DataLoadState} from '../../types/data';
import {CoreState, CORE_FEATURE_KEY, State} from '../store/core_types';

export function buildPluginMetadata(
  override: Partial<PluginMetadata>
): PluginMetadata {
  return {
    disable_reload: false,
    enabled: true,
    loading_mechanism: {
      type: LoadingMechanismType.NONE,
    },
    tab_name: 'foo',
    remove_dom: false,
    ...override,
  };
}

export function createPluginMetadata(displayName: string): PluginMetadata {
  return buildPluginMetadata({
    tab_name: displayName,
  });
}

export function createEnvironment(
  override?: Partial<Environment>
): Environment {
  return {
    data_location: 'test/dir',
    window_title: 'TensorBoard',
    ...override,
  };
}

export function createCoreState(override?: Partial<CoreState>): CoreState {
  return {
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
    environment: createEnvironment(),
    polymerRunsLoadState: {
      state: DataLoadState.NOT_LOADED,
      lastLoadedTimeInMs: null,
    },
    polymerInteropRuns: [],
    polymerInteropRunSelection: new Set(),
    sideBarWidthInPercent: 0,
    runsTableFullScreen: false,
    unknownQueryParams: {},
    ...override,
  };
}

export function createState(coreState: CoreState = createCoreState()): State {
  return {[CORE_FEATURE_KEY]: coreState};
}
