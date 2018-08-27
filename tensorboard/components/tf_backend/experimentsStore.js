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
    var ExperimentsStore = /** @class */ (function (_super) {
        __extends(ExperimentsStore, _super);
        function ExperimentsStore() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this._experiments = [];
            return _this;
        }
        ExperimentsStore.prototype.load = function () {
            var _this = this;
            var url = tf_backend.getRouter().experiments();
            return this.requestManager.request(url).then(function (newExperiments) {
                if (!_.isEqual(_this._experiments, newExperiments)) {
                    _this._experiments = newExperiments;
                    _this.emitChange();
                }
            });
        };
        /**
         * Get the current list of experiments. If no data is available, this will be
         * an empty array (i.e., there is no distinction between "no experiment" and
         * "no experiment yet").
         */
        ExperimentsStore.prototype.getExperiments = function () {
            return this._experiments.slice();
        };
        return ExperimentsStore;
    }(tf_backend.BaseStore));
    tf_backend.ExperimentsStore = ExperimentsStore;
    tf_backend.experimentsStore = new ExperimentsStore();
})(tf_backend || (tf_backend = {})); // namespace tf_backend
