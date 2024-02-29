# Copyright 2024 The TensorFlow Authors. All Rights Reserved.
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

"""Downloads files based on local platform."""

load("@bazel_tools//tools/build_defs/repo:java.bzl", "java_import_external")
load("//third_party:fonts.bzl", "tensorboard_fonts_workspace")
load("//third_party:python.bzl", "tensorboard_python_workspace")
load("//third_party:js.bzl", "tensorboard_js_workspace")
load("//third_party:rust.bzl", "tensorboard_rust_workspace")

def _impl(repository_ctx):
    if repository_ctx.os.name.lower().startswith("mac os"):
        urls = repository_ctx.attr.macos_urls
        sha256 = repository_ctx.attr.macos_sha256
    elif repository_ctx.os.name.lower().startswith("windows"):
        urls = repository_ctx.attr.windows_urls
        sha256 = repository_ctx.attr.windows_sha256
    else:
        urls = repository_ctx.attr.amd64_urls
        sha256 = repository_ctx.attr.amd64_sha256
    basename = urls[0][urls[0].rindex("/") + 1:]

    # sanitize the basename (for filenames with %20 in them)
    basename = basename.replace("%20", "-")
    repository_ctx.download(urls, basename, sha256)

    # if archive is a dmg then convert it to a zip
    if basename.endswith(".dmg"):
        zipfile = basename.replace(".dmg", ".zip")
        repository_ctx.execute([repository_ctx.path(Label("//web/internal:convert_dmg.sh")), basename, zipfile])
        basename = zipfile
    repository_ctx.symlink(basename, "file/" + basename)
    repository_ctx.file(
        "file/BUILD",
        "\n".join([
            ("# DO NOT EDIT: automatically generated BUILD file for " +
             "platform_http_file rule " + repository_ctx.name),
            "licenses(%s)" % repr(repository_ctx.attr.licenses),
            "filegroup(",
            "    name = 'file',",
            "    srcs = ['%s']," % basename,
            "    visibility = ['//visibility:public'],",
            ")",
        ]),
    )

platform_http_file = repository_rule(
    attrs = {
        "licenses": attr.string_list(mandatory = True, allow_empty = False),
        "amd64_urls": attr.string_list(),
        "amd64_sha256": attr.string(),
        "macos_urls": attr.string_list(),
        "macos_sha256": attr.string(),
        "windows_urls": attr.string_list(),
        "windows_sha256": attr.string(),
    },
    implementation = _impl,
)