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
import {
  FeatureFlagMetadata,
  FeatureFlagMetadataMapType,
} from '../feature_flag/store/feature_flag_metadata';
import {
  featureFlagsToSerializableQueryParams,
  getFeatureFlagValueFromSearchParams,
  getOverriddenFeatureFlagValuesFromSearchParams,
} from './feature_flag_serializer';

describe('feature flag serializer', () => {
  let featureFlagsMetadata: Record<string, FeatureFlagMetadata<any>> = {};
  beforeEach(() => {
    featureFlagsMetadata = {
      featureA: {
        defaultValue: 'feature_a_123',
        queryParamOverride: 'feature_a',
        parseValue: (s: string) => s,
      },
      featureB: {
        defaultValue: 'feature_b_456',
        queryParamOverride: 'feature_b',
        isArray: true,
        parseValue: (s: string) => s,
      },
    };
  });

  describe('featureFlagsToSerializableQueryParams', () => {
    it('should return empty list when no flags are overridden', () => {
      const serializableQueryParams = featureFlagsToSerializableQueryParams(
        {},
        featureFlagsMetadata
      );
      expect(serializableQueryParams).toEqual([]);
    });

    it('should not serialize feature flags with missing metadata', () => {
      let serializableQueryParams = featureFlagsToSerializableQueryParams(
        {featureC: 'c'} as any,
        featureFlagsMetadata
      );
      expect(serializableQueryParams).toEqual([]);
      serializableQueryParams = featureFlagsToSerializableQueryParams(
        {featureC: 'c', featureA: 'a'} as any,
        featureFlagsMetadata
      );
      expect(serializableQueryParams).toEqual([
        {
          key: 'feature_a',
          value: 'a',
        },
      ]);
    });

    it('should serialize feature flags with falsy values', () => {
      const serializableQueryParams = featureFlagsToSerializableQueryParams(
        {featureB: false, featureA: ''} as any,
        featureFlagsMetadata
      );
      expect(serializableQueryParams).toEqual([
        {
          key: 'feature_b',
          value: 'false',
        },
        {
          key: 'feature_a',
          value: '',
        },
      ]);
    });

    it('should return multiple entries for features with array values', () => {
      const serializableQueryParams = featureFlagsToSerializableQueryParams(
        {featureA: 'a', featureB: ['foo', 'bar']} as any,
        featureFlagsMetadata
      );
      expect(serializableQueryParams).toEqual([
        {
          key: 'feature_a',
          value: 'a',
        },
        {
          key: 'feature_b',
          value: 'foo',
        },
        {
          key: 'feature_b',
          value: 'bar',
        },
      ]);
    });
  });

  describe('getFeatureFlagValueFromSearchParams', () => {
    it('returns null when provided feature flag not present in search params', () => {
      const value = getFeatureFlagValueFromSearchParams(
        featureFlagsMetadata.featureA,
        new URLSearchParams('')
      );
      expect(value).toBeNull();
    });

    it('returns null when feature flag does not have a query param override', () => {
      const value = getFeatureFlagValueFromSearchParams(
        {
          defaultValue: 'some value',
          parseValue: (s: string) => s,
        } as FeatureFlagMetadata<string>,
        new URLSearchParams('')
      );
      expect(value).toBeNull();
    });

    it('returns first value when feature flag is not an array', () => {
      const value = getFeatureFlagValueFromSearchParams(
        featureFlagsMetadata.featureA,
        new URLSearchParams('?feature_a=foo&feature_a=bar')
      );
      expect(value).toEqual('foo');
    });

    it('returns array of values when feature flag is an array', () => {
      const value = getFeatureFlagValueFromSearchParams(
        featureFlagsMetadata.featureB,
        new URLSearchParams('?feature_b=foo&feature_b=bar')
      );
      expect(value).toEqual(['foo', 'bar']);
    });
  });

  describe('getOverriddenFeatureFlagValuesFromSearchParams', () => {
    it('returns empty object when metadata is empty', () => {
      const featureFlags = getOverriddenFeatureFlagValuesFromSearchParams(
        {} as FeatureFlagMetadataMapType<any>,
        new URLSearchParams('?feature_a=foo')
      );
      expect(featureFlags).toEqual({});
    });

    it('returns empty object when url search params are empty', () => {
      const featureFlags = getOverriddenFeatureFlagValuesFromSearchParams(
        featureFlagsMetadata as FeatureFlagMetadataMapType<any>,
        new URLSearchParams('')
      );
      expect(featureFlags).toEqual({});
    });

    it('parses flag values correctly', () => {
      const featureFlags = getOverriddenFeatureFlagValuesFromSearchParams(
        featureFlagsMetadata as FeatureFlagMetadataMapType<any>,
        new URLSearchParams('?feature_a=foo&feature_b=bar')
      );
      expect(featureFlags).toEqual({
        featureA: 'foo',
        featureB: ['bar'],
      } as any);
    });
  });
});
