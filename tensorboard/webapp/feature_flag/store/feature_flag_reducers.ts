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
import {Action, createReducer, on} from '@ngrx/store';
import {globalSettingsLoaded, ThemeValue} from '../../persistent_settings';
import * as actions from '../actions/feature_flag_actions';
import {FeatureFlags} from '../types';
import {initialState} from './feature_flag_store_config_provider';
import {FeatureFlagState} from './feature_flag_types';

const reducer = createReducer<FeatureFlagState>(
  initialState,
  on(actions.partialFeatureFlagsLoaded, (state, {features}) => {
    // Feature flag values have been loaded from a data source. Override current
    // flags with any values specified by the data source and leave values for
    // unspecified properties unchanged.

    return {
      ...state,
      isFeatureFlagsLoaded: true,
      flagOverrides: {
        ...state.flagOverrides,
        ...features,
      },
    };
  }),
  on(actions.overrideEnableDarkModeChanged, (state, {enableDarkMode}) => {
    return {
      ...state,
      flagOverrides: {
        ...state.flagOverrides,
        enableDarkModeOverride: enableDarkMode,
      },
    };
  }),
  on(actions.featureFlagOverrideChanged, (state, newOverrides) => {
    return {
      ...state,
      flagOverrides: {
        ...state.flagOverrides,
        ...newOverrides.flags,
      },
    };
  }),
  on(actions.resetFeatureFlagOverrides, (state, overrides) => {
    if (!overrides || !overrides.flags || !overrides.flags.length) {
      return state;
    }
    const flagOverrides = {...state.flagOverrides};
    overrides.flags.forEach((key) => {
      delete flagOverrides[key as keyof FeatureFlags];
    });
    return {
      ...state,
      flagOverrides,
    };
  }),
  on(actions.resetAllFeatureFlagOverrides, (state) => {
    return {
      ...state,
      flagOverrides: {},
    };
  }),
  on(globalSettingsLoaded, (state, {partialSettings}) => {
    if (!partialSettings.themeOverride) {
      return state;
    }

    let overrideValue: null | boolean;
    switch (partialSettings.themeOverride) {
      case ThemeValue.BROWSER_DEFAULT:
        overrideValue = null;
        break;
      case ThemeValue.DARK:
        overrideValue = true;
        break;

      case ThemeValue.LIGHT:
        overrideValue = false;
        break;
    }

    return {
      ...state,
      flagOverrides: {
        ...state.flagOverrides,
        enableDarkModeOverride: overrideValue,
      },
    };
  })
);

export function reducers(state: FeatureFlagState | undefined, action: Action) {
  return reducer(state, action);
}
