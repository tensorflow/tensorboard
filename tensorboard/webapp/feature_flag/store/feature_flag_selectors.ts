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
  FeatureFlagMetadataMapType,
  FeatureFlagType,
} from './feature_flag_metadata';
import {FeatureFlagState, FEATURE_FLAG_FEATURE_KEY} from './feature_flag_types';

const selectFeatureFlagState = createFeatureSelector<FeatureFlagState>(
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

export const getDefaultFeatureFlags = createSelector(
  selectFeatureFlagState,
  (state: FeatureFlagState): FeatureFlags => {
    return state.defaultFlags;
  }
);

export const getOverriddenFeatureFlags = createSelector(
  selectFeatureFlagState,
  (state: FeatureFlagState): Partial<FeatureFlags> => {
    // Temporarily assume state.flagOverrides can be undefined for sync purposes.
    return state.flagOverrides || {};
  }
);

export const getFeatureFlagsMetadata = createSelector(
  selectFeatureFlagState,
  (state: FeatureFlagState): FeatureFlagMetadataMapType<FeatureFlags> => {
    return state.metadata;
  }
);

export const getFeatureFlagsToSendToServer = createSelector(
  selectFeatureFlagState,
  (state: FeatureFlagState): Partial<FeatureFlags> => {
    const featureFlagsToSendToServer: Partial<
      Record<keyof FeatureFlags, FeatureFlagType>
    > = {};
    for (const entry in state.flagOverrides) {
      const entryMetadata = state.metadata[entry as keyof FeatureFlags];
      if (
        entryMetadata &&
        entryMetadata.queryParamOverride &&
        entryMetadata.sendToServerWhenOverridden
      ) {
        featureFlagsToSendToServer[entry as keyof FeatureFlags] =
          state.flagOverrides[entry as keyof FeatureFlags];
      }
    }
    return featureFlagsToSendToServer as Partial<FeatureFlags>;
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

export const getIsMetricsImageSupportEnabled = createSelector(
  getFeatureFlags,
  (flags) => {
    return flags.metricsImageSupportEnabled;
  }
);

export const getForceSvgFeatureFlag = createSelector(
  getFeatureFlags,
  (flags: FeatureFlags): boolean => {
    return flags.forceSvg;
  }
);

export const getShowFlagsEnabled = createSelector(
  getFeatureFlags,
  (flags: FeatureFlags): boolean => {
    return flags.showFlags !== undefined;
  }
);

export const getIsScalarColumnCustomizationEnabled = createSelector(
  getFeatureFlags,
  (flags: FeatureFlags): boolean => {
    return flags.enableScalarColumnCustomization;
  }
);

export const getIsScalarColumnContextMenusEnabled = createSelector(
  getFeatureFlags,
  (flags: FeatureFlags): boolean => {
    return flags.enableScalarColumnContextMenus;
  }
);

export const getEnableGlobalPins = createSelector(
  getFeatureFlags,
  (flags: FeatureFlags): boolean => {
    return flags.enableGlobalPins;
  }
);

export const getEnableColorByExperiment = createSelector(
  getFeatureFlags,
  (flags: FeatureFlags): boolean => {
    return flags.enableColorByExperiment;
  }
);
