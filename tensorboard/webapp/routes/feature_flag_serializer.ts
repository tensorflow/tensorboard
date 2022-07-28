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
      const defaultValue =
        featureFlagMetadataMap[featureFlag as keyof FeatureFlags]?.defaultValue;
      if (!key || featureValue === undefined || featureValue === defaultValue) {
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
