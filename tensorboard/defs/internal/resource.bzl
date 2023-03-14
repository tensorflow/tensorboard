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
"""rules/macros for manipulating resources."""

def tf_resource_digest_suffixer(name, resources, template, out):
    """Query parameter suffixer for a resource in a template.

    In order to facilitate resource caching, the macro suffixes resource declaration in
    a template file by replacing it with one with query parameter,
    "?_file_hash=[len_8_truncated_hash]".

    For example, if a template is "index.html" that contains content like below,

        <script src="index.js"></script>

    For resources of ["index.js"], it will be replaced with:

        <script src="index.js?_file_hash=486c31fc"></script>

    Args:
        name: Name of the rule.
        resources: dict of replacement keyword to resource label.
        template: Label to file that should be replaced.
        out: Name of the output file.
    """

    srcs = [template]
    args = ["$(location %s)" % template]
    for handlebar, filename in resources.items():
        srcs.append(filename)
        args.append(handlebar)
        args.append("$(location %s)" % filename)

    native.genrule(
        name = name,
        srcs = srcs,
        outs = [out],
        cmd = """
          {
            $(execpath //tensorboard/defs/internal:resource_digest_suffixer) %s
          } > $@
        """ % " ".join(args),
        tools = [
            "//tensorboard/defs/internal:resource_digest_suffixer",
        ],
    )
