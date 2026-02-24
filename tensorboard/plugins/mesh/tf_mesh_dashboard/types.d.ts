/* Copyright 2024 The TensorFlow Authors. All Rights Reserved.

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

// This declaration fixes the Google internal build. Bazel/concatjs needs the
// .js suffix to find the file (newer concatjs versions don't fix this), but
// TypeScript looks for OrbitControls.js.d.ts which @types/three doesn't have,
// causing the build to fail.
declare module 'three/examples/jsm/controls/OrbitControls.js' {
  export declare class OrbitControls {
    constructor(object: object, domElement?: HTMLElement);
    [key: string]: any; // any: THREE-specific types (e.g. Vector3) can't be declared without module imports
  }
}
