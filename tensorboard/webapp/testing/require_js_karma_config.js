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
require.config({
  /**
   * If paths are updated here, and Karma is still unable to resolve them,
   * see the 'static_files' attribute on 'tf_ng_web_test_suite' in
   * tensoboard/defs/defs.bzl for ways to specify a static path for Karma to
   * use.
   */
  paths: {
    '@tensorflow/tfjs-core':
      '/base/npm/node_modules/@tensorflow/tfjs-core/dist/tf-core',
    '@tensorflow/tfjs-backend-cpu':
      '/base/npm/node_modules/@tensorflow/tfjs-backend-cpu/dist/tf-backend-cpu',
    '@tensorflow/tfjs-backend-webgl':
      '/base/npm/node_modules/@tensorflow/tfjs-backend-webgl/dist/tf-backend-webgl',
    'umap-js': '/base/npm/node_modules/umap-js/lib/umap-js',
    seedrandom: '/base/npm/node_modules/seedrandom/lib/alea',
    lodash: '/base/npm/node_modules/lodash/lodash',
    d3: '/base/npm/node_modules/d3/dist/d3',
    three: '/base/npm/node_modules/three/build/three',
    dagre: '/base/npm/node_modules/dagre/dist/dagre',
    marked: '/base/npm/node_modules/marked/marked.min',
  },
});
