/* Copyright 2021 The TensorFlow Authors. All Rights Reserved.

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
import * as actions from './settings_actions';
import {SettingsState, initialState} from './settings_types';

const reducer = createReducer(
  initialState,
  on(
    actions.toggleReloadEnabled,
    (state: SettingsState): SettingsState => {
      return {
        ...state,
        reloadEnabled: !state.reloadEnabled,
      };
    }
  ),
  on(
    actions.changeReloadPeriod,
    (state: SettingsState, {periodInMs}): SettingsState => {
      const nextReloadPeriod =
        periodInMs > 0 ? periodInMs : state.reloadPeriodInMs;
      return {
        ...state,
        reloadPeriodInMs: nextReloadPeriod,
      };
    }
  ),
  on(actions.changePageSize, (state: SettingsState, {size}) => {
    const nextPageSize = size > 0 ? size : state.pageSize;
    return {
      ...state,
      pageSize: nextPageSize,
    };
  }),
);

export function reducers(state: SettingsState | undefined, action: Action) {
  return reducer(state, action);
}
