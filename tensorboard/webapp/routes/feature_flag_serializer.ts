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

export function featureFlagsToSerializableQueryParams<
  T extends FeatureFlagType
>(
  overriddenFeatureFlags: Partial<FeatureFlags>,
  featureFlagMetadataMap: Record<string, FeatureFlagMetadata<T>>
): SerializableQueryParams {
  return Object.entries(overriddenFeatureFlags)
    .map(([featureFlag, featureValue]) => {
      const key =
        featureFlagMetadataMap[featureFlag as keyof FeatureFlags]
          ?.queryParamOverride;
      if (!key || featureValue === undefined) {
        return [];
      }
      /**
       * Features with array values should be serialized as multiple query params, e.g.
       * enabledExperimentalPlugins: {
       *    queryParamOverride: 'experimentalPlugin',
       *    values: ['foo', 'bar'],
       *  }
       *    Should be serialized to:
       * ?experimentalPlugin=foo&experimentalPlugin=bar
       *
       * Because values can be arrays it is easiest to convert non array values to an
       * array, then flatten the result.
       */
      const values = Array.isArray(featureValue)
        ? featureValue
        : [featureValue];
      return values.map((value) => ({
        key,
        value: value?.toString(),
      }));
    })
    .flat()
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
): T | T[] | null {
  const queryParamOverride = flagMetadata.queryParamOverride;
  if (!queryParamOverride || !params.has(queryParamOverride)) {
    return null;
  }
  /**
   * Array type feature flags are intended to be overridden multiple times
   * i.e. ?experimentalPlugin=foo&experimentalPlugin=bar
   * By using get params.getAll we can reuse the logic between array and non array types.
   */
  const paramValues: T[] = params.getAll(queryParamOverride).map((value) => {
    return flagMetadata.parseValue(value) as T;
  });
  if (!paramValues.length) {
    return null;
  }

  // There will always be an array of values but if the flag is not declared to be an array
  // there SHOULD only be a single value which should then be returned.
  return flagMetadata.isArray ? paramValues : paramValues[0];
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
