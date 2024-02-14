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
import {FeatureFlagMetadataMap} from './feature_flag_metadata';
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

  describe('#getDefaultFeatureFlags', () => {
    it('returns exact copy of the default feature flags', () => {
      const initialState = buildFeatureFlagState();
      const state = buildState(initialState);
      const actual = selectors.getDefaultFeatureFlags(state);

      expect(actual).toEqual(initialState.defaultFlags);
    });

    it('is uneffected by feature flag overrides', () => {
      const initialState = buildFeatureFlagState({
        flagOverrides: {
          forceSvg: true,
          inColab: true,
        },
      });
      const state = buildState(initialState);
      const actual = selectors.getDefaultFeatureFlags(state);

      expect(actual).toEqual(initialState.defaultFlags);
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

  describe('#getFeatureFlagsMetadata', () => {
    it('returns metadata', () => {
      // Modify the default value for one of the properties. inColab is a good
      // one because the defaultValue is unlikely to ever change.
      const metadata = {
        ...FeatureFlagMetadataMap,
        inColab: {...FeatureFlagMetadataMap.inColab, defaultValue: true},
      };
      const state = buildState(buildFeatureFlagState({metadata}));
      const actual = selectors.getFeatureFlagsMetadata(state);

      expect(actual).toEqual(metadata);
    });
  });

  describe('#getFeatureFlagsToSendToServer', () => {
    it('returns overridden flags to send to server', () => {
      // Give explicit defaultValues and modify sendToServer value for some of
      // the properties.
      const metadata = {
        ...FeatureFlagMetadataMap,
        inColab: {
          ...FeatureFlagMetadataMap.inColab,
          defaultValue: true,
          sendToServerWhenOverridden: true,
        },
        scalarsBatchSize: {
          ...FeatureFlagMetadataMap.scalarsBatchSize,
          defaultValue: 5,
          sendToServerWhenOverridden: true,
        },
      };
      const state = buildState(
        buildFeatureFlagState({
          metadata,
          flagOverrides: {inColab: false, scalarsBatchSize: 10},
        })
      );
      const actual = selectors.getFeatureFlagsToSendToServer(state);

      expect(actual).toEqual({inColab: false, scalarsBatchSize: 10});
    });

    it('returns flags even if overridden is same as default value', () => {
      // Give explicit defaultValues and modify sendToServer value for some of
      // the properties.
      const metadata = {
        ...FeatureFlagMetadataMap,
        inColab: {
          ...FeatureFlagMetadataMap.inColab,
          defaultValue: true,
          sendToServerWhenOverridden: true,
        },
      };
      const state = buildState(
        buildFeatureFlagState({metadata, flagOverrides: {inColab: true}})
      );
      const actual = selectors.getFeatureFlagsToSendToServer(state);
      expect(actual).toEqual({inColab: true});
    });

    it('ignores overridden flags that should not be sent to server', () => {
      // Give explicit defaultValues and modify sendToServer value for some of
      // the properties.
      const metadata = {
        ...FeatureFlagMetadataMap,
        inColab: {
          ...FeatureFlagMetadataMap.inColab,
          defaultValue: true,
          sendToServerWhenOverridden: true,
        },
        scalarsBatchSize: {
          ...FeatureFlagMetadataMap.scalarsBatchSize,
          defaultValue: 5,
          sendToServerWhenOverridden: false,
        },
        // Omit sendToServer property to show that unset is equivalent to false.
        forceSvg: {...FeatureFlagMetadataMap.forceSvg, defaultValue: true},
      };
      const state = buildState(
        buildFeatureFlagState({
          metadata,
          flagOverrides: {
            inColab: false,
            scalarsBatchSize: 10,
            forceSvg: false,
          },
        })
      );
      // scalarsBatchSize and forceSvg are not included in the result.
      const actual = selectors.getFeatureFlagsToSendToServer(state);
      expect(actual).toEqual({inColab: false});
    });

    it('ignores sendToServer flags that have not been overridden', () => {
      // Give explicit defaultValues and modify sendToServer value for some of
      // the properties.
      const metadata = {
        ...FeatureFlagMetadataMap,
        inColab: {
          ...FeatureFlagMetadataMap.inColab,
          defaultValue: true,
          sendToServerWhenOverridden: true,
        },
        scalarsBatchSize: {
          ...FeatureFlagMetadataMap.scalarsBatchSize,
          defaultValue: 5,
          sendToServerWhenOverridden: true,
        },
      };
      const state = buildState(
        buildFeatureFlagState({
          metadata,
          // Note: inColab does not have an overridden value.
          flagOverrides: {
            scalarsBatchSize: 10,
          },
        })
      );

      const actual = selectors.getFeatureFlagsToSendToServer(state);
      // inColab is not included in the result.
      expect(actual).toEqual({scalarsBatchSize: 10});
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
});
