/* Copyright 2018 The TensorFlow Authors. All Rights Reserved.

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
var tf_data_selector;
(function (tf_data_selector) {
    var _a;
    function decodeIdArray(str) {
        return str.split(',').map(function (idStr) { return parseInt(idStr, 10); }).filter(Boolean);
    }
    tf_data_selector.decodeIdArray = decodeIdArray;
    function encodeIdArray(arr) {
        return arr.map(encodeId).join(',');
    }
    tf_data_selector.encodeIdArray = encodeIdArray;
    function encodeId(id) {
        return String(id);
    }
    tf_data_selector.encodeId = encodeId;
    tf_data_selector.NO_EXPERIMENT_ID = null;
    tf_data_selector.STORAGE_ALL_VALUE = '$all';
    tf_data_selector.STORAGE_NONE_VALUE = '$none';
    _a = tf_storage.makeBindings(function (str) { return tf_data_selector.decodeIdArray(str); }, function (ids) { return tf_data_selector.encodeIdArray(ids); }), tf_data_selector.getIdInitializer = _a.getInitializer, tf_data_selector.getIdObserver = _a.getObserver, tf_data_selector.setId = _a.set;
})(tf_data_selector || (tf_data_selector = {})); // namespace tf_data_selector
