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
    _template: null, // strictTemplatePolicy requires a template (even a null one).
    tf_storage: tf_storage,
  });
} // namespace tf_storage
