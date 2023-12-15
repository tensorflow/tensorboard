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
import '../tb_polymer_interop_types';
import {Injectable} from '@angular/core';
import {DeepLinkerInterface, SetStringOption} from './types';

// TODO(tensorboard-team): merge this module with tf_storage/storage.ts when
// tf_ts_library can be referenced by tf_web_library.
const TAB = '__tab__';

@Injectable()
export class HashDeepLinker implements DeepLinkerInterface {
  constructor() {
    // Note: `migrateLegacyURLScheme()` must be called before `setUseHash`, so
    // that tfStorage reads from the actual URL, not the fake hash for tests
    // only.
    window.tensorboard.tf_storage.migrateLegacyURLScheme();
    window.tensorboard.tf_globals.setUseHash(true);
  }

  getString(key: string): string {
    return window.tensorboard.tf_storage.getString(key);
  }

  setString(key: string, value: string, options?: SetStringOption): void {
    window.tensorboard.tf_storage.setString(key, value, options);
  }

  getPluginId(): string {
    return window.tensorboard.tf_storage.getString(TAB);
  }

  setPluginId(pluginId: string, options?: SetStringOption): void {
    this.setString(TAB, pluginId, options);
  }
}

export const TEST_ONLY = {
  TAB,
};
