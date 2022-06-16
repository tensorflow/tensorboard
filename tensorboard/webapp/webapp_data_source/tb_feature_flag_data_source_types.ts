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
  abstract getFeatures(enableMediaQuery?: boolean): Partial<FeatureFlags>;

  /**
   * Stores the given feature flag state in localStorage to allow for more
   * persistent flag state.
   *
   * @param flagKey the key for the flag whose status is being stored
   * @param value A boolean establishing
   */
  abstract storeFeatureFlag(flagKey: string, value: boolean): void;

  /**
   * Gets the value stored in localStorage for the given key. If no state exists
   * in localStorage it returns null
   *
   * @param flagKey the key for the flag whose status is being checked
   */
  abstract getPersistentFeatureFlagState(flagKey: string): boolean | null;
}
