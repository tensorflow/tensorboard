# Copyright 2021 The TensorFlow Authors. All Rights Reserved.
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
"""JavaScript related TensorBoard build rules."""

load("@bazel_skylib//lib:paths.bzl", "paths")
load("@build_bazel_rules_nodejs//:providers.bzl", "JSNamedModuleInfo", "NpmPackageInfo", "node_modules_aspect")

def _tf_dev_js_binary_impl(ctx):
    files_depsets = []

    bootstrap_and_deps = ctx.attr._ambient_deps + ctx.attr.deps
    for dep in bootstrap_and_deps:
        if JSNamedModuleInfo in dep:
            # Collect UMD modules compiled by tf_ts_library
            files_depsets.append(dep[JSNamedModuleInfo].sources)
        elif NpmPackageInfo not in dep and hasattr(dep, "files"):
            # Collect manually specified files or File from npm dependencies. It omits
            # package.json (i.e., ones in `NpmPackageInfo`).
            files_depsets.append(dep.files)

    for target in ctx.attr._anonymous_umd_deps:
        file = target.files.to_list()[0]
        module_name = ctx.attr._anonymous_umd_deps[target]
        named_file = ctx.actions.declare_file(file.path + ".named_umd.js")

        # Patch anonymous umd modules to have named in their declarations. For instance,
        # it converts `define(['exports'], ...` to `define('d3', ['exports'], ...`.
        # `define`'s argument behaves differently based on arity. For instance:
        # 1: expects the argument to be a factory function to be invoked. Anonymous and
        #    no dependency.
        # 2: expects an array then a function. First arguments define dependencies to be
        #    injected into the factory. Anonymous with dependencies.
        # 3: expects string, an array, then, a function. First argument is name of the
        #    module. Named module with deps.
        ctx.actions.expand_template(
            template = file,
            output = named_file,
            substitutions = {
                # d3, three, umap-js, and tfjs
                "define([": "define('%s', [" % module_name,
                # Lodash
                "define(function()": "define('%s', function()" % module_name,
                # Zone.js
                "define(factory": "define('%s', factory" % module_name,
            },
            is_executable = False,
        )
        files_depsets.append(depset([named_file]))

    files = depset(transitive = files_depsets)

    file_list = files.to_list()

    concat_command = """
        output="$1" && shift
        entry_point="$1" && shift
        {
            awk 'BEGINFILE { print "// file: " FILENAME } { print }' "$@"
            printf ';require(["%s"]);\n' "${entry_point}"
        } >"${output}"
    """

    entry_point_module_name = _get_module_name(ctx, ctx.file.entry_point)

    concat_args = (
        [ctx.outputs.js.path, entry_point_module_name] +
        [file.path for file in file_list]
    )

    ctx.actions.run_shell(
        mnemonic = "ConcatJs",
        progress_message = "concatenating JavaScript files from dependencies",
        inputs = file_list,
        outputs = [ctx.outputs.js],
        command = concat_command,
        arguments = concat_args,
    )

def _get_module_name(ctx, entry_point_file):
    path_without_ext = paths.replace_extension(entry_point_file.short_path, "")
    return ctx.workspace_name + "/" + path_without_ext

tf_dev_js_binary = rule(
    _tf_dev_js_binary_impl,
    attrs = {
        "deps": attr.label_list(
            aspects = [node_modules_aspect],
            doc = """Targets that produce JavaScript, such as tf_ts_library, are
            dependencies of the application.""",
            mandatory = True,
        ),
        "entry_point": attr.label(
            allow_single_file = [".ts"],
            doc = """A module that should be executed as script gets parsed. Generally
            entry to the application.""",
            mandatory = True,
        ),
        # Due to the nature of Angular and certain libraries, they assume presence of
        # library in the bundle. Dependencies appearing in `_ambient_deps` are loaded
        # before the `deps`.
        "_ambient_deps": attr.label_list(
            default = [
                "@npm//:node_modules/requirejs/require.js",
                ":common_umd_lib",
                "@npm//:node_modules/reflect-metadata/Reflect.js",
                "@npm//:node_modules/@angular/localize/bundles/localize-init.umd.js",
            ],
            allow_files = True,
        ),
        # Libraries like d3 and lodash export UMD compatible bundled in their node_modules
        # but they are using "anonymous module" of requirejs. Anonymous module is where
        # you define a module without a name (e.g., `define(factory) or
        # `define([dep1], factory)`). They are often intended to be loaded via
        # `<script src="<path_to_lib>.js" data-requiremodule="<lib-name>"`. This is a bit
        # cumbersome in our bundling strategy so it gets monkey patched to use named
        # modules instead.
        "_anonymous_umd_deps": attr.label_keyed_string_dict(
            default = {
                "@npm//:node_modules/lodash/lodash.js": "lodash",
                "@npm//:node_modules/d3/dist/d3.js": "d3",
                "@npm//:node_modules/three/build/three.js": "three",
                "@npm//:node_modules/zone.js/dist/zone.js": "zone.js/dist/zone.js",
                "@npm//:node_modules/marked/marked.min.js": "marked",
                "@npm//:node_modules/@tensorflow/tfjs-core/dist/tf-core.js": "@tensorflow/tfjs-core",
                "@npm//:node_modules/@tensorflow/tfjs-backend-cpu/dist/tf-backend-cpu.js": "@tensorflow/tfjs-backend-cpu",
                "@npm//:node_modules/@tensorflow/tfjs-backend-webgl/dist/tf-backend-webgl.js": "@tensorflow/tfjs-backend-webgl",
                "@npm//:node_modules/umap-js/lib/umap-js.js": "umap-js",
                "@npm//:node_modules/seedrandom/lib/alea.js": "seedrandom",
            },
            allow_files = True,
        ),
    },
    outputs = {
        "js": "%{name}.js",
    },
    doc = """`tf_dev_js_binary` is a development only js_binary replacement that simply
    concatenates modules using UMD/requirejs.""",
)
