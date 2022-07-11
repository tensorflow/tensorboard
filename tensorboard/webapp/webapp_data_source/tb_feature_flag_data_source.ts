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
import {QueryParams} from './query_params';
import {TBFeatureFlagDataSource} from './tb_feature_flag_data_source_types';
import {
  BaseFeatureFlagType,
  FeatureFlagMetadata,
  FeatureFlagQueryParameters,
  FeatureFlagType,
} from './tb_feature_flag_query_parameters';

const DARK_MODE_MEDIA_QUERY = '(prefers-color-scheme: dark)';

// TODO(tensorboard-team): QueryParamsFeatureFlagDataSource now is a misnomer as
// it also sources the data from media query as well as the query parameter.
// Decide how to move forward with more sources of the data + composability.
@Injectable()
export class QueryParamsFeatureFlagDataSource
  implements TBFeatureFlagDataSource
{
  constructor(readonly queryParams: QueryParams) {}

  getFeatures(enableMediaQuery: boolean = false) {
    // Set feature flag value for query parameters that are explicitly
    // specified. Feature flags for unspecified query parameters remain unset so
    // their values in the underlying state are not inadvertently changed.
    const featureFlags: Partial<Record<keyof FeatureFlags, FeatureFlagType>> =
      enableMediaQuery ? this.getPartialFeaturesFromMediaQuery() : {};
    Object.entries(FeatureFlagQueryParameters).forEach(
      ([flagName, flagMetadata]) => {
        const featureValue = this.getFeatureValue(flagMetadata);
        if (featureValue !== null) {
          const f = flagName as keyof FeatureFlags;
          featureFlags[f] = featureValue;
        }
      }
    );
    return featureFlags as Partial<FeatureFlags>;
  }

  protected getFeatureValue(
    flagMetadata: FeatureFlagMetadata
  ): FeatureFlagType {
    const params = this.queryParams.getParams();
    const queryParamOverride = flagMetadata.queryParamOverride;
    if (!queryParamOverride || !params.has(queryParamOverride)) {
      return null;
    }
    const paramValues: BaseFeatureFlagType[] = this.queryParams
      .getParams()
      .getAll(queryParamOverride)
      .map(flagMetadata.parseValue);
    if (!paramValues.length) {
      return null;
    }
    return paramValues.length > 1 ? paramValues : paramValues[0];
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

export const TEST_ONLY = {DARK_MODE_MEDIA_QUERY};
