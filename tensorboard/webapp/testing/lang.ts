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
/**
 * Recursively freezes an object and all of its fields. The given object is
 * assumed not to have reference loops.
 */
export function deepFreeze<T extends {}>(obj: T): T {
  for (const val of Object.values(obj)) {
    if (val && typeof val === 'object') {
      deepFreeze(val);
    }
  }
  return Object.freeze(obj);
}
