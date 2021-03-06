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
import {Action, createReducer, on} from '@ngrx/store';
import {DataLoadState} from '../../types/data';
import * as actions from '../actions';
import {CoreState, initialState} from './core_types';

const reducer = createReducer(
  initialState,
  on(
    actions.changePlugin,
    actions.pluginUrlHashChanged,
    (state: CoreState, {plugin}): CoreState => {
      return {...state, activePlugin: plugin};
    }
  ),
  on(
    actions.pluginsListingRequested,
    (state: CoreState): CoreState => {
      return {
        ...state,
        coreDataLoadState: {
          ...state.coreDataLoadState,
          state: DataLoadState.LOADING,
        },
        pluginsListLoaded: {
          ...state.pluginsListLoaded,
          state: DataLoadState.LOADING,
        },
      };
    }
  ),
  on(
    actions.pluginsListingFailed,
    (state: CoreState, {failureCode}): CoreState => {
      return {
        ...state,
        coreDataLoadState: {
          ...state.coreDataLoadState,
          state: DataLoadState.FAILED,
        },
        pluginsListLoaded: {
          ...state.pluginsListLoaded,
          state: DataLoadState.FAILED,
          failureCode,
        },
      };
    }
  ),
  on(
    actions.pluginsListingLoaded,
    (state: CoreState, {plugins}): CoreState => {
      const firstEnabledPluginId =
        Object.keys(plugins).find((pluginId) => {
          return plugins[pluginId].enabled;
        }) || null;
      const activePlugin = state.activePlugin || firstEnabledPluginId;
      const lastLoadedTimeInMs = Date.now();
      let coreDataLoadState = state.coreDataLoadState;

      if (state.polymerRunsLoadState.state === DataLoadState.LOADED) {
        coreDataLoadState = {
          state: DataLoadState.LOADED,
          lastLoadedTimeInMs,
        };
      }

      return {
        ...state,
        activePlugin,
        coreDataLoadState,
        plugins,
        pluginsListLoaded: {
          state: DataLoadState.LOADED,
          lastLoadedTimeInMs,
          failureCode: null,
        },
      };
    }
  ),
  on(
    actions.polymerRunsFetchRequested,
    (state: CoreState): CoreState => {
      return {
        ...state,
        coreDataLoadState: {
          ...state.coreDataLoadState,
          state: DataLoadState.LOADING,
        },
        polymerRunsLoadState: {
          ...state.polymerRunsLoadState,
          state: DataLoadState.LOADING,
        },
      };
    }
  ),
  on(
    actions.polymerRunsFetchSucceeded,
    (state: CoreState): CoreState => {
      const lastLoadedTimeInMs = Date.now();
      let coreDataLoadState = state.coreDataLoadState;

      if (state.pluginsListLoaded.state === DataLoadState.LOADED) {
        coreDataLoadState = {
          state: DataLoadState.LOADED,
          lastLoadedTimeInMs,
        };
      }

      return {
        ...state,
        coreDataLoadState,
        polymerRunsLoadState: {
          ...state.polymerRunsLoadState,
          state: DataLoadState.LOADED,
          lastLoadedTimeInMs,
        },
      };
    }
  ),
  on(
    actions.polymerRunsFetchFailed,
    (state: CoreState): CoreState => {
      return {
        ...state,
        coreDataLoadState: {
          ...state.coreDataLoadState,
          state: DataLoadState.FAILED,
        },
        polymerRunsLoadState: {
          ...state.polymerRunsLoadState,
          state: DataLoadState.FAILED,
        },
      };
    }
  ),
  on(
    actions.environmentLoaded,
    (state: CoreState, {environment}): CoreState => {
      return {...state, environment: environment};
    }
  ),
  on(
    actions.toggleReloadEnabled,
    (state: CoreState): CoreState => {
      return {
        ...state,
        reloadEnabled: !state.reloadEnabled,
      };
    }
  ),
  on(
    actions.changeReloadPeriod,
    (state: CoreState, {periodInMs}): CoreState => {
      const nextReloadPeriod =
        periodInMs > 0 ? periodInMs : state.reloadPeriodInMs;
      return {
        ...state,
        reloadPeriodInMs: nextReloadPeriod,
      };
    }
  ),
  on(actions.changePageSize, (state: CoreState, {size}) => {
    const nextPageSize = size > 0 ? size : state.pageSize;
    return {
      ...state,
      pageSize: nextPageSize,
    };
  }),
  on(actions.fetchRunSucceeded, (state, {runs}) => {
    // Do not modify the runSelection since the Polymer component is the
    // source of truth for the Polymer Interop.
    return {...state, polymerInteropRuns: runs};
  }),
  on(actions.polymerInteropRunSelectionChanged, (state, {nextSelection}) => {
    return {...state, polymerInteropRunSelection: new Set(nextSelection)};
  })
);

export function reducers(state: CoreState | undefined, action: Action) {
  return reducer(state, action);
}
