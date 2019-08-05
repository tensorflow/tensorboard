/* Copyright 2018 The TensorFlow Authors. All Rights Reserved.

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

var path = require('path');
var version = require('./package.json').version;

// Custom webpack rules are generally the same for all webpack bundles, hence
// stored in a separate local variable.
var rules = [
  {test: /\.css$/, use: ['style-loader', 'css-loader']},
  {test: /\.(html)$/, use: [{loader: 'file-loader', options: {}}]},
];

module.exports = [
  {
    // Notebook extension
    //
    // This bundle only contains the part of the JavaScript that is run on
    // load of the notebook. This section generally only performs
    // some configuration for requirejs, and provides the legacy
    // "load_ipython_extension" function which is required for any notebook
    // extension.
    //
    entry: './lib/extension.js',
    output: {
      filename: 'extension.js',
      path: path.resolve(__dirname, 'static'),
      libraryTarget: 'amd',
    },
  },
  {
    // Bundle for the notebook containing the custom widget views and models
    //
    // This bundle contains the implementation for the custom widget views and
    // custom widget.
    // It must be an amd module
    //
    entry: './lib/index.js',
    output: {
      filename: 'index.js',
      path: path.resolve(__dirname, 'static'),
      libraryTarget: 'amd',
    },
    devtool: 'source-map',
    module: {
      rules: rules,
    },
    externals: ['@jupyter-widgets/base'],
  },
  {
    // Embeddable wit-widget bundle
    //
    // This bundle is generally almost identical to the notebook bundle
    // containing the custom widget views and models.
    //
    // The only difference is in the configuration of the webpack public path
    // for the static assets.
    //
    // It will be automatically distributed by unpkg to work with the static
    // widget embedder.
    //
    // The target bundle is always `dist/index.js`, which is the path required
    // by the custom widget embedder.
    //
    entry: './lib/embed.js',
    output: {
      filename: 'index.js',
      path: path.resolve(__dirname, 'dist'),
      libraryTarget: 'amd',
      publicPath: 'https://unpkg.com/wit-widget@' + version + '/dist/',
    },
    devtool: 'source-map',
    module: {
      rules: rules,
    },
    externals: ['@jupyter-widgets/base'],
  },
];
