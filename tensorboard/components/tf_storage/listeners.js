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
var tf_storage;
(function (tf_storage) {
    // TODO(stephanwlee): Combine this with tf_backend.ListenKey and put it in a
    // sensible place.
    // A unique reference to a listener for an easier dereferencing.
    var ListenKey = /** @class */ (function () {
        function ListenKey(listener) {
            this.listener = listener;
        }
        return ListenKey;
    }());
    tf_storage.ListenKey = ListenKey;
    var hashListeners = new Set();
    var storageListeners = new Set();
    window.addEventListener('hashchange', function () {
        hashListeners.forEach(function (listenKey) { return listenKey.listener(); });
    });
    window.addEventListener('storage', function () {
        storageListeners.forEach(function (listenKey) { return listenKey.listener(); });
    });
    function addHashListener(fn) {
        var key = new ListenKey(fn);
        hashListeners.add(key);
        return key;
    }
    tf_storage.addHashListener = addHashListener;
    function addStorageListener(fn) {
        var key = new ListenKey(fn);
        storageListeners.add(key);
        return key;
    }
    tf_storage.addStorageListener = addStorageListener;
    function removeHashListenerByKey(key) {
        hashListeners.delete(key);
    }
    tf_storage.removeHashListenerByKey = removeHashListenerByKey;
    function removeStorageListenerByKey(key) {
        storageListeners.delete(key);
    }
    tf_storage.removeStorageListenerByKey = removeStorageListenerByKey;
})(tf_storage || (tf_storage = {})); // namespace tf_storage
