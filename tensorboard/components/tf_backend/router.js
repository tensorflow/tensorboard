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
        function standardRoute(route, demoExtension) {
            if (demoExtension === void 0) { demoExtension = '.json'; }
            return function (tag, run) {
                return dataDir + '/' + tf_backend.addParams(route, { tag: tag, run: run });
            };
        }
        function pluginRoute(pluginName, route) {
            return dataDir + "/plugin/" + pluginName + route;
        }
        return {
            environment: function () { return dataDir + '/environment'; },
            experiments: function () { return dataDir + '/experiments'; },
            isDemoMode: function () { return demoMode; },
            pluginRoute: pluginRoute,
            pluginsListing: function () { return dataDir + '/plugins_listing'; },
            runs: function () { return dataDir + '/runs' + (demoMode ? '.json' : ''); },
            runsForExperiment: function (id) { return dataDir + ("/experiment_runs?experiment=" + id); },
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
})(tf_backend || (tf_backend = {})); // namespace tf_backend
