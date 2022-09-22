/* Copyright 2022 The TensorFlow Authors. All Rights Reserved.

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
import numeric from 'numeric';

// The numeric library requires that the symbol 'numeric' is available in the
// global scope when its operations are executed by other modules. See, for
// example, how the definition of some of its operations refer to the string
// 'numeric' in the Function definition, unmodifiable by the
// bundler/minification code:
//
// https://github.com/sloisel/numeric/blob/656fa1254be540f428710738ca9c1539625777f1/src/numeric.js#L696
//
// The esbuild bundler does not keep 'numeric' in global scope and instead
// renames it as part of bundling/minification. We work around this by manually
// adding it to global scope here.
window['numeric'] = window['numeric'] ?? numeric;

// Reexport the numeric library. All imports of numeric should be done through
// this file to ensure 'numeric' is available in the global scope.
export {numeric};
