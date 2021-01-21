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
  EXPERIMENTAL_PLUGIN_QUERY_PARAM_KEY,
  GPU_LINE_CHART_QUERY_PARAM_KEY,
  SCALARS_BATCH_SIZE_PARAM_KEY,
  TBFeatureFlagDataSource,
} from './tb_feature_flag_data_source_types';
import {FeatureFlags} from '../feature_flag/types';

/**
 * Save the initial URL query params, before the AppRoutingEffects initialize.
 */
const initialURLSearchParams = new URLSearchParams(window.location.search);

const util = {
  getParams() {
    return initialURLSearchParams;
  },
};

@Injectable()
export class QueryParamsFeatureFlagDataSource extends TBFeatureFlagDataSource {
  getFeatures() {
    const params = this.getParams();
    // Set feature flag value for query parameters that are explicitly
    // specified. Feature flags for unspecified query parameters remain unset so
    // their values in the underlying state are not inadvertently changed.
    const featureFlags: Partial<FeatureFlags> = {};
    if (params.has(EXPERIMENTAL_PLUGIN_QUERY_PARAM_KEY)) {
      featureFlags.enabledExperimentalPlugins = params.getAll(
        EXPERIMENTAL_PLUGIN_QUERY_PARAM_KEY
      );
    }
    if (params.has('tensorboardColab')) {
      featureFlags.inColab = params.get('tensorboardColab') === 'true';
    }
    if (params.has(GPU_LINE_CHART_QUERY_PARAM_KEY)) {
      featureFlags.enableGpuChart =
        params.get(GPU_LINE_CHART_QUERY_PARAM_KEY) === 'true';
    }
    if (params.has(SCALARS_BATCH_SIZE_PARAM_KEY)) {
      featureFlags.scalarsBatchSize = Number(
        params.get(SCALARS_BATCH_SIZE_PARAM_KEY)
      );
    }
    return featureFlags;
  }

  protected getParams() {
    return util.getParams();
  }
}

export const TEST_ONLY = {util};
