var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
    var Mode;
    (function (Mode) {
        Mode[Mode["DB"] = 0] = "DB";
        Mode[Mode["LOGDIR"] = 1] = "LOGDIR";
    })(Mode = tf_backend.Mode || (tf_backend.Mode = {}));
    var EnvironmentStore = /** @class */ (function (_super) {
        __extends(EnvironmentStore, _super);
        function EnvironmentStore() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        EnvironmentStore.prototype.refresh = function () {
            var _this = this;
            var url = tf_backend.getRouter().environment();
            return this.requestManager.request(url).then(function (result) {
                var environment = {
                    dataLocation: result.data_location,
                    mode: result.mode == 'db' ? Mode.DB : Mode.LOGDIR,
                    windowTitle: result.window_title,
                };
                if (_.isEqual(_this.environment, environment))
                    return;
                _this.environment = environment;
                _this.emitChange();
            });
        };
        EnvironmentStore.prototype.getDataLocation = function () {
            return this.environment.dataLocation;
        };
        EnvironmentStore.prototype.getMode = function () {
            return this.environment.mode;
        };
        EnvironmentStore.prototype.getWindowTitle = function () {
            return this.environment.windowTitle;
        };
        return EnvironmentStore;
    }(tf_backend.BaseStore));
    tf_backend.EnvironmentStore = EnvironmentStore;
    tf_backend.environmentStore = new EnvironmentStore();
})(tf_backend || (tf_backend = {})); // namespace tf_backend
