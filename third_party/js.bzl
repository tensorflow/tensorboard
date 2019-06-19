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
load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")
load("@io_bazel_rules_closure//closure:defs.bzl", "filegroup_external")
load("@io_bazel_rules_closure//closure:defs.bzl", "web_library_external")


def tensorboard_js_workspace():
  """TensorBoard JavaScript dependencies."""

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
              "http://mirror.tensorflow.org/nodejs.org/dist/v6.9.1/node-v6.9.1-darwin-x64.tar.xz",
              "http://nodejs.org/dist/v6.9.1/node-v6.9.1-darwin-x64.tar.xz",
          ],
      },
      sha256_urls_windows = {
          "1914bfb950be8d576ce9e49c8a0e51c9f2402560fe3c19093e69bc1306a56e9e": [
              "http://mirror.tensorflow.org/raw.githubusercontent.com/nodejs/node/v6.9.1/LICENSE",
              "https://raw.githubusercontent.com/nodejs/node/v6.9.1/LICENSE",
          ],
          "513923b0490ebb7466a56483a62595814ed9d036d6f35476debb0cd606bec526": [
              "http://mirror.tensorflow.org/nodejs.org/dist/v6.9.1/win-x64/node.exe",
              "http://nodejs.org/dist/v6.9.1/win-x64/node.exe",
          ],
          "3951aefa4afd6fb836ab06468b1fc2a69fa75bd66ec2f5a0e08c4e32547681e3": [
              "http://mirror.tensorflow.org/nodejs.org/dist/v6.9.1/win-x64/node.lib",
              "http://nodejs.org/dist/v6.9.1/win-x64/node.lib",
          ],
      },
      sha256_urls_extract = {
          "d4eb161e4715e11bbef816a6c577974271e2bddae9cf008744627676ff00036a": [
              "http://mirror.tensorflow.org/nodejs.org/dist/v6.9.1/node-v6.9.1-linux-x64.tar.xz",
              "http://nodejs.org/dist/v6.9.1/node-v6.9.1-linux-x64.tar.xz",
          ],
      },
      sha256_urls_extract_ppc64le = {
          "6f6362cba63c20eab4914c2983edd9699c1082792d0a35ef9c54d18b6c488e59": [
              "http://nodejs.org/dist/v6.9.1/node-v6.9.1-linux-ppc64le.tar.xz",
          ],
      },
      strip_prefix = {
          "node-v6.9.1-darwin-x64.tar.xz": "node-v6.9.1-darwin-x64",
          "node-v6.9.1-linux-x64.tar.xz": "node-v6.9.1-linux-x64",
          "node-v6.9.1-linux-ppc64le.tar.xz": "node-v6.9.1-linux-ppc64le",
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
              "http://mirror.tensorflow.org/raw.githubusercontent.com/Microsoft/TypeScript/v2.7.2/LICENSE.txt",
              "https://raw.githubusercontent.com/Microsoft/TypeScript/v2.9.2/LICENSE.txt",
          ],
          "9632bfccde117a8c82690a324bc5c18c3869e9b89ac536fc134ba655d7ec1e98": [
              "http://mirror.tensorflow.org/raw.githubusercontent.com/Microsoft/TypeScript/v2.9.2/lib/tsc.js",
              "https://raw.githubusercontent.com/Microsoft/TypeScript/v2.9.2/lib/tsc.js",
          ],
          "529c9f8b45939e0fa80950208bf80452ccb982b460cc25433813c919b67a3b2f": [
              "http://mirror.tensorflow.org/raw.githubusercontent.com/Microsoft/TypeScript/v2.9.2/lib/lib.es6.d.ts",
              "https://raw.githubusercontent.com/Microsoft/TypeScript/v2.9.2/lib/lib.es6.d.ts",
          ],
          "f6e6efe57fb9fcf72eed013e2755d04505300f32b78577118ca5dacc85ec852d": [
              "http://mirror.tensorflow.org/raw.githubusercontent.com/Microsoft/TypeScript/v2.9.2/lib/lib.dom.d.ts",
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

  http_archive(
      name = "io_angular_clutz",
      build_file = str(Label("//third_party:clutz.BUILD")),
      sha256 = "632c33e8c1e4ba4b26954edb5a0d4d64edcff774bd57dd4ab4b590d3bbb43612",
      strip_prefix = "clutz-6c8a2bd68dec3f2bbacae288e42d82ca4567b93f",
      urls = [
          "http://mirror.tensorflow.org/github.com/angular/clutz/archive/6c8a2bd68dec3f2bbacae288e42d82ca4567b93f.tar.gz",  # 2019-05-17
          "https://github.com/angular/clutz/archive/6c8a2bd68dec3f2bbacae288e42d82ca4567b93f.tar.gz",
      ],
  )

  filegroup_external(
      name = "com_google_javascript_closure_compiler_externs",
      licenses = ["notice"],  # Apache 2.0
      sha256_urls_extract = {
          "4f0cc3cf9928905993072bdd1f81a4444bd8b7fff0a12f119e2dd2a9a68cdd82": [
              # tag v20190513 resolves to commit 938e347e4f79f4d7b124e160145b6ea3418b4c56 (2019-05-13 16:28:32 -0700)
              "http://mirror.tensorflow.org/github.com/google/closure-compiler/archive/v20190513.tar.gz",
              "https://github.com/google/closure-compiler/archive/v20190513.tar.gz",
          ],
      },
      strip_prefix = {"v20190513.tar.gz": "closure-compiler-20190513/externs"},
  )

  filegroup_external(
      name = "com_google_javascript_closure_compiler_externs_polymer",
      licenses = ["notice"],  # Apache 2.0
      sha256_urls = {
          "737af73d7b02226e6e1516044a8eb8283376d44f64839979936ca163c00900f4": [
              "http://mirror.tensorflow.org/raw.githubusercontent.com/google/closure-compiler/v20180402/contrib/externs/polymer-1.0.js",
              "https://raw.githubusercontent.com/google/closure-compiler/v20180402/contrib/externs/polymer-1.0.js",
          ],
      },
  )

  filegroup_external(
      name = "org_threejs",
      # no @license header
      licenses = ["notice"],  # MIT
      sha256_urls = {
          "90f3af9ebfaf34f642b05f3baeeca2c5547d1b8ba6872803990c26804f4067b1": [
              "http://mirror.tensorflow.org/raw.githubusercontent.com/mrdoob/three.js/r104/LICENSE",
              "https://raw.githubusercontent.com/mrdoob/three.js/r104/LICENSE",
          ],
          "40873d04d4ace1529c503b10053fe6c09c04e8ba4a1eaacb07a1ea17fa073368": [
              "http://mirror.tensorflow.org/raw.githubusercontent.com/mrdoob/three.js/r104/build/three.js",
              "https://raw.githubusercontent.com/mrdoob/three.js/r104/build/three.js",
          ],
          "f495c87a34ac1bf238e245c60e9fed2ec831cefbb9dc29e17b91e24b5ef6559b": [
              "http://mirror.tensorflow.org/raw.githubusercontent.com/mrdoob/three.js/r104/examples/js/controls/OrbitControls.js",
              "https://raw.githubusercontent.com/mrdoob/three.js/r104/examples/js/controls/OrbitControls.js",
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
          "http://mirror.tensorflow.org/github.com/lodash/lodash/archive/4.17.5.tar.gz",
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
              "http://mirror.tensorflow.org/raw.githubusercontent.com/sloisel/numeric/v1.2.6/license.txt",
              "https://raw.githubusercontent.com/sloisel/numeric/v1.2.6/license.txt",
          ],
          "5dcaba2016fd237091e3a17b0dc272fb21f0e2b15d7628f95a0ad0cd4cdf4020": [
              "http://mirror.tensorflow.org/cdnjs.cloudflare.com/ajax/libs/numeric/1.2.6/numeric.js",
              "https://cdnjs.cloudflare.com/ajax/libs/numeric/1.2.6/numeric.js",
          ],
      },
      rename = {"numeric-1.2.6.js": "numeric.js"},
  )

  filegroup_external(
      name = "ai_google_pair_umap_js",
      # no @license header
      licenses = ["notice"],  # Apache License 2.0
      sha256_urls = {
          "85a2ff924f1bf4757976aca22fd0efb045d9b3854f5a4ae838c64e4d11e75005": [
              "http://mirror.tensorflow.org/unpkg.com/umap-js@1.0.5/lib/umap-js.min.js",
              "https://unpkg.com/umap-js@1.0.5/lib/umap-js.min.js",
          ],
      },
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
              "http://mirror.tensorflow.org/registry.npmjs.org/plottable/-/plottable-3.7.0.tgz",
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
              "http://mirror.tensorflow.org/raw.githubusercontent.com/cpettitt/dagre/v0.8.2/LICENSE",
              "https://raw.githubusercontent.com/cpettitt/dagre/v0.8.2/LICENSE",
          ],
          "43cb4e919196c177c149b63880d262074670af99db6a1e174b25e266da4935a9": [
              "http://mirror.tensorflow.org/raw.githubusercontent.com/cpettitt/dagre/v0.8.2/dist/dagre.core.js",
              "https://raw.githubusercontent.com/cpettitt/dagre/v0.8.2/dist/dagre.core.js",
          ],
      },
  )

  filegroup_external(
      name = "io_github_cpettitt_graphlib",
      licenses = ["notice"],  # MIT
      sha256_urls = {
          "6a349742a6cb219d5a2fc8d0844f6d89a6efc62e20c664450d884fc7ff2d6015": [
              "http://mirror.tensorflow.org/raw.githubusercontent.com/cpettitt/graphlib/v2.1.5/LICENSE",
              "https://raw.githubusercontent.com/cpettitt/graphlib/v2.1.5/LICENSE",
          ],
          "ddc33a6aaf955ee24b0e0d30110adf350c65eedc5c0f2c424ca85bc128199a66": [
              "http://mirror.tensorflow.org/raw.githubusercontent.com/cpettitt/graphlib/v2.1.5/dist/graphlib.core.js",
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
              "http://mirror.tensorflow.org/raw.githubusercontent.com/waylonflinn/weblas/v0.9.0/LICENSE",
              "https://raw.githubusercontent.com/waylonflinn/weblas/v0.9.0/LICENSE",
          ],
          "f138fce57f673ca8a633f4aee5ae5b6fcb6ad0de59069a42a74e996fd04d8fcc": [
              "http://mirror.tensorflow.org/raw.githubusercontent.com/waylonflinn/weblas/v0.9.0/dist/weblas.js",
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
              "http://mirror.tensorflow.org/github.com/d3/d3/releases/download/v5.7.0/d3.zip",
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
              "http://mirror.tensorflow.org/raw.githubusercontent.com/catapult-project/catapult/2f7ee994984f3ebd3dd3dc3e05777bf180ec2ee8/LICENSE",
              "https://raw.githubusercontent.com/catapult-project/catapult/2f7ee994984f3ebd3dd3dc3e05777bf180ec2ee8/LICENSE",
          ],
          "b1f0195f305ca66fdb7dae264771f162ae03f04aa642848f15cd871c043e04d1": [
              "http://mirror.tensorflow.org/raw.githubusercontent.com/catapult-project/catapult/237aea8b58a37a2991318b6a0db60d84078e5f7e/trace_viewer_full.html",
              "https://raw.githubusercontent.com/catapult-project/catapult/237aea8b58a37a2991318b6a0db60d84078e5f7e/trace_viewer_full.html"  # 2017-06-19
          ],
      },
  )

  http_archive(
      name = "ai_google_pair_facets",
      sha256 = "e3f7b7b3c194c1772d16bdc8b348716c0da59a51daa03ef4503cf06c073caafc",
      strip_prefix = "facets-0.2.1",
      urls = [
          "http://mirror.tensorflow.org/github.com/pair-code/facets/archive/0.2.1.tar.gz",
          "https://github.com/pair-code/facets/archive/0.2.1.tar.gz",
      ],
  )
  web_library_external(
      name = "vaadin_vaadin_split_layout",
      licenses = ["notice"],  # Apache License 2.0
      sha256 = "44fb83628edb77cb8392c165d4d99734750a6fbb00e5391f033962e56f14eba3",
      urls = [
          "http://mirror.tensorflow.org/github.com/vaadin/vaadin-split-layout/archive/v1.1.0.tar.gz",
          "https://github.com/vaadin/vaadin-split-layout/archive/v1.1.0.tar.gz",
      ],
      srcs = ["vaadin-split-layout.html"],
      deps = [
          "@org_polymer",
          "@org_polymer_iron_resizable_behavior",
      ],
      strip_prefix = "vaadin-split-layout-1.1.0",
      path = "/vaadin-split-layout",
  )

  web_library_external(
      name = "vaadin_vaadin_grid",
      licenses = ["notice"],  # Apache License 2.0
      sha256 = "834679bedc1b6bafecac7e7f0e3458d99ace6cddbf154c56631ef6428b787fd1",
      urls = [
          "http://mirror.tensorflow.org/github.com/vaadin/vaadin-grid/archive/v3.0.2.tar.gz",
          "https://github.com/vaadin/vaadin-grid/archive/v3.0.2.tar.gz",
      ],
      glob = ["*.html"],
      exclude = [
          "index.html",
      ],
      deps = [
          "@org_polymer_iron_resizable_behavior",
          "@org_polymer_iron_scroll_target_behavior",
          "@org_polymer_iron_a11y_keys_behavior",
          "@org_polymer_iron_a11y_announcer",
          "@org_polymer",
      ],
      strip_prefix = "vaadin-grid-3.0.2",
      path = "/vaadin-grid",
  )

  ##############################################################################
  # TensorBoard Testing Dependencies

  web_library_external(
      name = "org_npmjs_registry_accessibility_developer_tools",
      licenses = ["notice"],  # Apache License 2.0
      sha256 = "1d6a72f401c9d53f68238c617dd43a05cd85ca5aa2e676a5b3c352711448e093",
      urls = [
          "http://mirror.tensorflow.org/registry.npmjs.org/accessibility-developer-tools/-/accessibility-developer-tools-2.10.0.tgz",
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
          "http://mirror.tensorflow.org/registry.npmjs.org/async/-/async-1.5.0.tgz",
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
          "http://mirror.tensorflow.org/registry.npmjs.org/chai/-/chai-3.5.0.tgz",
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
          "http://mirror.tensorflow.org/registry.npmjs.org/mocha/-/mocha-2.5.3.tgz",
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
          "http://mirror.tensorflow.org/registry.npmjs.org/sinon/-/sinon-1.17.4.tgz",
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
          "http://mirror.tensorflow.org/registry.npmjs.org/sinon-chai/-/sinon-chai-2.8.0.tgz",
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
          "http://mirror.tensorflow.org/registry.npmjs.org/stacky/-/stacky-1.3.1.tgz",
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
          "http://mirror.tensorflow.org/registry.npmjs.org/web-component-tester/-/web-component-tester-4.3.6.tgz",
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
          "http://mirror.tensorflow.org/github.com/PolymerElements/test-fixture/archive/v2.0.1.tar.gz",
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

  filegroup_external(
      name = "org_tensorflow_graphics_lib",
      licenses = ["notice"],  # MIT
      sha256_urls = {
          "5a9cd221f6727b7524ba6b63bdc0355843c42a238d3f83df980005c7cb270a92": [
              "http://mirror.tensorflow.org/raw.githubusercontent.com/tensorflow/graphics/cd8c42f9ca260f77c6acfecd42e66ef01d1a3766/tensorflow_graphics/tensorboard/mesh_visualizer/tf_mesh_dashboard/array-buffer-data-provider.js",
              "https://raw.githubusercontent.com/tensorflow/graphics/cd8c42f9ca260f77c6acfecd42e66ef01d1a3766/tensorflow_graphics/tensorboard/mesh_visualizer/tf_mesh_dashboard/array-buffer-data-provider.js",
          ],
          "bc7e983aae707e2d8dc0ca6406e3779e4ad73c537a02bed6d3d3d40180f26904": [
              "http://mirror.tensorflow.org/raw.githubusercontent.com/tensorflow/graphics/cd8c42f9ca260f77c6acfecd42e66ef01d1a3766/tensorflow_graphics/tensorboard/mesh_visualizer/tf_mesh_dashboard/mesh-viewer.js",
              "https://raw.githubusercontent.com/tensorflow/graphics/cd8c42f9ca260f77c6acfecd42e66ef01d1a3766/tensorflow_graphics/tensorboard/mesh_visualizer/tf_mesh_dashboard/mesh-viewer.js",
          ],
      },
  )
