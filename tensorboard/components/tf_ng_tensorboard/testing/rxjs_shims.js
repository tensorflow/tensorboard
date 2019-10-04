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
 * This is a fork from https://github.com/angular/angular-bazel-example/blob/master/src/rxjs_shims.js that
 * is originally licensed as below.
 * This fork reformat the code using prettier.
 * This shim is required as long as we use rxjs (even in a transitive dependency) and Karma based testing
 * that uses concatjs to create a bundle. Concatjs drastically improves speed of incremental build but
 * it requires modules to use UMD style.
 */
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/**
 * @fileoverview these provide named UMD modules so that we can bundle
 * the application along with rxjs using the concatjs bundler.
 */

// rxjs/operators
(function(factory) {
  if (typeof module === 'object' && typeof module.exports === 'object') {
    var v = factory(require, exports);
    if (v !== undefined) module.exports = v;
  } else if (typeof define === 'function' && define.amd) {
    define('rxjs/operators', ['exports', 'rxjs'], factory);
  }
})(function(exports, rxjs) {
  'use strict';
  Object.keys(rxjs.operators).forEach(function(key) {
    exports[key] = rxjs.operators[key];
  });
  Object.defineProperty(exports, '__esModule', {value: true});
});

// rxjs/testing
(function(factory) {
  if (typeof module === 'object' && typeof module.exports === 'object') {
    var v = factory(require, exports);
    if (v !== undefined) module.exports = v;
  } else if (typeof define === 'function' && define.amd) {
    define('rxjs/testing', ['exports', 'rxjs'], factory);
  }
})(function(exports, rxjs) {
  'use strict';
  Object.keys(rxjs.testing).forEach(function(key) {
    exports[key] = rxjs.testing[key];
  });
  Object.defineProperty(exports, '__esModule', {value: true});
});
