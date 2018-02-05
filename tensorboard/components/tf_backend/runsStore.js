/* Copyright 2017 The TensorFlow Authors. All Rights Reserved.

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
var tf_backend;
(function (tf_backend) {
    var runs = [];
    var listeners = new Set();
    var requestManager = new tf_backend.RequestManager(1 /* simultaneous request */);
    /**
     * Register a listener (nullary function) to be called when new runs are
     * available.
     */
    function addListener(listener) {
        listeners.add(listener);
    }
    tf_backend.addListener = addListener;
    /**
     * Remove a listener registered with `addListener`.
     */
    function removeListener(listener) {
        listeners.delete(listener);
    }
    tf_backend.removeListener = removeListener;
    /**
     * Asynchronously load or reload the runs data. Listeners will be
     * invoked if this causes the runs data to change.
     *
     * @see addListener
     * @return {Promise<void>} a promise that resolves when the runs have
     * loaded
     */
    function fetchRuns() {
        var url = tf_backend.getRouter().runs();
        return requestManager.request(url).then(function (newRuns) {
            if (!_.isEqual(runs, newRuns)) {
                runs = newRuns;
                listeners.forEach(function (listener) {
                    listener();
                });
            }
        });
    }
    tf_backend.fetchRuns = fetchRuns;
    /**
     * Get the current list of runs. If no data is available, this will be
     * an empty array (i.e., there is no distinction between "no runs" and
     * "no runs yet").
     */
    function getRuns() {
        return runs.slice();
    }
    tf_backend.getRuns = getRuns;
})(tf_backend || (tf_backend = {})); // namespace tf_backend
