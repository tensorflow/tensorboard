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
import {InjectionToken} from '@angular/core';
import {Selector} from '@ngrx/store';
import {PersistableSettings} from './_data_source/types';

export type SettingSelector<
  State,
  Settings extends PersistableSettings
> = Selector<State, Partial<Settings>>;

export const GLOBAL_PERSISTENT_SETTINGS_TOKEN = new InjectionToken(
  '[Persistent Settings] Global Settings'
);
