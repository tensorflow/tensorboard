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
import {createFeatureSelector, createSelector} from '@ngrx/store';
import {DataLoadState} from '../../types/data';
import {ColorPalette} from '../../util/colors';
import {SettingsState, SETTINGS_FEATURE_KEY} from './settings_types';

const selectSettingsState =
  createFeatureSelector<SettingsState>(SETTINGS_FEATURE_KEY);

export const getSettingsLoadState = createSelector(
  selectSettingsState,
  (state: SettingsState): DataLoadState => {
    return state.state;
  }
);

export const getReloadEnabled = createSelector(
  selectSettingsState,
  (state: SettingsState): boolean => {
    return state.settings.reloadEnabled;
  }
);

export const getReloadPeriodInMs = createSelector(
  selectSettingsState,
  (state: SettingsState): number => {
    return state.settings.reloadPeriodInMs;
  }
);

export const getPageSize = createSelector(
  selectSettingsState,
  (state: SettingsState): number => {
    return state.settings.pageSize;
  }
);

export const getColorPalette = createSelector(
  selectSettingsState,
  (state: SettingsState): ColorPalette => {
    return state.settings.colorPalette;
  }
);
