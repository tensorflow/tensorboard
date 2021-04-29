/* Copyright 2021 The TensorFlow Authors. All Rights Reserved.

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
declare global {
  // createElement type uses the TagNameMap underneath and returns the right type.
  interface HTMLElementTagNameMap {
    'tf-backend': TfBackendElement;
    'tf-globals': TfGlobalsElement;
    'tf-storage': TfStorageElement;
  }
}

export interface TfGlobals {
  /** @export */
  setUseHash(use: boolean): void;
}

export interface TfGlobalsElement extends HTMLElement {
  /** @export */
  tf_globals: TfGlobals;
}

export interface SetStringOption {
  /** @export */
  defaultValue?: string;
  /**
   * When true, setting the string does not push a new state onto the history.
   * i.e., it uses `history.replaceState` instead of `history.pushState`.
   * @export
   */
  useLocationReplace?: boolean;
}

export interface TfStorage {
  /** @export */
  setString(key: string, value: string, options?: SetStringOption): void;
  /** @export */
  getString(key: string): string;
  /** @export */
  migrateLegacyURLScheme(): void;
}

export interface TfStorageElement extends HTMLElement {
  /** @export */
  tf_storage: TfStorage;
}

export interface Store {
  /** @export */
  refresh(): Promise<void>;
}

export interface TfBackend {
  /** @export */
  environmentStore: Store;
  /** @export */
  runsStore: Store;
}

export interface TfBackendElement extends HTMLElement {
  /** @export */
  tf_backend: TfBackend;
}
