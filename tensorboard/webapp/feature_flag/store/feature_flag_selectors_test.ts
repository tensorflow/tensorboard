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
import * as selectors from './feature_flag_selectors';
import {buildFeatureFlagState, buildState} from './testing';

describe('feature_flag_selectors', () => {
  describe('getFeature', () => {
    it('returns a current feature', () => {
      const state = buildState(
        buildFeatureFlagState({
          enableMagicFeature: true,
        })
      );
      const actual = selectors.getFeature(state, 'enableMagicFeature');

      expect(actual).toBe(true);
    });

    it('returns null if the value is not present', () => {
      const state = buildState(
        buildFeatureFlagState({
          enabledExperimentalPlugins: ['foo'],
        })
      );
      const actual = selectors.getFeature(state, 'bar');

      expect(actual).toBeNull();
    });
  });

  describe('getEnabledExperimentalPlugins', () => {
    it('returns value in array', () => {
      const state = buildState(
        buildFeatureFlagState({
          enabledExperimentalPlugins: ['bar'],
        })
      );
      const actual = selectors.getFeature(state, 'enabledExperimentalPlugins');

      expect(actual).toEqual(['bar']);
    });
  });
});
