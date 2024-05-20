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

export interface FeatureFlags {
  // Whether user wants to use dark mode by default. It can be set via browser setting
  // (media query) or media query.
  defaultEnableDarkMode: boolean;
  // Specific user override to the default dark mode behavior. If `null`, we
  // will use the `defaultEnableDarkMode`.
  enableDarkModeOverride: boolean | null;
  // Whether the dark mode feature is enabled or disabled at the application
  // level. Temporary flag to gate the feature until it is more feature
  // complete (it is badly broken on Firefox). The feature is still available
  // when using the query parameter, `?darkMode`.
  isAutoDarkModeAllowed: boolean;
  // experimental plugins to manually enable.
  enabledExperimentalPlugins: string[];
  // Whether the TensorBoard is being run inside Colab output cell.
  inColab: boolean;
  // Maximum number of runs to include in a request to get scalar data.
  // `undefined` indicates that we should rely on defaults defined in the
  // dashboards code.
  //
  // See: https://github.com/tensorflow/tensorboard/blob/master/tensorboard/plugins/scalar/tf_scalar_dashboard/tf-scalar-card.ts
  scalarsBatchSize: number | undefined;
  // Whether the Time Series dashboards supports showing Image summary data.
  metricsImageSupportEnabled: boolean;
  // Flag for the escape hatch from WebGL. This only effects the TimeSeries
  // Scalar cards.
  forceSvg: boolean;
  // If defined causes the feature flags modal to appear.
  showFlags: string | undefined;
  // Adds affordance for users to select and reorder the columns in the Scalar
  // Card Data Table
  enableScalarColumnCustomization: boolean;
  // Allows users to manipulate Scalar Card Table columns using context menus.
  enableScalarColumnContextMenus: boolean;
  // Adds a new section at the top of the time series metrics view
  // containing suggested cards based on the users previous interactions.
  enableSuggestedCards: boolean;
  // Persists pinned scalar cards across multiple experiments.
  enableGlobalPins: boolean;
  // Adds a new mode of coloring, by matching the regexp of experiment name.
  enableColorByExperiment: boolean;
}
