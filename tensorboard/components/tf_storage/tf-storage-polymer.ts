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
import {PolymerElement} from '@polymer/polymer';
import {customElement} from '@polymer/decorators';
import * as listeners from './listeners';
import * as storage from './storage';

const tf_storage = {
  ...listeners,
  ...storage,
};

// HACK: this Polymer component allows stores to be accessible from
// tf-ng-tensorboard by exposing otherwise mangled smybols.
@customElement('tf-storage')
class TfStorage extends PolymerElement {
  static readonly template: null;

  tf_storage = tf_storage;
}
