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
  displayName: string;
  queryParamOverride?: string;
  parseValue: (str: string) => T;
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
    displayName: 'scalarsBatchSize',
    queryParamOverride: SCALARS_BATCH_SIZE_PARAM_KEY,
    parseValue: parseInt,
  },
  enabledColorGroup: {
    displayName: 'enabledColorGroup',
    queryParamOverride: ENABLE_COLOR_GROUP_QUERY_PARAM_KEY,
    parseValue: parseBoolean,
  },
  enabledColorGroupByRegex: {
    displayName: 'enabledColorGroupByRegex',
    queryParamOverride: ENABLE_COLOR_GROUP_BY_REGEX_QUERY_PARAM_KEY,
    parseValue: parseBoolean,
  },
  enabledExperimentalPlugins: {
    displayName: 'enabledExperimentalPlugins',
    queryParamOverride: EXPERIMENTAL_PLUGIN_QUERY_PARAM_KEY,
    parseValue: (str: string) => [str],
  },
  enabledLinkedTime: {
    displayName: 'enabledLinkedTime',
    queryParamOverride: ENABLE_LINKED_TIME_PARAM_KEY,
    parseValue: parseBoolean,
  },
  enabledCardWidthSetting: {
    displayName: 'enabledCardWidthSetting',
    queryParamOverride: ENABLE_CARD_WIDTH_SETTING_PARAM_KEY,
    parseValue: parseBoolean,
  },
  enabledScalarDataTable: {
    displayName: 'enabledScalarDataTable',
    queryParamOverride: ENABLE_DATA_TABLE_PARAM_KEY,
    parseValue: parseBoolean,
  },
  forceSvg: {
    displayName: 'forceSvg',
    queryParamOverride: FORCE_SVG_RENDERER,
    parseValue: parseBoolean,
  },
  enableDarkModeOverride: {
    displayName: 'enableDarkModeOverride',
    parseValue: parseBooleanOrNull,
  },
  defaultEnableDarkMode: {
    displayName: 'defaultEnableDarkMode',
    queryParamOverride: ENABLE_DARK_MODE_QUERY_PARAM_KEY,
    parseValue: parseBoolean,
  },
  isAutoDarkModeAllowed: {
    displayName: 'isAutoDarkModeAllowed',
    parseValue: parseBoolean,
  },
  inColab: {
    displayName: 'inColab',
    parseValue: parseBoolean,
  },
  metricsImageSupportEnabled: {
    displayName: 'metricsImageSupportEnabled',
    parseValue: parseBoolean,
  },
  enableTimeSeriesPromotion: {
    displayName: 'enableTimeSeriesPromotion',
    parseValue: parseBoolean,
  },
};
