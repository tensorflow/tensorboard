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

import {createSelector, createFeatureSelector} from '@ngrx/store';

import {FeatureFlags} from '../types';
import {
  FeatureFlagState,
  FEATURE_FLAG_FEATURE_KEY,
  State,
} from './feature_flag_types';

/** @typehack */ import * as _typeHackNgrxStore from '@ngrx/store';

const selectFeatureFlagState = createFeatureSelector<State, FeatureFlagState>(
  FEATURE_FLAG_FEATURE_KEY
);

export const getIsFeatureFlagsLoaded = createSelector(
  selectFeatureFlagState,
  (state) => {
    return state.isFeatureFlagsLoaded;
  }
);

export const getFeatureFlags = createSelector(
  selectFeatureFlagState,
  (state: FeatureFlagState): FeatureFlags => {
    return {
      ...state.defaultFlags,
      ...state.flagOverrides,
    };
  }
);

export const getOverriddenFeatureFlags = createSelector(
  selectFeatureFlagState,
  (state: FeatureFlagState): Partial<FeatureFlags> => {
    // Temporarily assume state.flagOverrides can be undefined for sync purposes.
    return state.flagOverrides || {};
  }
);

export const getEnabledExperimentalPlugins = createSelector(
  getFeatureFlags,
  (flags) => {
    return flags.enabledExperimentalPlugins;
  }
);

export const getIsInColab = createSelector(getFeatureFlags, (flags) => {
  return flags.inColab;
});

export const getIsGpuChartEnabled = createSelector(
  getFeatureFlags,
  (flags): boolean => {
    return flags.enableGpuChart;
  }
);
