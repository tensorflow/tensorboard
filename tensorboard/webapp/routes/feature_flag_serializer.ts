/* Copyright 2022 The TensorFlow Authors. All Rights Reserved.

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
import {SerializableQueryParams} from '../app_routing/types';
import {
  FeatureFlagMetadata,
  FeatureFlagMetadataMapType,
  FeatureFlagType,
} from '../feature_flag/store/feature_flag_metadata';
import {FeatureFlags} from '../feature_flag/types';

export function featureFlagsToSerializableQueryParams<T extends FeatureFlags>(
  overriddenFeatureFlags: Partial<FeatureFlags>,
  featureFlagMetadataMap: FeatureFlagMetadataMapType<T>
): SerializableQueryParams {
  return Object.entries(overriddenFeatureFlags)
    .map(([featureFlag, featureValue]) => {
      const featureFlagMetadata: FeatureFlagMetadata<any> =
        featureFlagMetadataMap[featureFlag as keyof FeatureFlags];
      if (!featureFlagMetadata) {
        // No metadata for this feature flag. Shouldn't happen but we must
        // include the check for the compiler.
        // Return empty item. Will be filtered out.
        return {};
      }
      const key = featureFlagMetadata.queryParamOverride;
      if (!key || featureValue === undefined) {
        // Feature flag has no query param or there was no overriden value
        // specified.
        // Return empty item. Will be filtered out.
        return {};
      }
      return {
        key,
        // Note that all FeatureFlagType (string | number | boolean | string[])
        // support toString() and toString() happens to output the format we
        // want. Mostly notably, string[].toString() effectively does join(',').
        // If this does hold when we add new types then consider adding support
        // for custom encoders.
        value: featureValue?.toString(),
      };
    })
    .filter(
      ({key, value}) => key && value !== undefined
    ) as SerializableQueryParams;
}

/**
 * Parses the value of a feature flag from the query params.
 */
export function getFeatureFlagValueFromSearchParams<T extends FeatureFlagType>(
  flagMetadata: FeatureFlagMetadata<T>,
  params: URLSearchParams
): T | null {
  const queryParamOverride = flagMetadata.queryParamOverride;
  if (!queryParamOverride || !params.has(queryParamOverride)) {
    return null;
  }
  const paramValue = params.get(queryParamOverride);
  if (paramValue == null) {
    return null;
  }
  return flagMetadata.parseValue(paramValue);
}

/**
 * Parses all feature flags from the query params.
 */
export function getOverriddenFeatureFlagValuesFromSearchParams<
  T extends FeatureFlags
>(
  featureFlagMetadataMap: FeatureFlagMetadataMapType<T>,
  params: URLSearchParams
) {
  return Object.entries(featureFlagMetadataMap).reduce(
    (overrides, [flagName, flagMetadata]) => {
      const featureValue = getFeatureFlagValueFromSearchParams(
        flagMetadata as FeatureFlagMetadata<any>,
        params
      );

      if (featureValue !== null) {
        const f = flagName as keyof FeatureFlags;
        overrides[f] = featureValue;
      }
      return overrides;
    },
    {} as Partial<Record<keyof FeatureFlags, FeatureFlagType>>
  );
}
