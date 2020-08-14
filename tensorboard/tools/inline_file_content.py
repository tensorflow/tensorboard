# Copyright 2020 The TensorFlow Authors. All Rights Reserved.
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
# ==============================================================================
"""Inline file contents in destination file.

Replaces special template syntax (e.g., `%filename.ext%`) in the destination file.

Usage: inline_file_content.py <dest-file> <src-file> [<src-file>...]
"""

import os
import re
import sys


def main():
    dest_file_path = sys.argv[1]
    src_paths = sys.argv[2:]

    with open(dest_file_path, "r") as f:
        dest_content = f.read()

    template_name_to_content = {}

    for src_path in src_paths:
        with open(src_path, "r") as f:
            content = f.read()

        src_basename = os.path.basename(src_path)

        if src_basename in template_name_to_content:
            raise ValueError("Duplicate src basename: %s" % src_basename)
        template_name_to_content[src_basename] = content

    search_key = (
        "%("
        + "|".join([re.escape(key) for key in template_name_to_content])
        + ")%"
    )

    def replace_key_with_content(match):
        return template_name_to_content[match.group(1)]

    inlined_content = re.sub(search_key, replace_key_with_content, dest_content)
    sys.stdout.write(inlined_content)


if __name__ == "__main__":
    main()
