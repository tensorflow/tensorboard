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
export enum LoadState {
  NOT_LOADED,
  LOADED,
  LOADING,
  FAILED,
}

export type PluginId = string;

export enum LoadingMechanismType {
  CUSTOM_ELEMENT = 'CUSTOM_ELEMENT',
  IFRAME = 'IFRAME',
  NONE = 'NONE',
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
