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

"""Rule for zipping Webfiles."""

load("@io_bazel_rules_closure//closure/private:defs.bzl", "WebFilesInfo", "collect_runfiles", "extract_providers", "unfurl")  # buildifier: disable=bzl-visibility

def _tensorboard_zip_file(ctx):
    deps = extract_providers(ctx.attr.deps, provider = WebFilesInfo)
    deps = unfurl(deps)
    manifests = depset(order = "postorder", transitive = [dep.manifests for dep in deps])
    webpaths = depset(transitive = [dep.webpaths for dep in deps])
    files = depset(transitive = [dep[DefaultInfo].data_runfiles.files for dep in ctx.attr.deps])
    ctx.actions.run(
        mnemonic = "Zipper",
        inputs = depset(transitive = [manifests, files]).to_list(),
        outputs = [ctx.outputs.zip],
        executable = ctx.executable._Zipper,
        arguments = ([ctx.outputs.zip.path] +
                     [m.path for m in manifests.to_list()]),
        progress_message = "Zipping %d files" % len(webpaths.to_list()),
    )
    return DefaultInfo(
        files = depset([ctx.outputs.zip]),
        runfiles = collect_runfiles(
            ctx,
            files = ctx.files.data + [ctx.outputs.zip],
        ),
    )

tensorboard_zip_file = rule(
    implementation = _tensorboard_zip_file,
    attrs = {
        "data": attr.label_list(allow_files = True),
        "deps": attr.label_list(providers = [WebFilesInfo], mandatory = True),
        "_Zipper": attr.label(
            default = Label("//tensorboard/java/org/tensorflow/tensorboard/vulcanize:Zipper"),
            executable = True,
            cfg = "exec",
        ),
    },
    outputs = {
        "zip": "%{name}.zip",
    },
)
