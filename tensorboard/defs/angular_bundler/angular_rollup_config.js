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

const {nodeResolve} = require('@rollup/plugin-node-resolve');
const {babel} = require('@rollup/plugin-babel');
const {
  ConsoleLogger,
  NodeJSFileSystem,
  LogLevel,
} = require('@angular/compiler-cli');
const {
  createEs2015LinkerPlugin,
} = require('@angular/compiler-cli/linker/babel');

/** File system used by the Angular linker plugin. */
const fileSystem = new NodeJSFileSystem();
/** Logger used by the Angular linker plugin. */
const logger = new ConsoleLogger(LogLevel.info);
/** Linker babel plugin. */
const linkerPlugin = createEs2015LinkerPlugin({
  fileSystem,
  logger,
  linkerJitMode: false,
});

module.exports = {
  plugins: [nodeResolve(), babel({plugins: [linkerPlugin]})],
};
