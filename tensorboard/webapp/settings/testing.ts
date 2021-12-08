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
import {DataLoadState} from '../types/data';
import {ColorPalette, DEFAULT_PALETTE} from '../util/colors';
import {
  Settings,
  SettingsState,
  SETTINGS_FEATURE_KEY,
  State,
} from './_redux/settings_types';

export function createSettings(override?: Partial<Settings>) {
  return {
    reloadPeriodInMs: 30000,
    reloadEnabled: true,
    pageSize: 10,
    colorPalette: DEFAULT_PALETTE,
    ...override,
  };
}

export function createSettingsState(
  override?: Partial<SettingsState>
): SettingsState {
  return {
    state: DataLoadState.LOADED,
    lastLoadedTimeInMs: 0,
    settings: createSettings(),
    ...override,
  };
}

export function createState(settingsState: SettingsState): State {
  return {[SETTINGS_FEATURE_KEY]: settingsState};
}

export function buildColorPalette(
  override: Partial<ColorPalette> = {}
): ColorPalette {
  return {
    id: 'testing',
    name: 'Testing color',
    colors: [
      {name: 'color1', lightHex: '#000', darkHex: '#aaa'},
      {name: 'color2', lightHex: '#111', darkHex: '#bbb'},
      {name: 'color3', lightHex: '#222', darkHex: '#ccc'},
    ],
    inactive: {name: 'color4', lightHex: '#333', darkHex: '#ddd'},
    ...override,
  };
}
