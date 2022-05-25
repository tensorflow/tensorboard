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
import {buildFeatureFlag} from '../testing';
import * as selectors from './feature_flag_selectors';
import {buildFeatureFlagState, buildState} from './testing';

describe('feature_flag_selectors', () => {
  describe('#getFeatureFlags', () => {
    it('combines default and overrides to make override transparent to users', () => {
      const state = buildState(
        buildFeatureFlagState({
          defaultFlags: buildFeatureFlag({
            enabledExperimentalPlugins: [],
          }),
          flagOverrides: {
            enabledExperimentalPlugins: ['foo'],
          },
        })
      );

      expect(selectors.getFeatureFlags(state)).toEqual(
        buildFeatureFlag({enabledExperimentalPlugins: ['foo']})
      );
    });

    it('does not combine array flags', () => {
      const state = buildState(
        buildFeatureFlagState({
          defaultFlags: buildFeatureFlag({
            enabledExperimentalPlugins: ['bar'],
          }),
          flagOverrides: {
            enabledExperimentalPlugins: ['foo'],
          },
        })
      );

      expect(selectors.getFeatureFlags(state)).toEqual(
        buildFeatureFlag({
          enabledExperimentalPlugins: ['foo'],
        })
      );
    });
  });

  describe('#getOverriddenFeatureFlags', () => {
    it('returns empty object if it is not overridden', () => {
      const state = buildState(buildFeatureFlagState());
      const actual = selectors.getOverriddenFeatureFlags(state);

      expect(actual).toEqual({});
    });

    it('returns only overridden parts', () => {
      const state = buildState(
        buildFeatureFlagState({
          defaultFlags: buildFeatureFlag({
            enabledExperimentalPlugins: [],
          }),
          flagOverrides: {
            enabledExperimentalPlugins: ['foo'],
          },
        })
      );
      const actual = selectors.getOverriddenFeatureFlags(state);

      expect(actual).toEqual({enabledExperimentalPlugins: ['foo']});
    });
  });

  describe('#getDarkModeEnabled', () => {
    it('returns the proper value', () => {
      let state = buildState(
        buildFeatureFlagState({
          defaultFlags: buildFeatureFlag({
            defaultEnableDarkMode: true,
          }),
        })
      );
      expect(selectors.getDarkModeEnabled(state)).toEqual(true);

      state = buildState(
        buildFeatureFlagState({
          defaultFlags: buildFeatureFlag({
            defaultEnableDarkMode: false,
          }),
          flagOverrides: {
            defaultEnableDarkMode: true,
          },
        })
      );
      expect(selectors.getDarkModeEnabled(state)).toEqual(true);

      state = buildState(
        buildFeatureFlagState({
          defaultFlags: buildFeatureFlag({
            defaultEnableDarkMode: false,
          }),
          flagOverrides: {
            defaultEnableDarkMode: false,
          },
        })
      );
      expect(selectors.getDarkModeEnabled(state)).toEqual(false);
    });
  });

  describe('#getIsAutoDarkModeAllowed', () => {
    it('returns the proper value', () => {
      let state = buildState(
        buildFeatureFlagState({
          defaultFlags: buildFeatureFlag({
            isAutoDarkModeAllowed: true,
          }),
        })
      );
      expect(selectors.getIsAutoDarkModeAllowed(state)).toEqual(true);

      state = buildState(
        buildFeatureFlagState({
          defaultFlags: buildFeatureFlag({
            isAutoDarkModeAllowed: false,
          }),
          flagOverrides: {
            isAutoDarkModeAllowed: true,
          },
        })
      );
      expect(selectors.getIsAutoDarkModeAllowed(state)).toEqual(true);

      state = buildState(
        buildFeatureFlagState({
          defaultFlags: buildFeatureFlag({
            isAutoDarkModeAllowed: false,
          }),
          flagOverrides: {
            isAutoDarkModeAllowed: false,
          },
        })
      );
      expect(selectors.getIsAutoDarkModeAllowed(state)).toEqual(false);
    });
  });

  describe('#getEnabledExperimentalPlugins', () => {
    it('returns value in array', () => {
      const state = buildState(
        buildFeatureFlagState({
          defaultFlags: buildFeatureFlag({
            enabledExperimentalPlugins: ['bar'],
          }),
        })
      );
      const actual = selectors.getEnabledExperimentalPlugins(state);

      expect(actual).toEqual(['bar']);
    });
  });

  describe('#getIsInColab', () => {
    it('returns the proper value', () => {
      let state = buildState(
        buildFeatureFlagState({
          defaultFlags: buildFeatureFlag({
            inColab: true,
          }),
        })
      );
      expect(selectors.getIsInColab(state)).toEqual(true);

      state = buildState(
        buildFeatureFlagState({
          defaultFlags: buildFeatureFlag({
            inColab: false,
          }),
        })
      );
      expect(selectors.getIsInColab(state)).toEqual(false);
    });
  });

  describe('#getEnabledColorGroup', () => {
    it('returns the proper value', () => {
      let state = buildState(
        buildFeatureFlagState({
          defaultFlags: buildFeatureFlag({
            enabledColorGroup: false,
          }),
        })
      );
      expect(selectors.getEnabledColorGroup(state)).toEqual(false);

      state = buildState(
        buildFeatureFlagState({
          defaultFlags: buildFeatureFlag({
            enabledColorGroup: false,
          }),
          flagOverrides: {
            enabledColorGroup: true,
          },
        })
      );
      expect(selectors.getEnabledColorGroup(state)).toEqual(true);
    });
  });

  describe('#getEnabledColorGroupByRegex', () => {
    it('returns the proper value', () => {
      let state = buildState(
        buildFeatureFlagState({
          defaultFlags: buildFeatureFlag({
            enabledColorGroupByRegex: false,
          }),
        })
      );
      expect(selectors.getEnabledColorGroupByRegex(state)).toEqual(false);

      state = buildState(
        buildFeatureFlagState({
          defaultFlags: buildFeatureFlag({
            enabledColorGroupByRegex: false,
          }),
          flagOverrides: {
            enabledColorGroupByRegex: true,
          },
        })
      );
      expect(selectors.getEnabledColorGroupByRegex(state)).toEqual(true);
    });
  });

  describe('#getIsMetricsImageSupportEnabled', () => {
    it('returns the proper value', () => {
      let state = buildState(
        buildFeatureFlagState({
          defaultFlags: buildFeatureFlag({
            metricsImageSupportEnabled: false,
          }),
        })
      );
      expect(selectors.getIsMetricsImageSupportEnabled(state)).toEqual(false);

      state = buildState(
        buildFeatureFlagState({
          defaultFlags: buildFeatureFlag({
            metricsImageSupportEnabled: false,
          }),
          flagOverrides: {
            metricsImageSupportEnabled: true,
          },
        })
      );
      expect(selectors.getIsMetricsImageSupportEnabled(state)).toEqual(true);
    });
  });

  describe('#getIsLinkedTimeEnabled', () => {
    it('returns the proper value', () => {
      let state = buildState(
        buildFeatureFlagState({
          defaultFlags: buildFeatureFlag({
            enabledLinkedTime: false,
          }),
        })
      );
      expect(selectors.getIsLinkedTimeEnabled(state)).toEqual(false);

      state = buildState(
        buildFeatureFlagState({
          defaultFlags: buildFeatureFlag({
            enabledLinkedTime: false,
          }),
          flagOverrides: {
            enabledLinkedTime: true,
          },
        })
      );
      expect(selectors.getIsLinkedTimeEnabled(state)).toEqual(true);
    });
  });

  describe('#getIsTimeSeriesPromotionEnabled', () => {
    it('returns the proper value', () => {
      let state = buildState(
        buildFeatureFlagState({
          defaultFlags: buildFeatureFlag({
            enableTimeSeriesPromotion: false,
          }),
        })
      );
      expect(selectors.getIsTimeSeriesPromotionEnabled(state)).toEqual(false);

      state = buildState(
        buildFeatureFlagState({
          defaultFlags: buildFeatureFlag({
            enableTimeSeriesPromotion: false,
          }),
          flagOverrides: {
            enableTimeSeriesPromotion: true,
          },
        })
      );
      expect(selectors.getIsTimeSeriesPromotionEnabled(state)).toEqual(true);
    });
  });

  describe('#getEnabledCardWidthSetting', () => {
    it('returns the proper value', () => {
      let state = buildState(
        buildFeatureFlagState({
          defaultFlags: buildFeatureFlag({
            enabledCardWidthSetting: false,
          }),
        })
      );
      expect(selectors.getEnabledCardWidthSetting(state)).toEqual(false);

      state = buildState(
        buildFeatureFlagState({
          defaultFlags: buildFeatureFlag({
            enabledCardWidthSetting: false,
          }),
          flagOverrides: {
            enabledCardWidthSetting: true,
          },
        })
      );
      expect(selectors.getEnabledCardWidthSetting(state)).toEqual(true);
    });
  });

  describe('#getIsDataTableEnabled', () => {
    it('returns the proper value', () => {
      let state = buildState(
        buildFeatureFlagState({
          defaultFlags: buildFeatureFlag({
            enabledDataTable: false,
          }),
        })
      );
      expect(selectors.getIsDataTableEnabled(state)).toEqual(false);

      state = buildState(
        buildFeatureFlagState({
          defaultFlags: buildFeatureFlag({
            enabledDataTable: false,
          }),
          flagOverrides: {
            enabledDataTable: true,
          },
        })
      );
      expect(selectors.getIsDataTableEnabled(state)).toEqual(true);
    });
  });
});
