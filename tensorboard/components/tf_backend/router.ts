/* Copyright 2015 The TensorFlow Authors. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the 'License');
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an 'AS IS' BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/
import {FEATURE_FLAGS_QUERY_STRING_NAME} from '../../webapp/feature_flag/http/const';
import {getFeatureFlagsToSendToServer} from '../tf_feature_flags/feature-flags';
import {QueryParams} from './urlPathHelpers';

const EXPERIMENTAL_PLUGINS_QUERY_PARAM = 'experimentalPlugin';

export interface Router {
  environment: () => string;
  experiments: () => string;
  pluginRoute: (
    pluginName: string,
    route: string,
    params?: URLSearchParams
  ) => string;
  pluginRouteForSrc: (
    pluginName: string,
    route: string,
    params?: URLSearchParams
  ) => string;
  pluginsListing: () => string;
  runs: () => string;
}

/**
 * Save the initial URL query params, before the AppRoutingEffects initialize,
 * and before creating the router.
 */
const initialURLSearchParams = new URLSearchParams(window.location.search);
let _router: Router = createRouter();

/**
 * Create a router for communicating with the TensorBoard backend. You
 * can pass this to `setRouter` to make it the global router.
 */
export function createRouter(): Router {
  return {
    environment: () => createDataPath('/environment'),
    experiments: () => createDataPath('/experiments'),
    pluginRoute: (
      pluginName: string,
      route: string,
      params?: URLSearchParams
    ): string => {
      return createDataPath(`/plugin/${pluginName}${route}`, params);
    },
    pluginRouteForSrc: (
      pluginName: string,
      route: string,
      params: URLSearchParams = new URLSearchParams()
    ): string => {
      const featureFlags = getFeatureFlagsToSendToServer();
      if (Object.keys(featureFlags).length > 0) {
        params.append(
          FEATURE_FLAGS_QUERY_STRING_NAME,
          JSON.stringify(featureFlags)
        );
      }
      return createDataPath(`/plugin/${pluginName}${route}`, params);
    },
    pluginsListing: () =>
      createDataPath(
        '/plugins_listing',
        createSearchParam({
          [EXPERIMENTAL_PLUGINS_QUERY_PARAM]: initialURLSearchParams.getAll(
            EXPERIMENTAL_PLUGINS_QUERY_PARAM
          ),
        })
      ),
    runs: () => createDataPath('/runs'),
  };
}

/**
 * @return {Router} the global router
 */
export function getRouter(): Router {
  return _router;
}

function createDataPath(
  route: string,
  params: URLSearchParams = new URLSearchParams()
): string {
  let relativePath = 'data' + route;
  if (String(params)) {
    const delimiter = route.includes('?') ? '&' : '?';
    relativePath += delimiter + String(params);
  }
  return relativePath;
}

export function createSearchParam(params: QueryParams = {}): URLSearchParams {
  const keys = Object.keys(params)
    .sort()
    .filter((k) => params[k]);
  const searchParams = new URLSearchParams();
  keys.forEach((key) => {
    const values = params[key];
    const array = Array.isArray(values) ? values : [values];
    array.forEach((val) => searchParams.append(key, val));
  });
  return searchParams;
}
