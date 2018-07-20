/* Copyright 2018 The TensorFlow Authors. All Rights Reserved.
+
+Licensed under the Apache License, Version 2.0 (the "License");
+you may not use this file except in compliance with the License.
+You may obtain a copy of the License at
+
+    http://www.apache.org/licenses/LICENSE-2.0
+
+Unless required by applicable law or agreed to in writing, software
+distributed under the License is distributed on an "AS IS" BASIS,
+WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
+See the License for the specific language governing permissions and
+limitations under the License.
+==============================================================================*/
var tf_backend;
(function (tf_backend) {
    // A unique reference to a listener for an easier dereferencing.
    var ListenKey = /** @class */ (function () {
        function ListenKey(listener) {
            this.listener = listener;
        }
        return ListenKey;
    }());
    tf_backend.ListenKey = ListenKey;
    var BaseStore = /** @class */ (function () {
        function BaseStore() {
            this.requestManager = new tf_backend.RequestManager(1 /* simultaneous request */);
            this._listeners = new Set();
        }
        /**
         * Register a listener (nullary function) to be called when new runs are
         * available.
         */
        BaseStore.prototype.addListener = function (listener) {
            var key = new ListenKey(listener);
            this._listeners.add(key);
            return key;
        };
        /**
         * Remove a listener registered with `addListener`.
         */
        BaseStore.prototype.removeListenerByKey = function (listenKey) {
            this._listeners.delete(listenKey);
        };
        BaseStore.prototype.emitChange = function () {
            this._listeners.forEach(function (listenKey) {
                try {
                    listenKey.listener();
                }
                catch (e) {
                    // ignore exceptions on the listener side.
                }
            });
        };
        return BaseStore;
    }());
    tf_backend.BaseStore = BaseStore;
})(tf_backend || (tf_backend = {})); // namespace tf_backend
