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

// HACK: These imports are for type inference.
// https://github.com/bazelbuild/rules_nodejs/issues/1013
/** @typehack */ import * as _typeHackStore from '@ngrx/store/store';

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
        pluginsListLoaded: {
          ...state.pluginsListLoaded,
          state: DataLoadState.LOADING,
        },
      };
    }
  ),
  on(
    actions.pluginsListingFailed,
    (state: CoreState): CoreState => {
      return {
        ...state,
        pluginsListLoaded: {
          ...state.pluginsListLoaded,
          state: DataLoadState.FAILED,
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
      return {
        ...state,
        activePlugin,
        plugins,
        pluginsListLoaded: {
          state: DataLoadState.LOADED,
          lastLoadedTimeInMs: Date.now(),
        },
      };
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
  })
);

export function reducers(state: CoreState | undefined, action: Action) {
  return reducer(state, action);
}
