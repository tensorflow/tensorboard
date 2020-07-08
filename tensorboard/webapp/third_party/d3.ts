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
 * @fileoverview This is an d3 interop that papers over the differences within
 * google internal repository and the external repository. Please depend on this
 * module instead of depending on the d3 directly.
 *
 * Due to differences in the module system, there is no easy way to make a d3
 * import consistent in both places. The problem goes away when the Polymer
 * based TensorBoard no longer includes d3 in the global context (i.e., they
 * use the same bundler and exist as a single bundle).
 */
export * from 'd3';
