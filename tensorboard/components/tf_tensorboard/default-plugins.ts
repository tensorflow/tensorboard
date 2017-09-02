/* Copyright 2017 The TensorFlow Authors. All Rights Reserved.

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

export interface DashboardInformation {
  // The name of the element for the dashboard (excluding the angle brackets on
  // either side). For instance, tf-scalar-dashboard. Used to select the correct
  // dashboard when a user enters it.
  elementName: string;

  // The name of the plugin associated with this dashboard. This string must
  // match the PLUGIN_NAME specified by the backend of the plugin. Each plugin
  // can be associated with no more than 1 plugin - this also means that each
  // dashboard has a unique plugin field.
  plugin: string;

  // The string to show in the menu item for this dashboard within the
  // navigation bar. That tab name may differ from the plugin name. For
  // instance, the tab name should not use underscores to separate words.
  tabName: string;
}

// Maps plugin name (must match the backend) to DashboardInformation.
const PLUGIN_TO_DASHBOARD_INFORMATION
    : {[key: string]: DashboardInformation} = {
  'scalars': {
    elementName: 'tf-scalar-dashboard',
    plugin: 'scalars',
    tabName: 'Scalars',
  },
  'images': {
    elementName: 'tf-image-dashboard',
    plugin: 'images',
    tabName: 'Images',
  },
  'audio': {
    elementName: 'tf-audio-dashboard',
    plugin: 'audio',
    tabName: 'Audio',
  },
  'graphs': {
    elementName: 'tf-graph-dashboard',
    plugin: 'graphs',
    tabName: 'Graphs',
  },
  'distributions': {
    elementName: 'tf-distribution-dashboard',
    plugin: 'distributions',
    tabName: 'Distributions',
  },
  'histograms': {
    elementName: 'tf-histogram-dashboard',
    plugin: 'histograms',
    tabName: 'Histograms',
  },
  'projector': {
    elementName: 'vz-projector-dashboard',
    plugin: 'projector',
    tabName: 'Projector',
  },
  'text': {
    elementName: 'tf-text-dashboard',
    plugin: 'text',
    tabName: 'Text',
  },
  'pr_curves': {
    elementName: 'tf-pr-curve-dashboard',
    plugin: 'pr_curves',
    tabName: 'PR Curves',
  },
  'profile': {
    elementName: 'tf-profile-dashboard',
    plugin: 'profile',
    tabName: 'Profile',
  },
};
