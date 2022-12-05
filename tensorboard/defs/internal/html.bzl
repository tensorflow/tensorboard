# Copyright 2017 The TensorFlow Authors. All Rights Reserved.
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

"""Rule for building the HTML binary."""

load("@io_bazel_rules_closure//closure:defs.bzl", "closure_js_aspect")
load("@io_bazel_rules_closure//closure/private:defs.bzl", "collect_js", "long_path", "unfurl")  # buildifier: disable=bzl-visibility

def _tb_combine_html_impl(ctx):
    """Compiles HTMLs into one HTML.

    The rule outputs a HTML that resolves all HTML `rel=import` statements into
    one document. The rule also combines content of all script elements to a
    JavaScript file when `js_path` is specified.
    """

    deps = unfurl(ctx.attr.deps, provider = "webfiles")
    manifests = depset(order = "postorder")
    files = depset()
    webpaths = depset()
    for dep in deps:
        manifests = depset(transitive = [manifests, dep.webfiles.manifests])
        webpaths = depset(transitive = [webpaths, dep.webfiles.webpaths])
        files = depset(transitive = [files, dep.data_runfiles.files])
    webpaths = depset([ctx.attr.output_path], transitive = [webpaths])
    closure_js_library = collect_js(
        unfurl(ctx.attr.deps, provider = "closure_js_library"),
    )

    # vulcanize
    ctx.actions.run(
        inputs = depset(transitive = [
            manifests,
            files,
        ]).to_list(),
        outputs = [ctx.outputs.html, ctx.outputs.js],
        executable = ctx.executable._Vulcanize,
        arguments = ([
                         ctx.attr.input_path,
                         ctx.attr.output_path,
                         ctx.attr.js_path,
                         ctx.outputs.html.path,
                         ctx.outputs.js.path,
                     ] +
                     [f.path for f in manifests.to_list()]),
        mnemonic = "Vulcanize",
        progress_message = "Vulcanizing %s" % ctx.attr.input_path,
    )

    # webfiles manifest
    manifest_srcs = [struct(
        path = ctx.outputs.html.path,
        longpath = long_path(ctx, ctx.outputs.html),
        webpath = ctx.attr.output_path,
    )]

    if ctx.attr.js_path:
        manifest_srcs.append(
            struct(
                path = ctx.outputs.js.path,
                longpath = long_path(ctx, ctx.outputs.js),
                webpath = ctx.attr.js_path,
            ),
        )

    manifest = ctx.actions.declare_file("%s.pbtxt" % ctx.label.name)
    ctx.actions.write(
        output = manifest,
        content = struct(
            label = str(ctx.label),
            src = manifest_srcs,
        ).to_proto(),
    )
    manifests = depset([manifest], transitive = [manifests])

    transitive_runfiles = depset()
    for dep in deps:
        transitive_runfiles = depset(transitive = [
            transitive_runfiles,
            dep.data_runfiles.files,
        ])

    return struct(
        files = depset([ctx.outputs.html, ctx.outputs.js]),
        webfiles = struct(
            manifest = manifest,
            manifests = manifests,
            webpaths = webpaths,
            dummy = ctx.outputs.html,
        ),
        runfiles = ctx.runfiles(
            files = ctx.files.data + [
                manifest,
                ctx.outputs.html,
                ctx.outputs.js,
            ],
            transitive_files = transitive_runfiles,
        ),
    )

tb_combine_html = rule(
    implementation = _tb_combine_html_impl,
    attrs = {
        "input_path": attr.string(
            mandatory = True,
            doc = """Entry point webpath of a HTML.""",
        ),
        "output_path": attr.string(
            mandatory = True,
            doc = """Webpath of an output file. Do not confuse with the output
                HTML filename which is `{name}.html`.
            """,
        ),
        "js_path": attr.string(
            doc = """If specified, rule extracts all scripts into {name}.js and
                inserts `<script src="{js_path}">`.
            """,
        ),
        "data": attr.label_list(allow_files = True),
        "deps": attr.label_list(
            aspects = [closure_js_aspect],
            mandatory = True,
            doc = """Dependencies of `input_path` that provides `webfiles`.
                Normally, they should be targets using `tf_web_library`s.
            """,
        ),
        "_Vulcanize": attr.label(
            default = Label("//tensorboard/java/org/tensorflow/tensorboard/vulcanize:Vulcanize"),
            executable = True,
            cfg = "exec",
        ),
    },
    outputs = {
        "html": "%{name}.html",
        "js": "%{name}.js",
    },
)
