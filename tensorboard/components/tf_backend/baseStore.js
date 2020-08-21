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
    class ListenKey {
        constructor(listener) {
            this.listener = listener;
        }
    }
    tf_backend.ListenKey = ListenKey;
    class BaseStore {
        constructor() {
            this.requestManager = new tf_backend.RequestManager(1 /* simultaneous request */);
            this._listeners = new Set();
            this.initialized = false;
        }
        refresh() {
            return this.load().then(() => {
                this.initialized = true;
            });
        }
        /**
         * Register a listener (nullary function) to be called when new runs are
         * available.
         */
        addListener(listener) {
            const key = new ListenKey(listener);
            this._listeners.add(key);
            return key;
        }
        /**
         * Remove a listener registered with `addListener`.
         */
        removeListenerByKey(listenKey) {
            this._listeners.delete(listenKey);
        }
        emitChange() {
            this._listeners.forEach((listenKey) => {
                try {
                    listenKey.listener();
                }
                catch (e) {
                    // ignore exceptions on the listener side.
                }
            });
        }
    }
    tf_backend.BaseStore = BaseStore;
})(tf_backend || (tf_backend = {})); // namespace tf_backend
