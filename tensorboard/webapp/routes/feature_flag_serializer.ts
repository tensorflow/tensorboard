import {SerializableQueryParams} from '../app_routing/types';
import {FeatureFlagMetadata} from '../feature_flag/store/feature_flag_metadata';
import {FeatureFlags} from '../feature_flag/types';

export function featureFlagsToSerializableQueryParams<T>(
  overriddenFeatureFlags: Partial<FeatureFlags>,
  featureFlagMetadataMap: Record<string, FeatureFlagMetadata<T>>
): SerializableQueryParams {
  return Object.entries(overriddenFeatureFlags)
    .map(([featureFlag, featureValue]) => {
      const key =
        featureFlagMetadataMap[featureFlag as keyof FeatureFlags]
          ?.queryParamOverride;
      if (!key || !featureValue) {
        return [];
      }
      /**
       * Features with array values should be serialized as multiple query params, e.g.
       * enabledExperimentalPlugins: {
       *    queryParamOverride: 'experimentalPlugin',
       *    values: ['foo', 'bar'],
       *  }
       *    Should be serialized to:
       * ?experimentalPlugin=foo&experimentalPlugin=bar
       *
       * Because values can be arrays it is easiest to convert non array values to an
       * array, then flatten the result.
       */
      const values = Array.isArray(featureValue)
        ? featureValue
        : [featureValue];
      return values.map((value) => ({
        key,
        value: value?.toString(),
      }));
    })
    .flat()
    .filter(
      ({key, value}) => key && value !== undefined
    ) as SerializableQueryParams;
}
