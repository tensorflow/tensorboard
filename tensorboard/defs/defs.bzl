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
load("@build_bazel_rules_nodejs//:defs.bzl", "rollup_bundle")
load("@npm_bazel_typescript//:index.bzl", "ts_devserver", "ts_library")

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

def tf_ts_library(**kwargs):
    """TensorBoard wrapper for the rule for a TypeScript library."""

    # ts_library doesn't have the tsconfig argument internally, but does
    # have it externally.
    ts_library(**kwargs)

def tf_ts_devserver(**kwargs):
    """TensorBoard wrapper for the rule for a TypeScript dev server."""

    # ts_devserver doesn't have the entry_module or index_html internally,
    # but does have those externally.
    ts_devserver(**kwargs)
