# Copyright 2026 The TensorFlow Authors. All Rights Reserved.
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

"""Compatibility helpers for Sass sources provided by legacy yarn_install."""

load("@build_bazel_rules_nodejs//:providers.bzl", "ExternalNpmPackageInfo")
load("@io_bazel_rules_sass//sass:defs.bzl", "SassInfo")

def _is_sass_file(file):
    return file.extension in ("css", "sass", "scss")

def _npm_sass_library_impl(ctx):
    sources = depset([
        file
        for dep in ctx.attr.deps
        for file in dep[ExternalNpmPackageInfo].sources.to_list()
        if _is_sass_file(file)
    ])
    return [
        DefaultInfo(
            files = sources,
            runfiles = ctx.runfiles(transitive_files = sources),
        ),
        SassInfo(transitive_sources = sources),
    ]

npm_sass_library = rule(
    implementation = _npm_sass_library_impl,
    attrs = {
        "deps": attr.label_list(
            mandatory = True,
            providers = [ExternalNpmPackageInfo],
        ),
    },
)
