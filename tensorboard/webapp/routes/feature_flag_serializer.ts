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
import {Location} from '../app_routing/location';
import {SerializableQueryParams} from '../app_routing/types';
import {FeatureFlagMetadata} from '../feature_flag/store/feature_flag_metadata';

/**
 * Finds all FeatureFlags from the provided FeatureFlagMetadata that are present in the
 * query params and returns their overridden values.
 * Note: If a flag has multiple values in the query params it will be returned multiple
 * times.
 *
 * i.e. The query params '?experimentalPlugin=0&experimentalPlugin=1&experimentalPlugin=2'
 * will result in a return value of
 * [
 *   { key: 'experimentalPlugin', value: '0' },
 *   { key: 'experimentalPlugin', value: '1' },
 *   { key: 'experimentalPlugin', value: '2' },
 * ]
 */
export function getOverriddenFeatureFlagStates<T>(
  featureFlagMetadataMap: Record<string, FeatureFlagMetadata<T>>
): SerializableQueryParams {
  // Converting the array to a map allows for a more efficient filter function below.
  const currentQueryParams = (new Location().getSearch() || []).reduce(
    (map, {key, value}) => {
      if (!map[key]) {
        map[key] = [];
      }
      map[key].push(value);

      return map;
    },
    {} as Record<string, string[]>
  );

  const currentlyOverriddenQueryParams = Object.values(featureFlagMetadataMap)
    .map(({queryParamOverride}: FeatureFlagMetadata<T>) => queryParamOverride)
    .filter(
      (queryParamOverride) =>
        queryParamOverride && queryParamOverride in currentQueryParams
    ) as string[];
  return currentlyOverriddenQueryParams
    .map((queryParamOverride) => {
      return currentQueryParams[queryParamOverride].map((value) => ({
        key: queryParamOverride,
        value,
      }));
    })
    .flat();
}
