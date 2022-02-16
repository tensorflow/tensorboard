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
// import {FeatureFlags} from '../feature_flag/types';
// import {QueryParams} from './query_params';
// import {
//   ENABLE_CARD_WIDTH_SETTING_PARAM_KEY,
//   ENABLE_COLOR_GROUP_BY_REGEX_QUERY_PARAM_KEY,
//   ENABLE_COLOR_GROUP_QUERY_PARAM_KEY,
//   ENABLE_DARK_MODE_QUERY_PARAM_KEY,
//   ENABLE_LINK_TIME_PARAM_KEY,
//   ENABLE_TIME_NAMESPACED_STATE,
//   EXPERIMENTAL_PLUGIN_QUERY_PARAM_KEY,
//   FORCE_SVG_RENDERER,
//   SCALARS_BATCH_SIZE_PARAM_KEY,
//   TBFeatureFlagDataSource,
// } from './tb_feature_flag_data_source_types';
import {QueryParamsFeatureFlagDataSource as NewDataSource} from '../feature_flag/data_source/tb_feature_flag_data_source';

const DARK_MODE_MEDIA_QUERY = '(prefers-color-scheme: dark)';

// TODO(tensorboard-team): QueryParamsFeatureFlagDataSource now is a misnomer as
// it also sources the data from media query as well as the query parameter.
// Decide how to move forward with more sources of the data + composability.
@Injectable()
export class QueryParamsFeatureFlagDataSource
  implements TBFeatureFlagDataSource
{
  newDataSource: NewDataSource;
  constructor(readonly queryParams: QueryParams) {
    this.newDataSource = new NewDataSource(queryParams);
  }

  getFeatures(enableMediaQuery: boolean = false) {
    return this.newDataSource.getFeatures(enableMediaQuery);
  }

  protected getPartialFeaturesFromMediaQuery(): {
    defaultEnableDarkMode?: boolean;
  } {
    return this.newDataSource.getPartialFeaturesFromMediaQuery(
      defaultEnableDarkMode
    );
  }
}

export const TEST_ONLY = {DARK_MODE_MEDIA_QUERY};
