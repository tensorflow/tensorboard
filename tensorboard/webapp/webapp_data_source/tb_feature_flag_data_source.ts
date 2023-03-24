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
import {
  FeatureFlagMetadataMapType,
  FeatureFlagType,
} from '../feature_flag/store/feature_flag_metadata';
import {FeatureFlags} from '../feature_flag/types';
import {getOverriddenFeatureFlagValuesFromSearchParams} from '../routes/feature_flag_serializer';
import {QueryParams} from './query_params';
import {TBFeatureFlagDataSource} from './tb_feature_flag_data_source_types';

const DARK_MODE_MEDIA_QUERY = '(prefers-color-scheme: dark)';
const FEATURE_FLAG_STORAGE_KEY = 'tb_feature_flag_storage_key';

@Injectable()
export class FeatureFlagOverrideDataSource implements TBFeatureFlagDataSource {
  constructor(readonly queryParams: QueryParams) {}

  getFeatures(
    enableMediaQuery: boolean,
    featureFlagsMetadata: FeatureFlagMetadataMapType<FeatureFlags>
  ) {
    // Set feature flag value for query parameters that are explicitly
    // specified. Feature flags for unspecified query parameters remain unset so
    // their values in the underlying state are not inadvertently changed.
    const featuresFromMediaQuery: Partial<
      Record<keyof FeatureFlags, FeatureFlagType>
    > = enableMediaQuery ? this.getPartialFeaturesFromMediaQuery() : {};
    const overriddenFeatures = getOverriddenFeatureFlagValuesFromSearchParams(
      featureFlagsMetadata,
      this.queryParams.getParams()
    );
    const persistedFlags = Object.fromEntries(
      Object.entries(this.getPersistentFeatureFlags()).filter(
        ([key]) => featureFlagsMetadata[key as keyof FeatureFlags]
      )
    );
    return {
      ...featuresFromMediaQuery,
      ...persistedFlags,
      ...overriddenFeatures,
    } as Partial<FeatureFlags>;
  }

  persistFeatureFlags(flags: Partial<FeatureFlags>) {
    const currentState = this.getPersistentFeatureFlags();
    const newState = {
      ...currentState,
      ...flags,
    };
    window.localStorage.setItem(
      FEATURE_FLAG_STORAGE_KEY,
      JSON.stringify(newState)
    );
  }

  resetPersistedFeatureFlag<K extends keyof FeatureFlags>(featureFlag: K) {
    const currentState = this.getPersistentFeatureFlags();
    if (currentState[featureFlag] == undefined) {
      return;
    }
    delete currentState[featureFlag];

    // Remove the entire key-value from localStorage when there are no more
    // overrides.
    if (Object.keys(currentState).length === 0) {
      window.localStorage.removeItem(FEATURE_FLAG_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(
      FEATURE_FLAG_STORAGE_KEY,
      JSON.stringify(currentState)
    );
  }

  resetAllPersistedFeatureFlags() {
    window.localStorage.removeItem(FEATURE_FLAG_STORAGE_KEY);
  }

  getPersistentFeatureFlags(): Partial<FeatureFlags> {
    const currentState = window.localStorage.getItem(FEATURE_FLAG_STORAGE_KEY);
    if (currentState == null) {
      return {};
    }

    return JSON.parse(currentState) as Partial<FeatureFlags>;
  }

  protected getPartialFeaturesFromMediaQuery(): {
    defaultEnableDarkMode?: boolean;
  } {
    const featureFlags: {defaultEnableDarkMode?: boolean} = {};
    const defaultEnableDarkMode = window.matchMedia(
      DARK_MODE_MEDIA_QUERY
    ).matches;

    // When media query matches positively, it certainly means user wants it but
    // it is not definitive otherwise (i.e., query params can override it).
    if (defaultEnableDarkMode) {
      featureFlags.defaultEnableDarkMode = true;
    }

    return featureFlags;
  }
}

// Temporary naming for internal code.
export {FeatureFlagOverrideDataSource as QueryParamsFeatureFlagDataSource};

export const TEST_ONLY = {DARK_MODE_MEDIA_QUERY};
