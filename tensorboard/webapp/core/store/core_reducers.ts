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
import {stateRehydratedFromUrl} from '../../app_routing/actions/app_routing_actions';
import {createNamespaceContextedState} from '../../app_routing/namespaced_state_reducer_helper';
import {persistentSettingsLoaded} from '../../persistent_settings';
import {DataLoadState} from '../../types/data';
import {composeReducers} from '../../util/ngrx';
import * as actions from '../actions';
import {CoreState, initialState} from './core_types';
import {URLDeserializedState} from '../types';

const reducer = createReducer(
  initialState,
  on(
    actions.changePlugin,
    actions.pluginUrlHashChanged,
    (state: CoreState, {plugin}): CoreState => {
      return {...state, activePlugin: plugin};
    }
  ),
  on(actions.pluginsListingRequested, (state: CoreState): CoreState => {
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
  }),
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
  on(actions.pluginsListingLoaded, (state: CoreState, {plugins}): CoreState => {
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
  }),
  on(actions.polymerRunsFetchRequested, (state: CoreState): CoreState => {
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
  }),
  on(actions.polymerRunsFetchSucceeded, (state: CoreState): CoreState => {
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
  }),
  on(actions.polymerRunsFetchFailed, (state: CoreState): CoreState => {
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
  }),
  on(
    actions.environmentLoaded,
    (state: CoreState, {environment}): CoreState => {
      return {...state, environment: environment};
    }
  ),
  on(actions.fetchRunSucceeded, (state, {runs}) => {
    // Do not modify the runSelection since the Polymer component is the
    // source of truth for the Polymer Interop.
    return {...state, polymerInteropRuns: runs};
  }),
  on(actions.polymerInteropRunSelectionChanged, (state, {nextSelection}) => {
    return {...state, polymerInteropRunSelection: new Set(nextSelection)};
  }),
  on(actions.sideBarWidthChanged, (state, {widthInPercent}) => {
    return {
      ...state,
      sideBarWidthInPercent: Math.min(Math.max(0, widthInPercent), 100),
    };
  }),
  on(persistentSettingsLoaded, (state, {partialSettings}) => {
    const nextState = {...state};

    const sideBarWidthInPercent = partialSettings.sideBarWidthInPercent;
    if (
      typeof sideBarWidthInPercent === 'number' &&
      sideBarWidthInPercent >= 0 &&
      sideBarWidthInPercent <= 100
    ) {
      nextState.sideBarWidthInPercent = sideBarWidthInPercent;
    }

    return nextState;
  }),
  on(actions.runsTableFullScreenToggled, (state) => {
    return {
      ...state,
      runsTableFullScreen: !state.runsTableFullScreen,
    };
  }),
  on(stateRehydratedFromUrl, (state, {partialState}) => {
    const {unknownQueryParams = {}} = partialState as URLDeserializedState;
    return {
      ...state,
      unknownQueryParams,
    };
  })
);

// Core state is all namespaced. None of it is non-namespaced.
const {reducers: namespaceContextedReducer} = createNamespaceContextedState<
  CoreState,
  {}
>(initialState, {});

export function reducers(state: CoreState | undefined, action: Action) {
  return composeReducers(reducer, namespaceContextedReducer)(state, action);
}
