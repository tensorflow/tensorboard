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

import {buildFeatureFlag} from '../testing';
import {FeatureFlagMetadataMap} from './feature_flag_metadata';
import {FeatureFlagState, FEATURE_FLAG_FEATURE_KEY} from './feature_flag_types';

export {buildFeatureFlag} from '../testing';

export function buildFeatureFlagState(
  override: Partial<FeatureFlagState> = {}
): FeatureFlagState {
  return {
    isFeatureFlagsLoaded: true,
    defaultFlags: buildFeatureFlag(),
    metadata: FeatureFlagMetadataMap,
    ...override,
    flagOverrides: override.flagOverrides ?? {},
  };
}

export function buildState(
  featureFlagState: FeatureFlagState = buildFeatureFlagState()
) {
  return {
    [FEATURE_FLAG_FEATURE_KEY]: featureFlagState,
  };
}
