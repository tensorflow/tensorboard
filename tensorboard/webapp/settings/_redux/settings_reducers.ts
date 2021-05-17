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
import {DEFAULT_TIMESERIES_SETTINGS, SettingsState} from './settings_types';

const reducer = createReducer<SettingsState>(
  {
    timeSeries: DEFAULT_TIMESERIES_SETTINGS,
  },
  on(
    actions.tooltipSortChanged,
    (state: SettingsState, {sort}): SettingsState => {
      return {
        ...state,
        timeSeries: {
          ...state.timeSeries,
          tooltipSort: sort,
        },
      };
    }
  ),
  on(
    actions.scalarSmoothingChanged,
    (state: SettingsState, {smoothing}): SettingsState => {
      return {
        ...state,
        timeSeries: {
          ...state.timeSeries,
          scalarSmoothing: smoothing,
        },
      };
    }
  ),
  on(
    actions.ignoreOutliersToggled,
    (state: SettingsState): SettingsState => {
      return {
        ...state,
        timeSeries: {
          ...state.timeSeries,
          ignoreOutliers: !state.timeSeries.ignoreOutliers,
        },
      };
    }
  )
);

export function reducers(state: SettingsState | undefined, action: Action) {
  return reducer(state, action);
}
