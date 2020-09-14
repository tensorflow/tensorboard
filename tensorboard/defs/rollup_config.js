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

const {nodeResolve} = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');

module.exports = {
  plugins: [
    nodeResolve({
      mainFields: ['browser', 'es2015', 'module', 'jsnext:main', 'main'],
    }),
    commonjs(),
  ],
  output: {
    strict: false,
  },
  onwarn: (warning, warn) => {
    // Suppress known warnings in third-party dependencies that we can't
    // mitigate.
    if (warning.code === 'CIRCULAR_DEPENDENCY') {
      const ignoredPrefixes = [
        // d3 circular deps are wontfix:
        // https://github.com/d3/d3-selection/issues/168#issuecomment-401059437
        'node_modules/d3-interpolate',
        'node_modules/d3-selection',
        'node_modules/d3-transition',
        'node_modules/d3-voronoi',
        'node_modules/plottable',
        'node_modules/ml-matrix',
      ];
      for (const prefix of ignoredPrefixes) {
        if (warning.cycle.some((x) => x.startsWith(prefix))) {
          return;
        }
      }
    }
    if (warning.code === 'EVAL') {
      if (warning.loc.file.includes('/node_modules/numeric/')) {
        return;
      }
    }
    warn(warning);
  },
};
