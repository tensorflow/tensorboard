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
import {FeatureFlags} from '../types';

export type FeatureFlagType =
  | boolean
  | number
  | string
  | string[]
  | null
  | undefined;

export type FeatureFlagMetadata<T> = {
  defaultValue: T;
  // The name of the query param users can use to override the feature flag
  // value. If unspecified then users cannot override the feature flag value.
  queryParamOverride?: string;
  // Function that translates a query param value into the feature flag value.
  parseValue: (str: string) => T;
  // Optional function that translates a feature flag value into a query param
  // value. If unspecified then any query param value will be encoded using
  // value.toString().
  encodeValue?: (value: T) => string;
};

export type FeatureFlagMetadataMapType<T extends FeatureFlags> = {
  [FlagName in keyof T]: FeatureFlagMetadata<T[FlagName]>;
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

export function parseStringArray(str: string): string[] {
  if (!str) {
    return [];
  }
  return str.split(',');
}

export function encodeStringArray(stringArray: string[]): string {
  return stringArray.join(',');
}

export const FeatureFlagMetadataMap: FeatureFlagMetadataMapType<FeatureFlags> =
  {
    scalarsBatchSize: {
      defaultValue: undefined,
      queryParamOverride: 'scalarsBatchSize',
      parseValue: parseInt,
    },
    enabledColorGroup: {
      defaultValue: true,
      queryParamOverride: 'enableColorGroup',
      parseValue: parseBoolean,
    },
    enabledColorGroupByRegex: {
      defaultValue: true,
      queryParamOverride: 'enableColorGroupByRegex',
      parseValue: parseBoolean,
    },
    enabledExperimentalPlugins: {
      defaultValue: [],
      queryParamOverride: 'experimentalPlugin',
      parseValue: parseStringArray,
      encodeValue: encodeStringArray,
    },
    enabledLinkedTime: {
      defaultValue: false,
      queryParamOverride: 'enableLinkedTime',
      parseValue: parseBoolean,
    },
    enabledCardWidthSetting: {
      defaultValue: true,
      queryParamOverride: 'enableCardWidthSetting',
      parseValue: parseBoolean,
    },
    enabledScalarDataTable: {
      defaultValue: false,
      queryParamOverride: 'enableDataTable',
      parseValue: parseBoolean,
    },
    forceSvg: {
      defaultValue: false,
      queryParamOverride: 'forceSVG',
      parseValue: parseBoolean,
    },
    enableDarkModeOverride: {
      defaultValue: null,
      parseValue: parseBooleanOrNull,
    },
    defaultEnableDarkMode: {
      defaultValue: false,
      queryParamOverride: 'darkMode',
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

/**
 * Gets gets just the default values of each feature flag from the provided metadata.
 */
export function generateFeatureFlagDefaults<T extends FeatureFlags>(
  featureFlagMetadataMap: FeatureFlagMetadataMapType<T>
): T {
  return Object.entries(featureFlagMetadataMap).reduce(
    (map, [key, {defaultValue}]) => {
      map[key] = defaultValue;
      return map;
    },
    {} as Record<string, any>
  ) as T;
}
