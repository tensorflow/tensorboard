/* Copyright 2019 The TensorFlow Authors. All Rights Reserved.

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
export enum ActiveDashboardsLoadState {
  NOT_LOADED,
  LOADED,
  FAILED,
}

export type PluginId = string;

/** Registration for a plugin dashboard UI. */
export interface Dashboard {
  /**
   * Name of the element for the dashboard (excluding the angle brackets on
   * either side). For instance, tf-scalar-dashboard. Used to select the
   * correct dashboard when a user enters it.
   */
  elementName: string;

  /**
   * The name of the plugin associated with this dashboard. This string must
   * match the PLUGIN_NAME specified by the backend of the plugin. Each plugin
   * can be associated with no more than 1 plugin - this also means that each
   * dashboard has a unique plugin field.
   */
  plugin: PluginId;

  /**
   * The string to show in the menu item for this dashboard within the
   * navigation bar. That tab name may differ from the plugin name. For
   * instance, the tab name should not use underscores to separate words.
   */
  tabName: string;

  /**
   * Whether or not tf-tensorboard reload functionality should be disabled.
   *
   * If true, then:
   *   1. the reload button in the top right corner of the TensorBoard UI
   *      will be shaded out
   *   2. the timer that triggers the reload() method to be called every few
   *      seconds will be disabled.
   */
  isReloadDisabled: boolean;
}
