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
import {persistentSettingsLoaded, ThemeValue} from '../../persistent_settings';
import * as actions from '../actions/feature_flag_actions';
import {buildFeatureFlag} from '../testing';
import {reducers} from './feature_flag_reducers';
import {buildFeatureFlagState} from './testing';

describe('feature_flag_reducers', () => {
  describe('featuresLoaded', () => {
    it('sets isFeatureFlagsLoaded to true', () => {
      const prevState = buildFeatureFlagState({
        isFeatureFlagsLoaded: false,
      });
      const nextState = reducers(
        prevState,
        actions.partialFeatureFlagsLoaded({features: {}})
      );

      expect(nextState).toEqual(
        buildFeatureFlagState({
          isFeatureFlagsLoaded: true,
        })
      );
    });

    it('does not overwrite default flags', () => {
      const prevState = buildFeatureFlagState({
        isFeatureFlagsLoaded: false,
        defaultFlags: buildFeatureFlag({
          enabledExperimentalPlugins: ['foo'],
        }),
      });
      const nextState = reducers(
        prevState,
        actions.partialFeatureFlagsLoaded({
          features: {
            enabledExperimentalPlugins: ['foo', 'bar'],
          },
        })
      );

      expect(nextState.defaultFlags).toEqual(
        buildFeatureFlag({
          enabledExperimentalPlugins: ['foo'],
        })
      );
    });

    it('sets the new feature flags onto the state.flagOverrides', () => {
      const prevState = buildFeatureFlagState({
        isFeatureFlagsLoaded: false,
        flagOverrides: buildFeatureFlag({
          enabledExperimentalPlugins: ['foo'],
        }),
      });
      const nextState = reducers(
        prevState,
        actions.partialFeatureFlagsLoaded({
          features: {
            enabledExperimentalPlugins: ['foo', 'bar'],
          },
        })
      );

      expect(nextState.flagOverrides).toEqual(
        buildFeatureFlag({
          enabledExperimentalPlugins: ['foo', 'bar'],
        })
      );
    });

    it('ignores unspecified feature flag overrides', () => {
      const prevState = buildFeatureFlagState({
        isFeatureFlagsLoaded: false,
        flagOverrides: buildFeatureFlag({
          enabledExperimentalPlugins: ['foo'],
          inColab: true,
        }),
      });
      const nextState = reducers(
        prevState,
        actions.partialFeatureFlagsLoaded({
          features: {
            inColab: false,
          },
        })
      );

      expect(nextState.flagOverrides).toEqual(
        buildFeatureFlag({
          enabledExperimentalPlugins: ['foo'],
          inColab: false,
        })
      );
    });
  });

  describe('#featureFlagOverrideChanged', () => {
    it('does not remove existing overrides', () => {
      const prevState = buildFeatureFlagState({
        flagOverrides: {
          inColab: true,
          defaultEnableDarkMode: true,
        },
      });
      const nextState = reducers(
        prevState,
        actions.featureFlagOverrideChanged({
          flags: {forceSvg: true},
        })
      );
      expect(nextState.flagOverrides).toEqual({
        inColab: true,
        defaultEnableDarkMode: true,
        forceSvg: true,
      });
    });

    it('changes values of existing overrides', () => {
      const prevState = buildFeatureFlagState({
        flagOverrides: {
          inColab: true,
          defaultEnableDarkMode: true,
        },
      });
      const nextState = reducers(
        prevState,
        actions.featureFlagOverrideChanged({
          flags: {inColab: false},
        })
      );
      expect(nextState.flagOverrides).toEqual({
        inColab: false,
        defaultEnableDarkMode: true,
      });
    });
  });

  describe('#featureFlagOverridesReset', () => {
    it('does nothing when no overrides are provided', () => {
      const prevState = buildFeatureFlagState();
      const nextState = reducers(
        prevState,
        actions.featureFlagOverridesReset({flags: []})
      );
      // Intentionally using toBe rather than toEqual to ensure the object is the SAME object (not a copy).
      expect(nextState).toBe(prevState);
    });

    it('removes all provided overrides', () => {
      const prevState = buildFeatureFlagState({
        flagOverrides: {
          inColab: true,
          forceSvg: true,
          scalarsBatchSize: 5,
        },
      });
      const nextState = reducers(
        prevState,
        actions.featureFlagOverridesReset({flags: ['forceSvg', 'inColab']})
      );
      expect(nextState.flagOverrides).toEqual({
        scalarsBatchSize: 5,
      });
    });

    it('does not effect default flags', () => {
      const prevState = buildFeatureFlagState({
        flagOverrides: {
          inColab: true,
        },
      });

      prevState.defaultFlags.inColab = true;
      const nextState = reducers(
        prevState,
        actions.featureFlagOverridesReset({flags: ['inColab']})
      );
      expect(nextState.flagOverrides).toEqual({});
      expect(nextState.defaultFlags).toBe(prevState.defaultFlags);
    });
  });

  describe('#allFeatureFlagOverridesReset', () => {
    it('always generates a new state', () => {
      const prevState = buildFeatureFlagState({flagOverrides: {}});
      const nextState = reducers(
        prevState,
        actions.allFeatureFlagOverridesReset()
      );
      expect(nextState.flagOverrides).not.toBe(prevState.flagOverrides);
      expect(nextState.flagOverrides).toEqual({});
    });

    it('removes all overridden feature flags', () => {
      const prevState = buildFeatureFlagState({
        flagOverrides: {
          inColab: true,
          forceSvg: true,
          scalarsBatchSize: 5,
        },
      });
      const nextState = reducers(
        prevState,
        actions.allFeatureFlagOverridesReset()
      );
      expect(nextState.flagOverrides).toEqual({});
    });
  });

  describe('#persistentSettingsLoaded', () => {
    it('sets dark mode overrides when global settings include it', () => {
      const prevState = buildFeatureFlagState({
        isFeatureFlagsLoaded: true,
        flagOverrides: buildFeatureFlag({
          enableDarkModeOverride: false,
        }),
      });

      const state1 = reducers(
        prevState,
        persistentSettingsLoaded({
          partialSettings: {},
        })
      );
      expect(state1.flagOverrides!.enableDarkModeOverride).toBe(false);

      const state2 = reducers(
        prevState,
        persistentSettingsLoaded({
          partialSettings: {themeOverride: ThemeValue.LIGHT},
        })
      );
      expect(state2.flagOverrides!.enableDarkModeOverride).toBe(false);

      const state3 = reducers(
        prevState,
        persistentSettingsLoaded({
          partialSettings: {themeOverride: ThemeValue.DARK},
        })
      );
      expect(state3.flagOverrides!.enableDarkModeOverride).toBe(true);

      const state4 = reducers(
        prevState,
        persistentSettingsLoaded({
          partialSettings: {themeOverride: ThemeValue.BROWSER_DEFAULT},
        })
      );
      expect(state4.flagOverrides!.enableDarkModeOverride).toBeNull();
    });
  });
});
