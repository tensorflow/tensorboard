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
