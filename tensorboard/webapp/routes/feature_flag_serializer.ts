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
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';

import {Location} from '../app_routing/location';
import {SerializableQueryParams} from '../app_routing/types';
import {State} from '../app_state';
import {FeatureFlagMetadata} from '../feature_flag/store/feature_flag_metadata';
import * as selectors from '../selectors';
import {EXPERIMENTAL_PLUGIN_QUERY_PARAM_KEY} from '../webapp_data_source/tb_feature_flag_data_source_types';

export function getFeatureFlagStates<T>(store: Store<State>, featureFlagQueryParameters: Record<string, FeatureFlagMetadata<T>>):
    Observable<SerializableQueryParams> {
  return store.select(selectors.getEnabledExperimentalPlugins)
      .pipe(map((experimentalPlugins) => {
        const queryParams = experimentalPlugins.map((pluginId) => {
          return {key: EXPERIMENTAL_PLUGIN_QUERY_PARAM_KEY, value: pluginId};
        });

        const currentQueryParams = Object.fromEntries(
            serializableQueryParamsToEntries(new Location().getSearch() || []));

        Object.values(featureFlagQueryParameters)
            .forEach((overriddenFeatureFlag: FeatureFlagMetadata) => {
              const queryParamOverride =
                  overriddenFeatureFlag.queryParamOverride;
              if (queryParamOverride &&
                  queryParamOverride in currentQueryParams) {
                queryParams.push({
                  key: queryParamOverride,
                  value: currentQueryParams[queryParamOverride],
                });
              }
            });

        return queryParams;

        function serializableQueryParamsToEntries(
            params: SerializableQueryParams): [string, string][] {
          return params.map(({key, value}) => [key, value]);
        }
      }));
}
