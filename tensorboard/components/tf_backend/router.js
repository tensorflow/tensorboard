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
var tf_backend;
(function (tf_backend) {
    ;
    /**
     * Create a router for communicating with the TensorBoard backend. You
     * can pass this to `setRouter` to make it the global router.
     *
     * @param dataDir {string=} The base prefix for data endpoints.
     * @param demoMode {boolean=} Whether to modify urls for filesystem demo usage.
     */
    function createRouter(dataDir, demoMode) {
        if (dataDir === void 0) { dataDir = 'data'; }
        if (demoMode === void 0) { demoMode = false; }
        if (dataDir[dataDir.length - 1] === '/') {
            dataDir = dataDir.slice(0, dataDir.length - 1);
        }
        var createDataPath = demoMode ? createDemoDataPath : createProdDataPath;
        var ext = demoMode ? '.json' : '';
        return {
            environment: function () { return createDataPath(dataDir, '/environment', ext); },
            experiments: function () { return createDataPath(dataDir, '/experiments', ext); },
            isDemoMode: function () { return demoMode; },
            pluginRoute: function (pluginName, route, params, demoCustomExt) {
                if (demoCustomExt === void 0) { demoCustomExt = ext; }
                return createDataPath(demoMode ? dataDir : dataDir + '/plugin', "/" + pluginName + route, demoCustomExt, params);
            },
            pluginsListing: function () { return createDataPath(dataDir, '/plugins_listing', ext); },
            runs: function () { return createDataPath(dataDir, '/runs', ext); },
            runsForExperiment: function (id) {
                return createDataPath(dataDir, '/experiment_runs', ext, createSearchParam({ experiment: String(id) }));
            },
        };
    }
    tf_backend.createRouter = createRouter;
    ;
    var _router = createRouter();
    /**
     * @return {Router} the global router
     */
    function getRouter() {
        return _router;
    }
    tf_backend.getRouter = getRouter;
    /**
     * Set the global router, to be returned by future calls to `getRouter`.
     * You may wish to invoke this if you are running a demo server with a
     * custom path prefix, or if you have customized the TensorBoard backend
     * to use a different path.
     *
     * @param {Router} router the new global router
     */
    function setRouter(router) {
        if (router == null) {
            throw new Error('Router required, but got: ' + router);
        }
        _router = router;
    }
    tf_backend.setRouter = setRouter;
    function createProdDataPath(dataDir, route, ext, params) {
        if (params === void 0) { params = new URLSearchParams(); }
        var relativePath = dataDir + route;
        if (String(params)) {
            var delimiter = route.includes('?') ? '&' : '?';
            relativePath += delimiter + String(params);
        }
        return relativePath;
    }
    /**
     * Creates a URL for demo apps.
     *
     * [1]: Demo pages are served as files and data routes are served as JSON files.
     * For shareability and ease of use, the data files are served at root[2], "/",
     * thus, the demo data path should return the absolute path regardless of
     * current pathname.
     *
     * [2]: See the path property of tensorboard/demo/BUILD:demo_data.
     *
     * e.g.,
     * > createDemoDataPath('a', '/b', '.json', {a: 1})
     * < '/a/b_a_1.json'
     */
    function createDemoDataPath(dataDir, route, ext, params) {
        if (params === void 0) { params = new URLSearchParams(); }
        // First, parse the path in a safe manner by constructing a URL. We don't
        // trust the path supplied by consumer.
        var absRoute = route.startsWith('/') ? route : '/' + route;
        var absUrl = new URL(route, window.location.href);
        var normalizedPath = absUrl.pathname, normalizedSearchParams = absUrl.searchParams;
        var queryParam = [normalizedSearchParams, params]
            .map(function (p) { return String(p); })
            .filter(Boolean)
            .join('&');
        var encodedQueryParam = queryParam.replace(/[&=%]/g, '_');
        // Strip leading slashes.
        normalizedPath = normalizedPath.replace(/^\/+/g, '');
        // Convert slashes to underscores.
        normalizedPath = normalizedPath.replace(/\//g, '_');
        // Add query parameter as path if it is present.
        if (encodedQueryParam)
            normalizedPath += "_" + encodedQueryParam;
        var pathname = dataDir + "/" + normalizedPath + ext;
        // See [1] for the reason why we are forming an absolute path here.
        var absPathname = pathname.startsWith('/') ? pathname : '/' + pathname;
        return absPathname;
    }
    function createSearchParam(params) {
        if (params === void 0) { params = {}; }
        var keys = Object.keys(params).sort().filter(function (k) { return params[k]; });
        var searchParams = new URLSearchParams();
        keys.forEach(function (key) {
            var values = params[key];
            var array = Array.isArray(values) ? values : [values];
            array.forEach(function (val) { return searchParams.append(key, val); });
        });
        return searchParams;
    }
    tf_backend.createSearchParam = createSearchParam;
})(tf_backend || (tf_backend = {})); // namespace tf_backend
