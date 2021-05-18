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

import {TooltipSort} from '../../metrics/types';
import {State, SettingsState, SETTINGS_FEATURE_KEY} from './settings_types';

// HACK: These imports are for type inference.
// https://github.com/bazelbuild/rules_nodejs/issues/1013
/** @typehack */ import * as _typeHackSelector from '@ngrx/store/src/selector';

const selectSettingsState = createFeatureSelector<State, SettingsState>(
  SETTINGS_FEATURE_KEY
);

const selectTimeSeriesSettings = createSelector<
  State,
  SettingsState,
  SettingsState['timeSeries']
>(selectSettingsState, (state: SettingsState): SettingsState['timeSeries'] => {
  return state.timeSeries;
});

export const getGlobalTimeSeriesSmoothing = createSelector<
  State,
  SettingsState['timeSeries'],
  number
>(selectTimeSeriesSettings, (state: SettingsState['timeSeries']): number => {
  return state.scalarSmoothing;
});

export const getGlobalTimeSeriesTooltipSort = createSelector<
  State,
  SettingsState['timeSeries'],
  TooltipSort
>(
  selectTimeSeriesSettings,
  (state: SettingsState['timeSeries']): TooltipSort => {
    return state.tooltipSort;
  }
);

export const getGlobalTimeSeriesIgnoreOutliers = createSelector<
  State,
  SettingsState['timeSeries'],
  boolean
>(selectTimeSeriesSettings, (state: SettingsState['timeSeries']): boolean => {
  return state.ignoreOutliers;
});
