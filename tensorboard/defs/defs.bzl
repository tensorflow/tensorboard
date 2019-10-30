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

load("@build_bazel_rules_nodejs//:defs.bzl", "rollup_bundle")
load("@npm_bazel_karma//:defs.bzl", "karma_web_test_suite")
load("@npm_bazel_typescript//:index.bzl", "ts_config", "ts_devserver", "ts_library")

def tensorboard_webcomponent_library(**kwargs):
    """Rules referencing this will be deleted from the codebase soon."""
    pass

def tf_js_binary(compile, **kwargs):
    """Rules for creating a JavaScript bundle.

    Please refer to https://bazelbuild.github.io/rules_nodejs/Built-ins.html#rollup_bundle
    for more details.
    """

    # `compile` option is used internally but is not used by rollup_bundle.
    # Discard it.
    rollup_bundle(**kwargs)

def tf_ts_config(**kwargs):
    """TensorBoard wrapper for the rule for a TypeScript configuration."""

    ts_config(**kwargs)

def tf_ts_library(**kwargs):
    """TensorBoard wrapper for the rule for a TypeScript library."""

    ts_library(**kwargs)

def tf_ts_devserver(**kwargs):
    """TensorBoard wrapper for the rule for a TypeScript dev server."""

    ts_devserver(**kwargs)

def tf_ng_web_test_suite(runtime_deps = [], bootstrap = [], deps = [], **kwargs):
    """TensorBoard wrapper for the rule for a Karma web test suite.

    It has Angular specific configurations that we want as defaults.
    """

    karma_web_test_suite(
        srcs = [],
        bootstrap = bootstrap + [
            "@npm//:node_modules/zone.js/dist/zone-testing-bundle.js",
            "@npm//:node_modules/reflect-metadata/Reflect.js",
        ],
        runtime_deps = runtime_deps + [
            "//tensorboard/components/tf_ng_tensorboard/testing:initialize_testbed",
        ],
        deps = deps + [
            "//tensorboard/components/tf_ng_tensorboard/testing:test_support_lib",
        ],
        **kwargs
    )
