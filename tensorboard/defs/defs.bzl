# Copyright 2016 The TensorFlow Authors. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
"""External-only delegates for various BUILD rules."""

load("@npm//@bazel/rollup:index.bzl", "rollup_bundle")
load("@npm//@bazel/concatjs:index.bzl", "karma_web_test_suite")
load("@npm//@bazel/typescript:index.bzl", "ts_config", "ts_library")
load("@io_bazel_rules_sass//:defs.bzl", "npm_sass_library", "sass_binary", "sass_library")
load("@npm//@bazel/terser:index.bzl", "terser_minified")
load("//tensorboard/defs/internal:js.bzl", _tf_dev_js_binary = "tf_dev_js_binary")

tf_dev_js_binary = _tf_dev_js_binary

def tensorboard_webcomponent_library(**kwargs):
    """Rules referencing this will be deleted from the codebase soon."""
    pass

def tf_js_binary(
        name,
        compile,
        deps,
        visibility = None,
        dev_mode_only = False,
        includes_polymer = False,
        **kwargs):
    """Rules for creating a JavaScript bundle.

    Args:
        name: Name of the target.
        compile: whether to compile when bundling. Only used internally.
        deps: dependencies of the js_binary.
        visibility: visibility of the target.
        dev_mode_only: whether the binary is for development. When True, it will
          omit the Terser.
        includes_polymer: whether this binary contains Polymer. Only used
          internally.
        **kwargs: keyword arguments to rollup_bundle. Please refer to
          https://bazelbuild.github.io/rules_nodejs/Built-ins.html#rollup_bundle
          for more details.
    """

    # `compile` option is used internally but is not used by rollup_bundle.
    # Discard it.
    internal_rollup_name = name + "_rollup_internal_dbg"
    rollup_bundle(
        name = internal_rollup_name,
        config_file = "//tensorboard/defs:rollup_config.js",
        # Must pass `true` here specifically, else the input file argument to
        # Rollup (appended by `rollup_binary`) is interpreted as a value for
        # the preceding option.
        args = ["--failAfterWarnings", "true", "--silent", "true"],
        deps = deps + [
            "@npm//@rollup/plugin-commonjs",
            "@npm//@rollup/plugin-node-resolve",
        ],
        format = "iife",
        sourcemap = "false",
        visibility = ["//visibility:private"],
        **kwargs
    )

    if dev_mode_only:
        internal_result_name = internal_rollup_name
    else:
        internal_result_name = name + "_terser_internal_min"
        terser_minified(
            name = internal_result_name,
            src = internal_rollup_name,
            # Notes about the terser config:
            # compress.passes - this is set to '1' to workaround issue with
            #   terser and threejs. In practice it (surprisingly) generates
            #   smaller results than when it was previously set to '3'.
            config_file = "//tensorboard/defs:terser_config.json",
            visibility = ["//visibility:private"],
            sourcemap = False,
        )

    # For some reason, terser_minified is not visible from other targets. Copy
    # or re-export seems to work okay.
    native.genrule(
        name = name,
        srcs = [internal_result_name],
        outs = [name + ".js"],
        visibility = visibility,
        cmd = "cat $(SRCS) > $@",
    )

def tf_ts_config(**kwargs):
    """TensorBoard wrapper for the rule for a TypeScript configuration."""

    ts_config(**kwargs)

def tf_ts_library(strict_checks = True, **kwargs):
    """TensorBoard wrapper for the rule for a TypeScript library.

    Args:
      strict_checks: whether to enable stricter type checking. Default is True.
          Please use `strict_checks = False` for only Polymer based targets.
      **kwargs: keyword arguments to ts_library build rule.
    """
    tsconfig = "//:tsconfig.json"

    if strict_checks == False:
        tsconfig = "//:tsconfig-lax"
    elif "test_only" in kwargs and kwargs.get("test_only"):
        tsconfig = "//:tsconfig-test"
    kwargs.setdefault("deps", []).extend(["@npm//tslib", "//tensorboard/defs:strict_types"])

    ts_library(tsconfig = tsconfig, supports_workers = True, **kwargs)

def tf_ng_web_test_suite(runtime_deps = [], bootstrap = [], deps = [], **kwargs):
    """TensorBoard wrapper for the rule for a Karma web test suite.

    It has Angular specific configurations that we want as defaults.
    """

    kwargs.setdefault("tags", []).append("webtest")
    karma_web_test_suite(
        srcs = [
            "//tensorboard/webapp/testing:require_js_karma_config.js",
        ],
        bootstrap = bootstrap + [
            "@npm//:node_modules/zone.js/dist/zone-testing-bundle.js",
            "@npm//:node_modules/reflect-metadata/Reflect.js",
            "@npm//:node_modules/@angular/localize/bundles/localize-init.umd.js",
        ],
        runtime_deps = runtime_deps + [
            "//tensorboard/webapp/testing:initialize_testbed",
        ],
        deps = deps + [
            "//tensorboard/defs/internal:common_umd_lib",
        ],
        # Lodash runtime dependency that is compatible with requirejs for karma.
        static_files = [
            "@npm//:node_modules/@tensorflow/tfjs-core/dist/tf-core.js",
            "@npm//:node_modules/@tensorflow/tfjs-backend-cpu/dist/tf-backend-cpu.js",
            "@npm//:node_modules/@tensorflow/tfjs-backend-webgl/dist/tf-backend-webgl.js",
            "@npm//:node_modules/umap-js/lib/umap-js.js",
            # tfjs-backend-cpu only uses alea.
            # https://github.com/tensorflow/tfjs/blob/bca336cd8297cb733e3ddcb3c091eac2eb4d5fc5/tfjs-backend-cpu/src/kernels/Multinomial.ts#L58
            "@npm//:node_modules/seedrandom/lib/alea.js",
            "@npm//:node_modules/lodash/lodash.js",
            "@npm//:node_modules/d3/dist/d3.js",
            "@npm//:node_modules/three/build/three.js",
            "@npm//:node_modules/dagre/dist/dagre.js",
            "@npm//:node_modules/marked/lib/marked.js",
        ],
        **kwargs
    )

def tf_svg_bundle(name, srcs, out):
    native.genrule(
        name = name,
        srcs = srcs,
        outs = [out],
        cmd = "$(execpath //tensorboard/tools:mat_bundle_icon_svg) $(SRCS) > $@",
        tools = [
            "//tensorboard/tools:mat_bundle_icon_svg",
        ],
    )

def tf_sass_binary(deps = [], include_paths = [], **kwargs):
    """TensorBoard wrap for declaring SASS binary.

    It adds dependency on theme by default then add include Angular material
    theme library paths for better node_modules library resolution.
    """
    sass_binary(
        deps = deps + ["//tensorboard/webapp/theme"],
        include_paths = include_paths + [
            "external/npm/node_modules",
        ],
        sourcemap = False,
        **kwargs
    )

def tf_sass_library(**kwargs):
    """TensorBoard wrap for declaring SASS library.

    It re-exports the sass_libray symbol so users do not have to depend on
    "@io_bazel_rules_sass//:defs.bzl".
    """
    sass_library(
        **kwargs
    )

def tf_external_sass_libray(**kwargs):
    """TensorBoard wrapper for declaring external SASS dependency.

    When an external (NPM) package have SASS files that has `import` statements,
    TensorBoard has to depdend on them very specifically. This rule allows SASS
    modules in NPM packages to be built properly.
    """
    npm_sass_library(
        **kwargs
    )

def tf_ng_module(assets = [], **kwargs):
    """TensorBoard wrapper for Angular modules."""
    ts_library(
        compiler = "//tensorboard/defs:tsc_wrapped_with_angular",
        supports_workers = True,
        use_angular_plugin = True,
        angular_assets = assets,
        **kwargs
    )

def tf_inline_pngs(name, html_template, images, out):
    """Inline png images in html.

    Replaces %<file_basename>.png% in the input `html_template` with a data URI
    containing the base64-encoded image content of the corresopnding .png files
    in the `images` input.

    In case there is a collision in the base file name, the first instance will
    take precedence over the others.

    Example:
    # In html_template:
    <img src="%my_file.png%" />

    # In BUILD:
    tf_inline_pngs(
        name = "my_rule",
        html_template = "path_to_my_template.html",
        images = [
            "path_to/my_file.png",
        ] + glob("some_folder/*.png"),
        out = "my_filename.html",
    )

   Args:
     name: Name of the rule.
     html_template: Name of the uninlined .html file.
     images: .png `images` input to be inlined.
     out: Name of the output (inlined) .html file.
    """
    native.genrule(
        name = name,
        srcs = [html_template] + images,
        outs = [out],
        cmd = "$(execpath //tensorboard/defs:inline_images) $(SRCS) >'$@'",
        exec_tools = ["//tensorboard/defs:inline_images"],
    )
