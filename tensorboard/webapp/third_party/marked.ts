/* Copyright 2021 The TensorFlow Authors. All Rights Reserved.

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
 * @fileoverview This is an marked interop that papers over the differences
 * within google internal repository and the external repository. Please depend
 * on this module instead of depending on the marked directly.
 */
import * as markedImport from 'marked';

// You cannot `export * from 'marked';` due to below error[1].
// [1]: 'marked' uses 'export =' and cannot be used with 'export *'.
export import marked = markedImport;
