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

import {createAction, props} from '@ngrx/store';
import {FeatureFlags} from '../types';

/**
 * Signals that a data source has loaded feature flag values.
 *
 * Some or all feature flag properties can be unspecified if the data source
 * does not have enough information to provide values. In that case, the
 * corresponding feature flag values should remain unchanged in the State.
 */
export const partialFeatureFlagsLoaded = createAction(
  '[FEATURE FLAG] Partial Feature Flags Loaded',
  props<{
    features: Partial<FeatureFlags>;
  }>()
);

export const overrideEnableDarkModeChanged = createAction(
  '[FEATURE FLAG] Enable Dark Mode Override Changed',
  props<{
    enableDarkMode: boolean | null;
  }>()
);

export const featureFlagOverrideChanged = createAction(
  '[FEATURE FLAG] Store the feature flags in persistent localStorage',
  props<{
    flags: Partial<FeatureFlags>;
  }>()
);

export const resetFeatureFlagOverrides = createAction(
  '[FEATURE FLAG] Resetting feature flag overrides',
  props<{
    flags: Array<keyof FeatureFlags>;
  }>()
);

export const resetAllFeatureFlagOverrides = createAction(
  '[FEATURE FLAG] Resetting all feature flag overrides',
  // NgRx does not allow actions without props.
  (props = undefined) => props
);
