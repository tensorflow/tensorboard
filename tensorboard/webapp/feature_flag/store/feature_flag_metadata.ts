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

export type BasicFeatureFlagMetadata<T> = {
  defaultValue: T;
  // Some feature flags cannot be overridden by query params in the URL. They
  // should specify null here.
  queryParamOverride: null;
};

export type AdvancedFeatureFlagMetadata<T> = {
  defaultValue: T;
  // Some feature flags can be overridden by query params in the URL. They
  // should specify the name of the query param here.
  queryParamOverride: string;
  // Additionally they should specify a way to parse the query param string
  // values into the feature flag value.
  parseValue: (str: string) => T;
  // Indicates that the feature flag and value should be sent to the server
  // if the user has specified an override value.
  sendToServerWhenOverridden?: boolean;
};

export type FeatureFlagMetadata<T> =
  | BasicFeatureFlagMetadata<T>
  | AdvancedFeatureFlagMetadata<T>;

export type FeatureFlagMetadataMapType<T> = {
  [FlagName in keyof T]: FeatureFlagMetadata<T[FlagName]>;
};

export function parseBoolean(str: string): boolean {
  return str !== 'false';
}

export function parseStringArray(str: string): string[] {
  if (!str) {
    return [];
  }
  return str.split(',');
}

export const FeatureFlagMetadataMap: FeatureFlagMetadataMapType<FeatureFlags> =
  {
    scalarsBatchSize: {
      defaultValue: undefined,
      queryParamOverride: 'scalarsBatchSize',
      parseValue: parseInt,
    },
    enabledExperimentalPlugins: {
      defaultValue: [],
      queryParamOverride: 'experimentalPlugin',
      parseValue: parseStringArray,
    },
    forceSvg: {
      defaultValue: false,
      queryParamOverride: 'forceSVG',
      parseValue: parseBoolean,
    },
    enableDarkModeOverride: {
      defaultValue: null,
      queryParamOverride: null,
    },
    defaultEnableDarkMode: {
      defaultValue: false,
      queryParamOverride: 'darkMode',
      parseValue: parseBoolean,
    },
    isAutoDarkModeAllowed: {
      defaultValue: true,
      queryParamOverride: null,
    },
    inColab: {
      defaultValue: false,
      queryParamOverride: 'tensorboardColab',
      parseValue: parseBoolean,
    },
    metricsImageSupportEnabled: {
      defaultValue: true,
      queryParamOverride: null,
    },
    showFlags: {
      defaultValue: undefined,
      queryParamOverride: 'showFlags',
      parseValue: (str) => str,
    },
    enableScalarColumnCustomization: {
      defaultValue: false,
      queryParamOverride: 'enableScalarColumnCustomization',
      parseValue: parseBoolean,
    },
    enableScalarColumnContextMenus: {
      defaultValue: false,
      queryParamOverride: 'enableScalarColumnContextMenus',
      parseValue: parseBoolean,
    },
    enableSuggestedCards: {
      defaultValue: false,
      queryParamOverride: 'enableSuggestedCards',
      parseValue: parseBoolean,
    },
    enableGlobalPins: {
      defaultValue: true,
      queryParamOverride: 'enableGlobalPins',
      parseValue: parseBoolean,
    },
    enableColorByExperiment: {
      defaultValue: false,
      queryParamOverride: 'enableColorByExperiment',
      parseValue: parseBoolean,
    },
  };

/**
 * Gets gets just the default values of each feature flag from the provided metadata.
 */
export function generateFeatureFlagDefaults<T>(
  featureFlagMetadataMap: FeatureFlagMetadataMapType<T>
): T {
  return Object.entries(featureFlagMetadataMap).reduce(
    (map, [key, metadata]) => {
      map[key] = (metadata as FeatureFlagMetadata<T>).defaultValue;
      return map;
    },
    {} as Record<string, any>
  ) as T;
}
