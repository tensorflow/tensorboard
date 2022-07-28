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
import {
  ENABLE_CARD_WIDTH_SETTING_PARAM_KEY,
  ENABLE_COLOR_GROUP_BY_REGEX_QUERY_PARAM_KEY,
  ENABLE_COLOR_GROUP_QUERY_PARAM_KEY,
  ENABLE_DARK_MODE_QUERY_PARAM_KEY,
  ENABLE_DATA_TABLE_PARAM_KEY,
  ENABLE_LINKED_TIME_PARAM_KEY,
  EXPERIMENTAL_PLUGIN_QUERY_PARAM_KEY,
  FORCE_SVG_RENDERER,
  SCALARS_BATCH_SIZE_PARAM_KEY,
} from '../../webapp_data_source/tb_feature_flag_data_source_types';
import {FeatureFlags} from '../types';

export type BaseFeatureFlagType = boolean | number | string | null | undefined;

export type FeatureFlagType = BaseFeatureFlagType | Array<BaseFeatureFlagType>;

export type FeatureFlagMetadata<T> = {
  defaultValue: T;
  queryParamOverride?: string;
  parseValue: (str: string) => T;
  isArray?: boolean;
};

export function parseBoolean(str: string): boolean {
  return str !== 'false';
}

export function parseBooleanOrNull(str: string): boolean | null {
  if (str === 'null') {
    return null;
  }
  return parseBoolean(str);
}

export const FeatureFlagMetadataMap: {
  [FlagName in keyof FeatureFlags]: FeatureFlagMetadata<FeatureFlags[FlagName]>;
} = {
  scalarsBatchSize: {
    defaultValue: undefined,
    queryParamOverride: SCALARS_BATCH_SIZE_PARAM_KEY,
    parseValue: parseInt,
  },
  enabledColorGroup: {
    defaultValue: true,
    queryParamOverride: ENABLE_COLOR_GROUP_QUERY_PARAM_KEY,
    parseValue: parseBoolean,
  },
  enabledColorGroupByRegex: {
    defaultValue: true,
    queryParamOverride: ENABLE_COLOR_GROUP_BY_REGEX_QUERY_PARAM_KEY,
    parseValue: parseBoolean,
  },
  enabledExperimentalPlugins: {
    defaultValue: [],
    queryParamOverride: EXPERIMENTAL_PLUGIN_QUERY_PARAM_KEY,
    parseValue: (str: string) => [str],
    isArray: true,
  },
  enabledLinkedTime: {
    defaultValue: false,
    queryParamOverride: ENABLE_LINKED_TIME_PARAM_KEY,
    parseValue: parseBoolean,
  },
  enabledCardWidthSetting: {
    defaultValue: true,
    queryParamOverride: ENABLE_CARD_WIDTH_SETTING_PARAM_KEY,
    parseValue: parseBoolean,
  },
  enabledScalarDataTable: {
    defaultValue: false,
    queryParamOverride: ENABLE_DATA_TABLE_PARAM_KEY,
    parseValue: parseBoolean,
  },
  forceSvg: {
    defaultValue: false,
    queryParamOverride: FORCE_SVG_RENDERER,
    parseValue: parseBoolean,
  },
  enableDarkModeOverride: {
    defaultValue: null,
    parseValue: parseBooleanOrNull,
  },
  defaultEnableDarkMode: {
    defaultValue: false,
    queryParamOverride: ENABLE_DARK_MODE_QUERY_PARAM_KEY,
    parseValue: parseBoolean,
  },
  isAutoDarkModeAllowed: {
    defaultValue: true,
    parseValue: parseBoolean,
  },
  inColab: {
    defaultValue: false,
    queryParamOverride: 'tensorboardColab',
    parseValue: parseBoolean,
  },
  metricsImageSupportEnabled: {
    defaultValue: true,
    parseValue: parseBoolean,
  },
  enableTimeSeriesPromotion: {
    defaultValue: false,
    parseValue: parseBoolean,
  },
};
