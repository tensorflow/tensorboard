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

import {DataLoadState, LoadState} from '../../types/data';
import {ColorPalette, DEFAULT_PALETTE} from '../../util/colors';

export const SETTINGS_FEATURE_KEY = 'settings';

export interface Settings {
  reloadPeriodInMs: number;
  reloadEnabled: boolean;
  // Size of a page in a general paginated view that is configurable by user via
  // settings.
  pageSize: number;
  colorPalette: ColorPalette;
}

export interface SettingsState extends LoadState {
  settings: Settings;
}

export interface State {
  [SETTINGS_FEATURE_KEY]?: SettingsState;
}

export const initialState: SettingsState = {
  state: DataLoadState.LOADED,
  lastLoadedTimeInMs: Date.now(),

  settings: {
    reloadPeriodInMs: 30000,
    reloadEnabled: false,
    pageSize: 12,
    colorPalette: DEFAULT_PALETTE,
  },
};
