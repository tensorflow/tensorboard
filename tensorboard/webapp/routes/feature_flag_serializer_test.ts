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
import {Location} from '../app_routing/location';
import {
  FeatureFlagMetadata,
  FeatureFlagMetadataMap,
  FeatureFlagType,
} from '../feature_flag/store/feature_flag_metadata';
import {getOverriddenFeatureFlagStates} from './feature_flag_serializer';

describe('feature flag serializer', () => {
  let location: Location;
  let getSearchSpy: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [],
    }).compileComponents();

    location = TestBed.inject(Location);
    getSearchSpy = spyOn(location, 'getSearch').and.returnValue([]);
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

    it('persists values of enabled experimental plugins', () => {});

    it('persists flag states overridden by query params', async () => {
      getSearchSpy = spyOn(location, 'getSearch').and.returnValue([
        {
          key: 'defaultEnableDarkMode',
          value: 'true',
        },
      ]);
      const queryParams = getOverriddenFeatureFlagStates(
        FeatureFlagMetadataMap as Record<
          string,
          FeatureFlagMetadata<FeatureFlagType>
        >
      );
      expect(queryParams.length).toEqual(1);
      expect(queryParams[0].key).toEqual('defaultEnableDarkMode');
      expect(queryParams[0].value).toEqual('true');
    });
  });
});
