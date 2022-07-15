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
import {TestBed} from '@angular/core/testing';
import {Location, TEST_ONLY} from '../app_routing/location';
import {
  FeatureFlagMetadata,
  FeatureFlagMetadataMap,
  FeatureFlagType,
} from '../feature_flag/store/feature_flag_metadata';
import {getOverriddenFeatureFlagStates} from './feature_flag_serializer';

describe('feature flag serializer', () => {
  let location: Location;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [Location],
    }).compileComponents();

    location = TestBed.inject(Location);
  });

  describe('getOverriddenFeatureFlagStates', () => {
    it('returns empty list when no feature flags are active', () => {
      const queryParams = getOverriddenFeatureFlagStates(
        FeatureFlagMetadataMap as Record<
          string,
          FeatureFlagMetadata<FeatureFlagType>
        >
      );
      expect(queryParams.length).toEqual(0);
    });

    it('persists values of enabled experimental plugins', () => {
      spyOn(TEST_ONLY.utils, 'getSearch').and.returnValue(
        '?experimentalPlugin=0&experimentalPlugin=1&experimentalPlugin=2'
      );
      const queryParams = getOverriddenFeatureFlagStates(
        FeatureFlagMetadataMap as Record<
          string,
          FeatureFlagMetadata<FeatureFlagType>
        >
      );
      expect(queryParams.length).toEqual(3);
      expect(queryParams[0].key).toEqual('experimentalPlugin');
      expect(queryParams[0].value).toEqual('0');
    });

    it('persists flag states overridden by query params', async () => {
      spyOn(TEST_ONLY.utils, 'getSearch').and.returnValue(
        '?darkMode=true'
      );
      console.log(location.getSearch());
      const queryParams = getOverriddenFeatureFlagStates(
        FeatureFlagMetadataMap as Record<
          string,
          FeatureFlagMetadata<FeatureFlagType>
        >
      );
      expect(queryParams.length).toEqual(1);
      expect(queryParams[0].key).toEqual('darkMode');
      expect(queryParams[0].value).toEqual('true');
    });
  });
});
