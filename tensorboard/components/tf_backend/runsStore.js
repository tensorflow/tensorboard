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
    class RunsStore extends tf_backend.BaseStore {
        constructor() {
            super(...arguments);
            this._runs = [];
        }
        load() {
            const url = tf_backend.getRouter().runs();
            return this.requestManager.request(url).then((newRuns) => {
                if (!_.isEqual(this._runs, newRuns)) {
                    this._runs = newRuns;
                    this.emitChange();
                }
            });
        }
        /**
         * Get the current list of runs. If no data is available, this will be
         * an empty array (i.e., there is no distinction between "no runs" and
         * "no runs yet").
         */
        getRuns() {
            return this._runs.slice();
        }
    }
    tf_backend.RunsStore = RunsStore;
    tf_backend.runsStore = new RunsStore();
})(tf_backend || (tf_backend = {})); // namespace tf_backend
