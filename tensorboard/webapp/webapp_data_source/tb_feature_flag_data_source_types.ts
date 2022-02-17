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
}

export const EXPERIMENTAL_PLUGIN_QUERY_PARAM_KEY = 'experimentalPlugin';

export const SCALARS_BATCH_SIZE_PARAM_KEY = 'scalarsBatchSize';

export const ENABLE_CARD_WIDTH_SETTING_PARAM_KEY = 'enableCardWidthSetting';

export const ENABLE_COLOR_GROUP_QUERY_PARAM_KEY = 'enableColorGroup';

export const ENABLE_COLOR_GROUP_BY_REGEX_QUERY_PARAM_KEY =
  'enableColorGroupByRegex';

export const ENABLE_DARK_MODE_QUERY_PARAM_KEY = 'darkMode';

export const ENABLE_LINK_TIME_PARAM_KEY = 'enableLinkTime';

export const ENABLE_TIME_NAMESPACED_STATE = 'enableTimeNamespacedState';

export const FORCE_SVG_RENDERER = 'forceSVG';
