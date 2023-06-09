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
import {Injectable} from '@angular/core';
import {FeatureFlagMetadataMapType} from '../feature_flag/store/feature_flag_metadata';
import {FeatureFlags} from '../feature_flag/types';

@Injectable()
export abstract class TBFeatureFlagDataSource {
  /**
   * Gets feature flags defined.
   *
   * The "feature" is very loosely defined so other applications can define more
   * flags. It is up to the application to better type the flags and create necessary
   * facilities (e.g., strongly typed selector).
   *
   * The data source may leave some or all feature flags unspecified if it does
   * not have enough information to provide values.
   */
  abstract getFeatures(
    enableMediaQuery: boolean,
    featureFlagsMetadata: FeatureFlagMetadataMapType<FeatureFlags>
  ): Partial<FeatureFlags>;

  /**
   * Stores the given feature flag values in localStorage to allow for more
   * persistent flag state.
   *
   * @param flags An object holding the feature flags that are to be stored.
   */
  abstract persistFeatureFlags(flags: Partial<FeatureFlags>): void;

  /**
   * Removes the localStorage override of the given flag. If the flag is not
   * overridden no changes should occur.
   *
   * @param featureFlag The featureFlag to be reset. It must be a key in the
   * FeatureFlags object.
   */
  abstract resetPersistedFeatureFlag<K extends keyof FeatureFlags>(
    featureFlag: K
  ): void;

  /**
   * Removes all feature flags overridden in localStorage.
   */
  abstract resetAllPersistedFeatureFlags(): void;

  /**
   * Gets the serialized data stored in localStorage for the stored feature
   * flags.
   */
  abstract getPersistentFeatureFlags(): Partial<FeatureFlags>;
}
