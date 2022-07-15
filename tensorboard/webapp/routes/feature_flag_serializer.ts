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

export function getOverriddenFeatureFlagStates<T>(featureFlagQueryParameters: Record<string, FeatureFlagMetadata<T>>): SerializableQueryParams {
  const currentQueryParams = Object.fromEntries(
      serializableQueryParamsToEntries(new Location().getSearch() || []));

  const currentlyOverriddenQueryParams = Object.values(featureFlagQueryParameters)
      .map(({queryParamOverride}: FeatureFlagMetadata<T>) => queryParamOverride)
      .filter((queryParamOverride) => 
        (queryParamOverride &&
            queryParamOverride in currentQueryParams)) as string[];
  return currentlyOverriddenQueryParams.map((queryParamOverride) => {
        return {
            key: queryParamOverride,
            value: currentQueryParams[queryParamOverride],
          };
      });

  function serializableQueryParamsToEntries(
      params: SerializableQueryParams): [string, string][] {
    return params.map(({key, value}) => [key, value]);
  }
}
