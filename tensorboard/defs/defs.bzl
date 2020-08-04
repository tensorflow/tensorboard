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

load("@npm_bazel_rollup//:index.bzl", "rollup_bundle")
load("@npm_bazel_karma//:index.bzl", "karma_web_test_suite")
load("@npm_bazel_typescript//:index.bzl", "ts_config", "ts_devserver", "ts_library")
load("@io_bazel_rules_sass//:defs.bzl", "sass_binary", "sass_library")

def tensorboard_webcomponent_library(**kwargs):
    """Rules referencing this will be deleted from the codebase soon."""
    pass

def tf_js_binary(compile, deps, **kwargs):
    """Rules for creating a JavaScript bundle.

    Please refer to https://bazelbuild.github.io/rules_nodejs/Built-ins.html#rollup_bundle
    for more details.
    """

    # `compile` option is used internally but is not used by rollup_bundle.
    # Discard it.
    rollup_bundle(
        config_file = "//tensorboard/defs:rollup_config.js",
        deps = deps + [
            "@npm//@rollup/plugin-commonjs",
            "@npm//@rollup/plugin-node-resolve",
        ],
        format = "iife",
        **kwargs
    )

def tf_ts_config(**kwargs):
    """TensorBoard wrapper for the rule for a TypeScript configuration."""

    ts_config(**kwargs)

def tf_ts_library(strict_checks = True, tsconfig = None, **kwargs):
    """TensorBoard wrapper for the rule for a TypeScript library.

    Args:
      strict_checks: whether to enable stricter type checking. Default is True.
          Please use `strict_checks = False` for only Polymer based targets.
      tsconfig: TypeScript configuration. If specified, it overrides strict_checks.
      **kwargs: keyword arguments to ts_library build rule.
    """
    if not tsconfig:
        tsconfig = "//:tsconfig.json" if strict_checks else "//:tsconfig-lax"

    ts_library(tsconfig = tsconfig, **kwargs)

def tf_ts_devserver(**kwargs):
    """TensorBoard wrapper for the rule for a TypeScript dev server."""

    ts_devserver(**kwargs)

def tf_ng_web_test_suite(runtime_deps = [], bootstrap = [], deps = [], **kwargs):
    """TensorBoard wrapper for the rule for a Karma web test suite.

    It has Angular specific configurations that we want as defaults.
    """

    kwargs.setdefault("tags", []).append("webtest")
    karma_web_test_suite(
        srcs = [],
        bootstrap = bootstrap + [
            "@npm//:node_modules/zone.js/dist/zone-testing-bundle.js",
            "@npm//:node_modules/reflect-metadata/Reflect.js",
            "@npm//:node_modules/@angular/localize/bundles/localize-init.umd.js",
        ],
        runtime_deps = runtime_deps + [
            "//tensorboard/webapp/testing:initialize_testbed",
        ],
        deps = deps + [
            "//tensorboard/webapp/testing:test_support_lib",
        ],
        **kwargs
    )

def tf_svg_bundle(name, srcs, out):
    native.genrule(
        name = name,
        srcs = srcs,
        outs = [out],
        cmd = "$(execpath //tensorboard/tools:mat_bundle_icon_svg) $@ $(SRCS)",
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
