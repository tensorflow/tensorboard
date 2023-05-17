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
import {persistentSettingsLoaded} from '../../persistent_settings';
import {DataLoadState} from '../../types/data';
import * as actions from './settings_actions';
import {Settings, SettingsState, initialState} from './settings_types';

/**
 * Check if settings are ready to modify. We want to reject modifications to
 * settings state until original settings have had the opportunity to load
 * successfully or unsuccessfully.
 */
function settingsReady(state: SettingsState): boolean {
  return (
    state.state !== DataLoadState.NOT_LOADED &&
    state.state !== DataLoadState.LOADING
  );
}

// Auto reload period cannot be lower than 30s to prevent server load.
export const MIN_RELOAD_PERIOD_IN_MS = 30000;

const reducer = createReducer(
  initialState,
  on(actions.toggleReloadEnabled, (state: SettingsState): SettingsState => {
    if (!settingsReady(state)) {
      return state;
    }

    return {
      ...state,
      settings: {
        ...state.settings,
        reloadEnabled: !state.settings.reloadEnabled,
      },
    };
  }),
  on(
    actions.changeReloadPeriod,
    (state: SettingsState, {periodInMs}): SettingsState => {
      if (!settingsReady(state)) {
        return state;
      }

      const nextReloadPeriod =
        periodInMs >= MIN_RELOAD_PERIOD_IN_MS
          ? periodInMs
          : state.settings.reloadPeriodInMs;
      return {
        ...state,
        settings: {
          ...state.settings,
          reloadPeriodInMs: nextReloadPeriod,
        },
      };
    }
  ),
  on(actions.changePageSize, (state: SettingsState, {size}) => {
    if (!settingsReady(state)) {
      return state;
    }

    const nextPageSize = size > 0 ? size : state.settings.pageSize;
    return {
      ...state,
      settings: {
        ...state.settings,
        pageSize: nextPageSize,
      },
    };
  }),
  on(persistentSettingsLoaded, (state, {partialSettings}) => {
    const nextSettings: Partial<Settings> = {};

    if (
      Number.isFinite(partialSettings.pageSize) &&
      partialSettings.pageSize! > 0
    ) {
      nextSettings.pageSize = Number(partialSettings.pageSize);
    }

    if (typeof partialSettings.autoReload === 'boolean') {
      nextSettings.reloadEnabled = partialSettings.autoReload;
    }

    if (
      Number.isFinite(partialSettings.autoReloadPeriodInMs) &&
      partialSettings.autoReloadPeriodInMs! > MIN_RELOAD_PERIOD_IN_MS
    ) {
      nextSettings.reloadPeriodInMs = Number(
        partialSettings.autoReloadPeriodInMs
      );
    }

    return {
      ...state,
      settings: {
        ...state.settings,
        ...nextSettings,
      },
    };
  })
);

export function reducers(state: SettingsState | undefined, action: Action) {
  return reducer(state, action);
}
