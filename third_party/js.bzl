# Copyright 2017 The TensorFlow Authors. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the 'License');
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an 'AS IS' BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# TensorBoard external JS dependencies (both infrastructure and frontend libs)
load("@io_bazel_rules_closure//closure:defs.bzl", "filegroup_external")
load("@io_bazel_rules_closure//closure:defs.bzl", "web_library_external")


def tensorboard_js_workspace():

  ##############################################################################
  # TensorBoard Build Tools

  filegroup_external(
      name = "org_nodejs",
      # MIT with portions licensed:
      # - MIT
      # - Old MIT
      # - 2-Clause-BSD
      # - 3-Clause-BSD
      # - ISC
      # - Unicode
      # - zlib
      # - Artistic 2.0
      licenses = ["notice"],
      sha256_urls_extract_macos = {
          "910395e1e98fb351c62b5702a9deef22aaecf05d6df1d7edc283337542207f3f": [
              "https://mirror.bazel.build/nodejs.org/dist/v6.9.1/node-v6.9.1-darwin-x64.tar.xz",
              "http://nodejs.org/dist/v6.9.1/node-v6.9.1-darwin-x64.tar.xz",
          ],
      },
      sha256_urls_windows = {
          "1914bfb950be8d576ce9e49c8a0e51c9f2402560fe3c19093e69bc1306a56e9e": [
              "https://mirror.bazel.build/raw.githubusercontent.com/nodejs/node/v6.9.1/LICENSE",
              "https://raw.githubusercontent.com/nodejs/node/v6.9.1/LICENSE",
          ],
          "513923b0490ebb7466a56483a62595814ed9d036d6f35476debb0cd606bec526": [
              "https://mirror.bazel.build/nodejs.org/dist/v6.9.1/win-x64/node.exe",
              "http://nodejs.org/dist/v6.9.1/win-x64/node.exe",
          ],
          "3951aefa4afd6fb836ab06468b1fc2a69fa75bd66ec2f5a0e08c4e32547681e3": [
              "https://mirror.bazel.build/nodejs.org/dist/v6.9.1/win-x64/node.lib",
              "http://nodejs.org/dist/v6.9.1/win-x64/node.lib",
          ],
      },
      sha256_urls_extract = {
          "d4eb161e4715e11bbef816a6c577974271e2bddae9cf008744627676ff00036a": [
              "https://mirror.bazel.build/nodejs.org/dist/v6.9.1/node-v6.9.1-linux-x64.tar.xz",
              "http://nodejs.org/dist/v6.9.1/node-v6.9.1-linux-x64.tar.xz",
          ],
      },
      strip_prefix = {
          "node-v6.9.1-darwin-x64.tar.xz": "node-v6.9.1-darwin-x64",
          "node-v6.9.1-linux-x64.tar.xz": "node-v6.9.1-linux-x64",
      },
      executable = [
          "node",
          "node.exe",
      ],
  )

  filegroup_external(
      name = "com_microsoft_typescript",
      licenses = ["notice"],  # Apache 2.0
      sha256_urls = {
          "a7d00bfd54525bc694b6e32f64c7ebcf5e6b7ae3657be5cc12767bce74654a47": [
              "https://mirror.bazel.build/raw.githubusercontent.com/Microsoft/TypeScript/v2.7.2/LICENSE.txt",
              "https://raw.githubusercontent.com/Microsoft/TypeScript/v2.9.2/LICENSE.txt",
          ],
          "9632bfccde117a8c82690a324bc5c18c3869e9b89ac536fc134ba655d7ec1e98": [
              "https://mirror.bazel.build/raw.githubusercontent.com/Microsoft/TypeScript/v2.9.2/lib/tsc.js",
              "https://raw.githubusercontent.com/Microsoft/TypeScript/v2.9.2/lib/tsc.js",
          ],
          "529c9f8b45939e0fa80950208bf80452ccb982b460cc25433813c919b67a3b2f": [
              "https://mirror.bazel.build/raw.githubusercontent.com/Microsoft/TypeScript/v2.9.2/lib/lib.es6.d.ts",
              "https://raw.githubusercontent.com/Microsoft/TypeScript/v2.9.2/lib/lib.es6.d.ts",
          ],
          "f6e6efe57fb9fcf72eed013e2755d04505300f32b78577118ca5dacc85ec852d": [
              "https://mirror.bazel.build/raw.githubusercontent.com/Microsoft/TypeScript/v2.9.2/lib/lib.dom.d.ts",
              "https://raw.githubusercontent.com/Microsoft/TypeScript/v2.9.2/lib/lib.dom.d.ts",
          ],
      },
      extra_build_file_content = "\n".join([
          "sh_binary(",
          "    name = \"tsc\",",
          "    srcs = [\"tsc.sh\"],",
          "    data = [",
          "        \"tsc.js\",",
          "        \"@org_nodejs\",",
          "    ],",
          ")",
          "",
          "genrule(",
          "    name = \"tsc_sh\",",
          "    outs = [\"tsc.sh\"],",
          "    cmd = \"cat >$@ <<'EOF'\\n\" +",
          "          \"#!/bin/bash\\n\" +",
          "          \"NODE=external/org_nodejs/bin/node\\n\" +",
          "          \"if [[ -e external/org_nodejs/node.exe ]]; then\\n\" +",
          "          \"  NODE=external/org_nodejs/node.exe\\n\" +",
          "          \"fi\\n\" +",
          "          \"exec $${NODE} external/com_microsoft_typescript/tsc.js \\\"$$@\\\"\\n\" +",
          "          \"EOF\",",
          "    executable = True,",
          ")",
      ]),
  )

  native.new_http_archive(
      name = "io_angular_clutz",
      build_file = str(Label("//third_party:clutz.BUILD")),
      sha256 = "7a5c785dbcc3ae0daa1fcf4507de6a23bbecdb2bf80460651e4c2b88c1ad7582",
      strip_prefix = "clutz-7f1a3ee9ad9f85a9056084dc039496bbd35e11f6",
      urls = [
          "https://mirror.bazel.build/github.com/angular/clutz/archive/7f1a3ee9ad9f85a9056084dc039496bbd35e11f6.tar.gz",  # 2017-11-02
          "https://github.com/angular/clutz/archive/7f1a3ee9ad9f85a9056084dc039496bbd35e11f6.tar.gz",
      ],
  )

  filegroup_external(
      name = "com_google_javascript_closure_compiler_externs",
      licenses = ["notice"],  # Apache 2.0
      sha256_urls_extract = {
          "55bdf8dc5d74534b63edbce5f510557a18a2b7aa578938ba300eb65f2da48092": [
              "https://mirror.bazel.build/github.com/google/closure-compiler/archive/v20180402.tar.gz",
              "https://github.com/google/closure-compiler/archive/v20180402.tar.gz",
          ],
      },
      strip_prefix = {"v20180402.tar.gz": "closure-compiler-20180402/externs"},
  )

  filegroup_external(
      name = "com_google_javascript_closure_compiler_externs_polymer",
      licenses = ["notice"],  # Apache 2.0
      sha256_urls = {
          "737af73d7b02226e6e1516044a8eb8283376d44f64839979936ca163c00900f4": [
              "https://mirror.bazel.build/raw.githubusercontent.com/google/closure-compiler/v20180402/contrib/externs/polymer-1.0.js",
              "https://raw.githubusercontent.com/google/closure-compiler/v20180402/contrib/externs/polymer-1.0.js",
          ],
      },
  )

  filegroup_external(
      name = "org_threejs",
      # no @license header
      licenses = ["notice"],  # MIT
      sha256_urls = {
          "5eb9be209f84c4588f573b9abd8e13c04ce187ad6f40e8b12993d00b1428de54": [
              "https://mirror.bazel.build/raw.githubusercontent.com/mrdoob/three.js/r77/LICENSE",
              "https://raw.githubusercontent.com/mrdoob/three.js/r77/LICENSE",
          ],
          "881cc79c84c34a1f61f8c8af0ee3f237d83a2eda3868720fdcb47bcacf8da44a": [
              "https://mirror.bazel.build/raw.githubusercontent.com/mrdoob/three.js/r77/build/three.js",
              "https://raw.githubusercontent.com/mrdoob/three.js/r77/build/three.js",
          ],
          "98b8b5954901025a98033c8bdd65969be1f30b59e11f823ec864253bb72f768d": [
              "https://mirror.bazel.build/raw.githubusercontent.com/mrdoob/three.js/r77/examples/js/controls/OrbitControls.js",
              "https://raw.githubusercontent.com/mrdoob/three.js/r77/examples/js/controls/OrbitControls.js",
          ],
      },
  )

  ##############################################################################
  # TensorBoard JavaScript Production Dependencies

  web_library_external(
      name = "com_lodash",
      licenses = ["notice"],  # MIT
      sha256 = "6c5fa80d0fa9dc4eba634ab042404ff7c162dcb4cfe3473338801aeca0042285",
      urls = [
          "https://mirror.bazel.build/github.com/lodash/lodash/archive/4.17.5.tar.gz",
          "https://github.com/lodash/lodash/archive/4.17.5.tar.gz",
      ],
      strip_prefix = "lodash-4.17.5",
      path = "/lodash",
      srcs = ["lodash.js"],
      extra_build_file_content = "exports_files([\"LICENSE\"])",
  )

  filegroup_external(
      name = "com_numericjs",
      # no @license header
      licenses = ["notice"],  # MIT
      sha256_urls = {
          "0e94aada97f12dee6118064add9170484c55022f5d53206ee4407143cd36ddcd": [
              "https://mirror.bazel.build/raw.githubusercontent.com/sloisel/numeric/v1.2.6/license.txt",
              "https://raw.githubusercontent.com/sloisel/numeric/v1.2.6/license.txt",
          ],
          "5dcaba2016fd237091e3a17b0dc272fb21f0e2b15d7628f95a0ad0cd4cdf4020": [
              "https://mirror.bazel.build/www.numericjs.com/lib/numeric-1.2.6.js",
              "http://www.numericjs.com/lib/numeric-1.2.6.js",
          ],
      },
      rename = {"numeric-1.2.6.js": "numeric.js"},
  )

  filegroup_external(
      name = "com_palantir_plottable",
      # no @license header
      licenses = ["notice"],  # MIT
      sha256_urls_extract = {
          # Plottable doesn't have a release tarball on GitHub. Using the
          # sources directly from git also requires running Node tooling
          # beforehand to generate files. NPM is the only place to get it.
          "08df639782baf9b8cfeeb5fcdfbe3a1ce25b5a916903fc580e201a0a1142a6c4": [
              "https://mirror.bazel.build/registry.npmjs.org/plottable/-/plottable-3.7.0.tgz",
              "https://registry.npmjs.org/plottable/-/plottable-3.7.0.tgz",
          ],
      },
  )

  filegroup_external(
      name = "io_github_cpettitt_dagre",
      # no @license header
      licenses = ["notice"],  # MIT
      sha256_urls = {
          "6a349742a6cb219d5a2fc8d0844f6d89a6efc62e20c664450d884fc7ff2d6015": [
              "https://mirror.bazel.build/raw.githubusercontent.com/cpettitt/dagre/v0.8.2/LICENSE",
              "https://raw.githubusercontent.com/cpettitt/dagre/v0.8.2/LICENSE",
          ],
          "43cb4e919196c177c149b63880d262074670af99db6a1e174b25e266da4935a9": [
              "https://mirror.bazel.build/raw.githubusercontent.com/cpettitt/dagre/v0.8.2/dist/dagre.core.js",
              "https://raw.githubusercontent.com/cpettitt/dagre/v0.8.2/dist/dagre.core.js",
          ],
      },
  )

  filegroup_external(
      name = "io_github_cpettitt_graphlib",
      licenses = ["notice"],  # MIT
      sha256_urls = {
          "6a349742a6cb219d5a2fc8d0844f6d89a6efc62e20c664450d884fc7ff2d6015": [
              "https://mirror.bazel.build/raw.githubusercontent.com/cpettitt/graphlib/v2.1.5/LICENSE",
              "https://raw.githubusercontent.com/cpettitt/graphlib/v2.1.5/LICENSE",
          ],
          "ddc33a6aaf955ee24b0e0d30110adf350c65eedc5c0f2c424ca85bc128199a66": [
              "https://mirror.bazel.build/raw.githubusercontent.com/cpettitt/graphlib/v2.1.5/dist/graphlib.core.js",
              "https://raw.githubusercontent.com/cpettitt/graphlib/v2.1.5/dist/graphlib.core.js",
          ],
      },
  )

  filegroup_external(
      name = "io_github_waylonflinn_weblas",
      # no @license header
      licenses = ["notice"],  # MIT
      sha256_urls = {
          "633f2861a9a862b9cd7967e841e14dd3527912f209d6563595774fa31e3d84cb": [
              "https://mirror.bazel.build/raw.githubusercontent.com/waylonflinn/weblas/v0.9.0/LICENSE",
              "https://raw.githubusercontent.com/waylonflinn/weblas/v0.9.0/LICENSE",
          ],
          "f138fce57f673ca8a633f4aee5ae5b6fcb6ad0de59069a42a74e996fd04d8fcc": [
              "https://mirror.bazel.build/raw.githubusercontent.com/waylonflinn/weblas/v0.9.0/dist/weblas.js",
              "https://raw.githubusercontent.com/waylonflinn/weblas/v0.9.0/dist/weblas.js",
          ],
      },
  )

  filegroup_external(
      name = "org_d3js",
      # no @license header
      licenses = ["notice"],  # BSD-3-Clause
      sha256_urls_extract = {
          "05a9c2b9c206447be0e26b3a705e7f8df4943df2d063ddc5bf0274f50ec44727": [
              "https://mirror.bazel.build/github.com/d3/d3/releases/download/v5.7.0/d3.zip",
              "https://github.com/d3/d3/releases/download/v5.7.0/d3.zip",
          ],
      },
      # TODO(jart): Use srcs=["d3.js"] instead of this once supported.
      generated_rule_name = "all_files",
      extra_build_file_content = "\n".join([
          "filegroup(",
          "    name = \"org_d3js\",",
          "    srcs = [\"d3.js\"],",
          ")",
      ]),
  )

  filegroup_external(
      name = "org_chromium_catapult_vulcanized_trace_viewer",
      licenses = ["notice"],  # BSD-3-Clause
      sha256_urls = {
          "f0df289ba9d03d857ad1c2f5918861376b1510b71588ffc60eff5c7a7bfedb09": [
              "https://mirror.bazel.build/raw.githubusercontent.com/catapult-project/catapult/2f7ee994984f3ebd3dd3dc3e05777bf180ec2ee8/LICENSE",
              "https://raw.githubusercontent.com/catapult-project/catapult/2f7ee994984f3ebd3dd3dc3e05777bf180ec2ee8/LICENSE",
          ],
          "b1f0195f305ca66fdb7dae264771f162ae03f04aa642848f15cd871c043e04d1": [
              "https://mirror.bazel.build/raw.githubusercontent.com/catapult-project/catapult/237aea8b58a37a2991318b6a0db60d84078e5f7e/trace_viewer_full.html",
              "https://raw.githubusercontent.com/catapult-project/catapult/237aea8b58a37a2991318b6a0db60d84078e5f7e/trace_viewer_full.html"  # 2017-06-19
          ],
      },
  )

  ##############################################################################
  # TensorBoard Testing Dependencies

  web_library_external(
      name = "org_npmjs_registry_accessibility_developer_tools",
      licenses = ["notice"],  # Apache License 2.0
      sha256 = "1d6a72f401c9d53f68238c617dd43a05cd85ca5aa2e676a5b3c352711448e093",
      urls = [
          "https://mirror.bazel.build/registry.npmjs.org/accessibility-developer-tools/-/accessibility-developer-tools-2.10.0.tgz",
          "https://registry.npmjs.org/accessibility-developer-tools/-/accessibility-developer-tools-2.10.0.tgz",
      ],
      strip_prefix = "package",
      path = "/accessibility-developer-tools",
      suppress = ["strictDependencies"],
  )

  web_library_external(
      name = "org_npmjs_registry_async",
      licenses = ["notice"],  # MIT
      sha256 = "08655255ae810bf4d1cb1642df57658fcce823776d3ba8f4b46f4bbff6c87ece",
      urls = [
          "https://mirror.bazel.build/registry.npmjs.org/async/-/async-1.5.0.tgz",
          "https://registry.npmjs.org/async/-/async-1.5.0.tgz",
      ],
      strip_prefix = "package",
      path = "/async",
  )

  web_library_external(
      name = "org_npmjs_registry_chai",
      licenses = ["notice"],  # MIT
      sha256 = "aca8137bed5bb295bd7173325b7ad604cd2aeb341d739232b4f9f0b26745be90",
      urls = [
          "https://mirror.bazel.build/registry.npmjs.org/chai/-/chai-3.5.0.tgz",
          "https://registry.npmjs.org/chai/-/chai-3.5.0.tgz",
      ],
      strip_prefix = "package",
      path = "/chai",
  )

  web_library_external(
      name = "org_npmjs_registry_mocha",
      licenses = ["notice"],  # MIT
      sha256 = "13ef37a071196a2fba680799b906555d3f0ab61e80a7e8f73f93e77914590dd4",
      urls = [
          "https://mirror.bazel.build/registry.npmjs.org/mocha/-/mocha-2.5.3.tgz",
          "https://registry.npmjs.org/mocha/-/mocha-2.5.3.tgz",
      ],
      suppress = ["strictDependencies"],
      strip_prefix = "package",
      path = "/mocha",
  )

  web_library_external(
      name = "org_npmjs_registry_sinon",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "49edb057695fc9019aae992bf7e677a07de7c6ce2bf9f9facde4a245045d1532",
      urls = [
          "https://mirror.bazel.build/registry.npmjs.org/sinon/-/sinon-1.17.4.tgz",
          "https://registry.npmjs.org/sinon/-/sinon-1.17.4.tgz",
      ],
      strip_prefix = "package/pkg",
      path = "/sinonjs",
  )

  web_library_external(
      name = "org_npmjs_registry_sinon_chai",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "b85fc56f713832960b56fe9269ee4bb2cd41edd2ceb130b0936e5bdbed5dea63",
      urls = [
          "https://mirror.bazel.build/registry.npmjs.org/sinon-chai/-/sinon-chai-2.8.0.tgz",
          "https://registry.npmjs.org/sinon-chai/-/sinon-chai-2.8.0.tgz",
      ],
      strip_prefix = "package",
      path = "/sinon-chai",
  )

  web_library_external(
      name = "org_npmjs_registry_stacky",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "c659e60f7957d9d80c23a7aacc4d71b19c6421a08f91174c0062de369595acae",
      urls = [
          "https://mirror.bazel.build/registry.npmjs.org/stacky/-/stacky-1.3.1.tgz",
          "https://registry.npmjs.org/stacky/-/stacky-1.3.1.tgz",
      ],
      strip_prefix = "package",
      path = "/stacky",
  )

  web_library_external(
      name = "org_npmjs_registry_web_component_tester",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "9d4ebd4945df8a936916d4d32b7f280f2a3afa35f79e7ca8ad3ed0a42770c537",
      urls = [
          "https://mirror.bazel.build/registry.npmjs.org/web-component-tester/-/web-component-tester-4.3.6.tgz",
          "https://registry.npmjs.org/web-component-tester/-/web-component-tester-4.3.6.tgz",
      ],
      strip_prefix = "package",
      path = "/web-component-tester",
      suppress = [
          "absolutePaths",
          "strictDependencies",
      ],
      deps = [
          "@com_lodash",
          "@org_npmjs_registry_accessibility_developer_tools",
          "@org_npmjs_registry_async",
          "@org_npmjs_registry_chai",
          "@org_npmjs_registry_mocha",
          "@org_npmjs_registry_sinon",
          "@org_npmjs_registry_sinon_chai",
          "@org_npmjs_registry_stacky",
          "@org_polymer_test_fixture",
      ],
  )

  web_library_external(
      name = "org_polymer_test_fixture",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "59d6cfb1187733b71275becfea181fe0aa1f734df5ff77f5850c806bbbf9a0d9",
      strip_prefix = "test-fixture-2.0.1",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/test-fixture/archive/v2.0.1.tar.gz",
          "https://github.com/PolymerElements/test-fixture/archive/v2.0.1.tar.gz",
      ],
      path = "/test-fixture",
      exclude = ["test/**"],
  )

  filegroup_external(
      name = "org_tensorflow_tfjs",
      licenses = ["notice"],  # Apache 2.0
      sha256_urls = {
          "fccd26db2da462ec48e2d90fbdff1ee9a9d740f2c7efbd9789ba46eb98ecd1ae": [
              "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@0.11.5/dist/tf.min.js",
          ],
      },
  )
