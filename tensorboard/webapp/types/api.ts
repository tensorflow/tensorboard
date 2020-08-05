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

export type PluginId = string;

export enum LoadingMechanismType {
  CUSTOM_ELEMENT = 'CUSTOM_ELEMENT',
  IFRAME = 'IFRAME',
  NG_COMPONENT = 'NG_COMPONENT',
  NONE = 'NONE',
}

export interface NgElementLoadingMechanism {
  /** @export */
  type: LoadingMechanismType.NG_COMPONENT;
}

export interface CustomElementLoadingMechanism {
  /** @export */
  type: LoadingMechanismType.CUSTOM_ELEMENT;
  /** @export */
  element_name: string;
}

export interface IframeLoadingMechanism {
  /** @export */
  type: LoadingMechanismType.IFRAME;
  /** @export */
  module_path: string;
}

export interface NoLoadingMechanism {
  /** @export */
  type: LoadingMechanismType.NONE;
}

export interface PluginMetadata {
  /** @export */
  disable_reload: boolean;
  /** @export */
  enabled: boolean;
  /** @export */
  loading_mechanism:
    | NgElementLoadingMechanism
    | CustomElementLoadingMechanism
    | IframeLoadingMechanism
    | NoLoadingMechanism;
  /** @export */
  tab_name: string;
  /** @export */
  remove_dom: boolean;
}

export type PluginsListing = {
  [pluginName: string]: PluginMetadata;
};

export interface Environment {
  /** @export */
  data_location: string;
  /** @export */
  window_title: string;
  /** @export */
  experiment_name?: string;
  /** @export */
  experiment_description?: string;
  /** @export */
  creation_time?: number;
}

export type GetRunsResponse = string[];
