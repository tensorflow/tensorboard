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
     * @param dataDir {string} The base prefix for finding data on server.
     * @param demoMode {boolean} Whether to modify urls for filesystem demo usage.
     */
    function createRouter(dataDir, demoMode) {
        if (dataDir === void 0) { dataDir = 'data'; }
        if (demoMode === void 0) { demoMode = false; }
        if (dataDir[dataDir.length - 1] === '/') {
            dataDir = dataDir.slice(0, dataDir.length - 1);
        }
        var createPath = demoMode ? createDemoPath : createProdPath;
        var ext = demoMode ? '.json' : '';
        return {
            environment: function () { return createPath(dataDir, '/environment', ext); },
            experiments: function () { return createPath(dataDir, '/experiments', ext); },
            isDemoMode: function () { return demoMode; },
            pluginRoute: function (pluginName, route, params, demoCustomExt) {
                if (demoCustomExt === void 0) { demoCustomExt = ext; }
                return createPath(demoMode ? dataDir : dataDir + '/plugin', "/" + pluginName + route, demoCustomExt, params);
            },
            pluginsListing: function () { return createPath(dataDir, '/plugins_listing', ext); },
            runs: function () { return createPath(dataDir, '/runs', ext); },
            runsForExperiment: function (id) {
                return createPath(dataDir, '/experiment_runs', ext, createSearchParam({ experiment: String(id) }));
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
    function createProdPath(pathPrefix, path, ext, params) {
        var url = new URL(window.location.origin + "/" + pathPrefix + path);
        if (params)
            url.search = params.toString();
        return url.pathname + url.search;
    }
    /**
     * Creates a URL for demo.
     * e.g.,
     * > createDemoPath('a', '/b', '.json', {a: 1})
     * < '/a/b_a_1.json'
     */
    function createDemoPath(pathPrefix, path, ext, params) {
        // First, parse the path in a safe manner by constructing a URL. We don't
        // trust the path supplied by consumer.
        var prefixLessUrl = new URL(window.location.origin + "/" + path);
        var normalizedPath = prefixLessUrl.pathname;
        var encodedQueryParam = params ?
            params.toString().replace(/[&=%]/g, '_') : '';
        // Strip leading slashes.
        normalizedPath = normalizedPath.replace(/^\/+/g, '');
        // Convert slashes to underscores.
        normalizedPath = normalizedPath.replace(/\//g, '_');
        // Add query parameter as path if it is present.
        if (encodedQueryParam)
            normalizedPath += "_" + encodedQueryParam;
        var url = new URL("" + window.location.origin);
        // All demo data are serialized in JSON format.
        url.pathname = pathPrefix + "/" + normalizedPath + ext;
        return url.pathname + url.search;
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
