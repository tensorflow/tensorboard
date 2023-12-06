/* Copyright 2023 The TensorFlow Authors. All Rights Reserved.

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
  interface Window {
    tensorboard: {
      tf_storage: TfStorage;
      tf_globals: TfGlobals;
    };
  }
}

export interface SetStringOption {
  defaultValue?: string;
  /**
   * When true, setting the string does not push a new state onto the history.
   * i.e., it uses `history.replaceState` instead of `history.pushState`.
   */
  useLocationReplace?: boolean;
}

export interface TfStorage {
  setString(key: string, value: string, options?: SetStringOption): void;
  getString(key: string): string;
  migrateLegacyURLScheme(): void;
  getUrlHashDict(): Record<string, string>;
}

export interface TfGlobals {
  setUseHash(use: boolean): void;
}
