/* Copyright 2020 The TensorFlow Authors. All Rights Reserved.

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
import '../../webapp/tb_polymer_interop_types';
import * as tf_globals from './globals';

/**
 * Attach API to window for interoperability with the Angular binary.
 * The full shared type is defined in tensorboard/webapp/tb_polymer_interop_type_definitions.d.ts
 * Defining it this way doesn't matter too much while property renaming is turned off,
 * but at some point in the future we would like to enable it.
 */
window.tensorboard = {
  ...window.tensorboard,
  tf_globals,
};
