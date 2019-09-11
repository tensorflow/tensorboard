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
  Action,
  createSelector,
  createReducer,
  on,
  createFeatureSelector,
} from '@ngrx/store';
import {PluginId, PluginsListing} from '../types/api';
import * as actions from './core.actions';

// HACK: These imports are for type inference.
// https://github.com/bazelbuild/rules_nodejs/issues/1013
/** @typehack */ import * as _typeHackSelector from '@ngrx/store/src/selector';
/** @typehack */ import * as _typeHackStore from '@ngrx/store/store';

export const CORE_FEATURE_KEY = 'core';

export interface CoreState {
  activePlugin: PluginId | null;
  plugins: PluginsListing;
}

export interface State {
  [CORE_FEATURE_KEY]: CoreState;
}

const initialState: CoreState = {
  activePlugin: null,
  plugins: {},
};

const reducer = createReducer(
  initialState,
  on(actions.changePlugin, (state: CoreState, {plugin}) => {
    return {...state, activePlugin: plugin};
  }),
  on(actions.pluginsListingLoaded, (state: CoreState, {plugins}) => {
    const [firstPlugin] = Object.keys(plugins);
    let activePlugin =
      state.activePlugin !== null ? state.activePlugin : firstPlugin;
    return {activePlugin, plugins};
  })
);

export function reducers(state: CoreState, action: Action) {
  return reducer(state, action);
}

const selectCoreState = createFeatureSelector<State, CoreState>(
  CORE_FEATURE_KEY
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
