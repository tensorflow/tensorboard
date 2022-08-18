/* Copyright 2022 The TensorFlow Authors. All Rights Reserved.

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

import {buildFeatureFlag} from '../../webapp/feature_flag/testing';
import * as feature_flags from './feature-flags';

describe('feature-flags', () => {
  beforeEach(() => {
    feature_flags.initializeFeatureFlags();
  });

  it('sets and gets FeatureFlags and getFeatureFlagsToSendToServer', () => {
    feature_flags.setFeatureFlags(buildFeatureFlag({inColab: true}), {
      scalarsBatchSize: 10,
    });
    expect(feature_flags.getFeatureFlags()).toEqual(
      buildFeatureFlag({inColab: true})
    );
    expect(feature_flags.getFeatureFlagsToSendToServer()).toEqual({
      scalarsBatchSize: 10,
    });
  });

  it('throws Error if getFeatureFlags is called before setFeatureFlags', () => {
    expect(() => feature_flags.getFeatureFlags()).toThrow(
      new Error('FeatureFlags have not yet been determined by TensorBoard.')
    );
  });

  it('throws Error if getFeatureFlagsToSendToServer is called before setFeatureFlags', () => {
    expect(() => feature_flags.getFeatureFlagsToSendToServer()).toThrow(
      new Error('FeatureFlags have not yet been determined by TensorBoard.')
    );
  });
});
