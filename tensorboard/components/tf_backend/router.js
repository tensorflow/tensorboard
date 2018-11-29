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
    var _router = createRouter();
    /**
     * Create a router for communicating with the TensorBoard backend. You
     * can pass this to `setRouter` to make it the global router.
     *
     * @param dataDir {string=} The base prefix for data endpoints.
     */
    function createRouter(dataDir) {
        if (dataDir === void 0) { dataDir = "data"; }
        if (dataDir[dataDir.length - 1] === "/") {
            dataDir = dataDir.slice(0, dataDir.length - 1);
        }
        return {
            environment: function () { return createDataPath(dataDir, "/environment"); },
            experiments: function () { return createDataPath(dataDir, "/experiments"); },
            pluginRoute: function (pluginName, route, params) {
                return createDataPath(dataDir + "/plugin", "/" + pluginName + route, params);
            },
            pluginsListing: function () { return createDataPath(dataDir, "/plugins_listing"); },
            runs: function () { return createDataPath(dataDir, "/runs"); },
            runsForExperiment: function (id) {
                return createDataPath(dataDir, "/experiment_runs", createSearchParam({ experiment: String(id) }));
            },
        };
    }
    tf_backend.createRouter = createRouter;
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
    function createDataPath(dataDir, route, params) {
        if (params === void 0) { params = new URLSearchParams(); }
        var relativePath = dataDir + route;
        if (String(params)) {
            var delimiter = route.includes("?") ? "&" : "?";
            relativePath += delimiter + String(params);
        }
        return relativePath;
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
