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
            enableGpuChart: true,
          }),
          flagOverrides: {
            enableGpuChart: false,
          },
        })
      );

      expect(selectors.getFeatureFlags(state)).toEqual(
        buildFeatureFlag({enableGpuChart: false})
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
            enableGpuChart: true,
          }),
          flagOverrides: {
            enableGpuChart: false,
          },
        })
      );
      const actual = selectors.getOverriddenFeatureFlags(state);

      expect(actual).toEqual({enableGpuChart: false});
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

  describe('#getIsGpuChartEnabled', () => {
    it('returns value in the store', () => {
      const state1 = buildState(
        buildFeatureFlagState({
          defaultFlags: buildFeatureFlag({
            enableGpuChart: false,
          }),
        })
      );
      const actual1 = selectors.getIsGpuChartEnabled(state1);

      expect(actual1).toBe(false);

      const state2 = buildState(
        buildFeatureFlagState({
          defaultFlags: buildFeatureFlag({
            enableGpuChart: true,
          }),
        })
      );
      const actual2 = selectors.getIsGpuChartEnabled(state2);

      expect(actual2).toBe(true);
    });
  });
});
