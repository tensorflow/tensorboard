/* Copyright 2020 The TensorFlow Authors. All Rights Reserved.

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
import {InjectionToken} from '@angular/core';
import {StoreConfig} from '@ngrx/store';
import {FeatureFlagState} from './feature_flag_types';

export const initialState: FeatureFlagState = {
  isFeatureFlagsLoaded: false,
  defaultFlags: {
    isAutoDarkModeAllowed: true,
    defaultEnableDarkMode: false,
    enableDarkModeOverride: null,
    enabledColorGroup: true,
    enabledColorGroupByRegex: true,
    enabledExperimentalPlugins: [],
    inColab: false,
    scalarsBatchSize: undefined,
    metricsImageSupportEnabled: true,
    enabledLinkedTime: false,
    enableTimeSeriesPromotion: false,
    enabledCardWidthSetting: true,
    enabledTimeNamespacedState: false,
    forceSvg: false,
  },
  flagOverrides: {},
};

/**
 * Injection token for providing feature flag StoreConfig.
 */
export const FEATURE_FLAG_STORE_CONFIG_TOKEN: InjectionToken<
  StoreConfig<FeatureFlagState>
> = new InjectionToken<StoreConfig<FeatureFlagState>>(
  '[Feature Flag] Store Config'
);

/**
 * Returns initialState for feature flags with sensible default values for
 * OSS TensorBoard.
 *
 * Other instances of TensorBoard can override these default values by
 * providing their own StoreConfig using the FEATURE_FLAG_STORE_CONFIG_TOKEN
 * injection token.
 */
export function getConfig(): StoreConfig<FeatureFlagState> {
  return {initialState};
}
