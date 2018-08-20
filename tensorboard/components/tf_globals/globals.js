/* Copyright 2016 The TensorFlow Authors. All Rights Reserved.

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
var tf_globals;
(function (tf_globals) {
    // If true, TensorBoard stores its hash in the URI state.
    // If false, tab switching in TensorBoard will not update location hash,
    // because hash updates interfere with wct_tests.
    var _useHash = false;
    function setUseHash(shouldUseHash) {
        _useHash = shouldUseHash;
    }
    tf_globals.setUseHash = setUseHash;
    function useHash() {
        return _useHash;
    }
    tf_globals.useHash = useHash;
    var _fakeHash = '';
    function setFakeHash(h) {
        _fakeHash = h;
    }
    tf_globals.setFakeHash = setFakeHash;
    function getFakeHash() {
        return _fakeHash;
    }
    tf_globals.getFakeHash = getFakeHash;
    function getEnableDataSelector() {
        return new URLSearchParams(window.location.search).has('EnableDataSelector');
    }
    tf_globals.getEnableDataSelector = getEnableDataSelector;
})(tf_globals || (tf_globals = {})); // namespace tf_globals
