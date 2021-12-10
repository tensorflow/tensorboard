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
import {InjectionToken} from '@angular/core';
import {StoreConfig} from '@ngrx/store';
import {DeepLinkerInterface} from '../../deeplink';
import {CoreState, initialState} from './core_types';

export const CORE_STORE_CONFIG_TOKEN = new InjectionToken<
  StoreConfig<CoreState>
>('Core Feature Config');

export function getConfig(
  deepLinker: DeepLinkerInterface
): StoreConfig<CoreState> {
  return {
    initialState: {
      ...initialState,
      activePlugin: deepLinker.getPluginId() || null,
    },
  };
}
