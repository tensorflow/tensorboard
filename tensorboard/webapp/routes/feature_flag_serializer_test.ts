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
import {featureFlagsToSerializableQueryParams} from './feature_flag_serializer';

describe('feature flag serializer', () => {
  describe('featureFlagsToSerializableQueryParams', () => {
    let featureFlagsMetadata = {};
    beforeEach(() => {
      featureFlagsMetadata = {
        featureA: {
          displayName: 'featureA',
          queryParamOverride: 'feature_a',
          parseValue: (s: string) => s,
        },
        featureB: {
          displayName: 'featureB',
          queryParamOverride: 'feature_b',
          isArray: true,
          parseValue: (s: string) => s,
        },
      };
    });

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
});
