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
namespace tf_backend {

export interface Router {
  environment: () => string;
  experiments: () => string;
  isDemoMode: () => boolean;
  pluginRoute: (pluginName: string, route: string,
      params?: URLSearchParams, demoCustomExt?: string) => string;
  pluginsListing: () => string;
  runs: () => string;
  runsForExperiment: (id: tf_backend.ExperimentId) => string;
};

/**
 * Create a router for communicating with the TensorBoard backend. You
 * can pass this to `setRouter` to make it the global router.
 *
 * @param dataDir {string=} The base prefix for data endpoints.
 * @param demoMode {boolean=} Whether to modify urls for filesystem demo usage.
 */
export function createRouter(dataDir = 'data', demoMode = false): Router {
  if (dataDir[dataDir.length - 1] === '/') {
    dataDir = dataDir.slice(0, dataDir.length - 1);
  }
  const createPath = demoMode ? createDemoPath : createProdPath;
  const ext = demoMode ? '.json' : '';
  return {
    environment: () => createPath(dataDir, '/environment', ext),
    experiments: () => createPath(dataDir, '/experiments', ext),
    isDemoMode: () => demoMode,
    pluginRoute: (pluginName: string, route: string,
        params?: URLSearchParams, demoCustomExt = ext): string => {

      return createPath(
          demoMode ? dataDir : dataDir + '/plugin',
          `/${pluginName}${route}`,
          demoCustomExt,
          params);
    },
    pluginsListing: () => createPath(dataDir, '/plugins_listing', ext),
    runs: () => createPath(dataDir, '/runs', ext),
    runsForExperiment: id => {
      return createPath(
          dataDir,
          '/experiment_runs',
          ext,
          createSearchParam({experiment: String(id)}));
    },
  };
};

let _router: Router = createRouter();

/**
 * @return {Router} the global router
 */
export function getRouter(): Router {
  return _router;
}

/**
 * Set the global router, to be returned by future calls to `getRouter`.
 * You may wish to invoke this if you are running a demo server with a
 * custom path prefix, or if you have customized the TensorBoard backend
 * to use a different path.
 *
 * @param {Router} router the new global router
 */
export function setRouter(router: Router): void {
  if (router == null) {
    throw new Error('Router required, but got: ' + router);
  }
  _router = router;
}

function createProdPath(dataDir: string, route: string,
    ext: string, params?: URLSearchParams): string {
  let relativePath = dataDir + route;
  if (params) {
    const delimiter = route.includes('?') ? '&' : '?';
    relativePath += delimiter + params.toString();
  }
  return relativePath;
}

/**
 * Creates a URL for demo.
 * e.g.,
 * > createDemoPath('a', '/b', '.json', {a: 1})
 * < '/a/b_a_1.json'
 */
function createDemoPath(dataDir: string, route: string,
    ext: string, params: URLSearchParams = new URLSearchParams()): string {

  // First, parse the path in a safe manner by constructing a URL. We don't
  // trust the path supplied by consumer.
  const absRoute = route.startsWith('/') ? route : '/' + route;
  const absUrl = new URL(route, window.location.href);
  let {pathname: normalizedPath, searchParams: normalizedSearchParams} = absUrl;
  const queryParam = [normalizedSearchParams, params]
        .map(p => String(p))
        .filter(Boolean)
        .join('&');
  const encodedQueryParam = queryParam.replace(/[&=%]/g, '_');

  // Strip leading slashes.
  normalizedPath = normalizedPath.replace(/^\/+/g, '');
  // Convert slashes to underscores.
  normalizedPath = normalizedPath.replace(/\//g, '_');
  // Add query parameter as path if it is present.
  if (encodedQueryParam) normalizedPath += `_${encodedQueryParam}`;
  const url = new URL(window.location.href);

  // All demo data are serialized in JSON format.
  url.pathname = `${dataDir}/${normalizedPath}${ext}`;
  return url.pathname + url.search;
}

export function createSearchParam(params: QueryParams = {}): URLSearchParams {
  const keys = Object.keys(params).sort().filter(k => params[k]);
  const searchParams = new URLSearchParams();
  keys.forEach(key => {
    const values = params[key];
    const array = Array.isArray(values) ? values : [values];
    array.forEach(val => searchParams.append(key, val));
  });
  return searchParams;
}

}  // namespace tf_backend
