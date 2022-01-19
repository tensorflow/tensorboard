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

import {createFeatureSelector, createSelector} from '@ngrx/store';
import {FeatureFlags} from '../types';
import {
  FeatureFlagState,
  FEATURE_FLAG_FEATURE_KEY,
  State,
} from './feature_flag_types';

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

export const getIsAutoDarkModeAllowed = createSelector(
  getFeatureFlags,
  (flags): boolean => {
    return flags.isAutoDarkModeAllowed;
  }
);

export const getDarkModeEnabled = createSelector(
  getFeatureFlags,
  (flags): boolean => {
    return flags.enableDarkModeOverride !== null
      ? flags.enableDarkModeOverride
      : flags.defaultEnableDarkMode;
  }
);

export const getEnableDarkModeOverride = createSelector(
  getFeatureFlags,
  (flags): boolean | null => {
    return flags.enableDarkModeOverride;
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

export const getEnabledColorGroup = createSelector(getFeatureFlags, (flags) => {
  return flags.enabledColorGroup;
});

export const getEnabledColorGroupByRegex = createSelector(
  getFeatureFlags,
  (flags) => {
    return flags.enabledColorGroupByRegex;
  }
);

export const getIsMetricsImageSupportEnabled = createSelector(
  getFeatureFlags,
  (flags) => {
    return flags.metricsImageSupportEnabled;
  }
);

export const getIsLinkedTimeEnabled = createSelector(
  getFeatureFlags,
  (flags: FeatureFlags): boolean => {
    return flags.enabledLinkedTime;
  }
);

export const getIsTimeSeriesPromotionEnabled = createSelector(
  getFeatureFlags,
  (flags: FeatureFlags): boolean => {
    return flags.enableTimeSeriesPromotion;
  }
);

export const getEnabledCardWidthSetting = createSelector(
  getFeatureFlags,
  (flags: FeatureFlags): boolean => {
    return flags.enabledCardWidthSetting;
  }
);

export const getEnabledTimeNamespacedState = createSelector(
  getFeatureFlags,
  (flags: FeatureFlags): boolean => {
    return flags.enabledTimeNamespacedState;
  }
);

export const getForceSvgFeatureFlag = createSelector(
  getFeatureFlags,
  (flags: FeatureFlags): boolean => {
    return flags.forceSvg;
  }
);
