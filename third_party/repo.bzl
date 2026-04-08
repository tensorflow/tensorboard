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

"""Repository helpers for TensorBoard external dependencies."""

def tb_mirror_urls(url):
    """Returns TensorFlow mirror plus origin URLs for an HTTPS source."""
    if not url.startswith("https://"):
        return [url]
    return [
        "https://storage.googleapis.com/mirror.tensorflow.org/%s" % url[8:],
        url,
    ]

def _get_link_dict(ctx, link_files, build_file):
    link_dict = {ctx.path(v): ctx.path(Label(k)) for k, v in link_files.items()}
    if build_file:
        link_dict[ctx.path("BUILD.bazel")] = ctx.path(Label(build_file))
    return link_dict

def _tb_http_archive_impl(ctx):
    link_dict = _get_link_dict(ctx, ctx.attr.link_files, ctx.attr.build_file)

    patch_files = ctx.attr.patch_file
    for patch_file in patch_files:
        if patch_file:
            ctx.path(Label(patch_file))

    ctx.download_and_extract(
        url = ctx.attr.urls,
        sha256 = ctx.attr.sha256,
        type = ctx.attr.type,
        stripPrefix = ctx.attr.strip_prefix,
    )

    for patch_file in patch_files:
        patch_file = ctx.path(Label(patch_file)) if patch_file else None
        if patch_file:
            ctx.patch(patch_file, strip = 1)

    for dst, src in link_dict.items():
        ctx.delete(dst)
        ctx.symlink(src, dst)

_tb_http_archive = repository_rule(
    implementation = _tb_http_archive_impl,
    attrs = {
        "sha256": attr.string(mandatory = True),
        "urls": attr.string_list(mandatory = True),
        "strip_prefix": attr.string(),
        "type": attr.string(),
        "patch_file": attr.string_list(),
        "build_file": attr.string(),
        "link_files": attr.string_dict(),
    },
)

def tb_http_archive(name, sha256, urls, **kwargs):
    """Downloads and creates Bazel repos for TensorBoard dependencies."""
    if len(urls) < 2:
        fail("tb_http_archive(urls) must have redundant URLs.")

    if not any([mirror in urls[0] for mirror in (
        "mirror.tensorflow.org",
        "mirror.bazel.build",
        "storage.googleapis.com",
    )]):
        fail("The first entry of tb_http_archive(urls) must be a mirror URL.")

    if native.existing_rule(name):
        print("\n\033[1;33mWarning:\033[0m skipping import of repository '" +
              name + "' because it already exists.\n")
        return

    _tb_http_archive(
        name = name,
        sha256 = sha256,
        urls = urls,
        **kwargs
    )
