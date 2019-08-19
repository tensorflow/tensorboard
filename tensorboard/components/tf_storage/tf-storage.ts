/* Copyright 2019 The TensorFlow Authors. All Rights Reserved.

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
namespace tf_storage {
  // HACK: this Polymer component allows stores to be accessible from
  // tf-ng-tensorboard by exposing otherwise mangled smybols.
  Polymer({
    is: 'tf-storage',

    DISAMBIGUATOR: tf_storage.DISAMBIGUATOR,
    TAB: tf_storage.TAB,

    getString: tf_storage.getString,
    setString: tf_storage.setString,
    getStringInitializer: tf_storage.getStringInitializer,
    getStringObserver: tf_storage.getStringObserver,
    disposeStringBinding: tf_storage.disposeStringBinding,

    getBoolean: tf_storage.getBoolean,
    setBoolean: tf_storage.setBoolean,
    getBooleanInitializer: tf_storage.getBooleanInitializer,
    getBooleanObserver: tf_storage.getBooleanObserver,
    disposeBooleanBinding: tf_storage.disposeBooleanBinding,

    getNumber: tf_storage.getNumber,
    setNumber: tf_storage.setNumber,
    getNumberInitializer: tf_storage.getNumberInitializer,
    getNumberObserver: tf_storage.getNumberObserver,
    disposeNumberBinding: tf_storage.disposeNumberBinding,

    getObject: tf_storage.getObject,
    setObject: tf_storage.setObject,
    getObjectInitializer: tf_storage.getObjectInitializer,
    getObjectObserver: tf_storage.getObjectObserver,
    disposeObjectBinding: tf_storage.disposeObjectBinding,

    // Export more symbols if they are truly needed.
  });
} // namespace tf_storage
