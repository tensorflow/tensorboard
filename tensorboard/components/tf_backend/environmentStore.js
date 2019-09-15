/* Copyright 2018 The TensorFlow Authors. All Rights Reserved.

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
    class EnvironmentStore extends tf_backend.BaseStore {
        load() {
            const url = tf_backend
                .getRouter()
                .environment(tf_backend.getExperimentId());
            return this.requestManager.request(url).then((result) => {
                const environment = {
                    dataLocation: result.data_location,
                    windowTitle: result.window_title,
                };
                if (_.isEqual(this.environment, environment))
                    return;
                this.environment = environment;
                this.emitChange();
            });
        }
        getDataLocation() {
            return this.environment ? this.environment.dataLocation : '';
        }
        getWindowTitle() {
            return this.environment ? this.environment.windowTitle : '';
        }
    }
    tf_backend.EnvironmentStore = EnvironmentStore;
    tf_backend.environmentStore = new EnvironmentStore();
})(tf_backend || (tf_backend = {})); // namespace tf_backend
