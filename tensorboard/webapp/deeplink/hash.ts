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

import {Injectable} from '@angular/core';

import {DeepLinkerInterface, SetStringOption} from './types';

// TODO(tensorboard-team): merge this module with tf_storage/storage.ts when
// tf_ts_library can be referenced by tf_web_library.
const TAB = '__tab__';

interface TfGlobalsElement extends HTMLElement {
  tf_globals: {
    setUseHash(use: boolean): void;
  };
}

interface TfStorageElement extends HTMLElement {
  tf_storage: {
    setString(key: string, value: string, options?: SetStringOption): void;
    getString(key: string): string;
  };
}

@Injectable()
export class HashDeepLinker implements DeepLinkerInterface {
  private readonly tfStorage: TfStorageElement;

  constructor() {
    this.tfStorage = document.createElement('tf-storage') as TfStorageElement;
    const tfGlobals = document.createElement('tf-globals') as TfGlobalsElement;

    tfGlobals.tf_globals.setUseHash(true);
  }

  getString(key: string): string {
    return this.tfStorage.tf_storage.getString(key);
  }

  setString(key: string, value: string, options?: SetStringOption): void {
    this.tfStorage.tf_storage.setString(key, value, options);
  }

  getPluginId(): string {
    return this.getString(TAB);
  }

  setPluginId(pluginId: string, options?: SetStringOption): void {
    this.setString(TAB, pluginId, options);
  }
}

export const TEST_ONLY = {
  TAB,
};
