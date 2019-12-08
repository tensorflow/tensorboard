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

/**
 * @fileoverview This esmodule gets loaded by the dynamic plugin system.
 */

export function render() {
  console.log('In debugger_v2 index.js render()');  // DEBUG
  const el = document.createElement('debugger');
  document.body.appendChild(el);
  // import('../../../helloworld_bundle.js');
}
