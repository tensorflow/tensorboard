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
import * as actions from '../actions/feature_flag_actions';
import {buildFeatureFlag} from '../testing';
import {reducers} from './feature_flag_reducers';
import {buildFeatureFlagState} from './testing';

describe('feature_flag_reducers', () => {
  describe('featuresLoaded', () => {
    it('sets the new feature flags onto the state', () => {
      const prevState = buildFeatureFlagState({
        isFeatureFlagsLoaded: false,
        features: buildFeatureFlag({
          enabledExperimentalPlugins: ['foo'],
        }),
      });
      const nextState = reducers(
        prevState,
        actions.featuresLoaded({
          features: buildFeatureFlag({
            enabledExperimentalPlugins: ['foo', 'bar'],
          }),
        })
      );

      expect(nextState.features.enabledExperimentalPlugins).toEqual([
        'foo',
        'bar',
      ]);
    });
  });
});
