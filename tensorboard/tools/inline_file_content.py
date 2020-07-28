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
"""

import os
import sys


def inline_content():
    dest_file_path = sys.argv[1]
    src_paths = sys.argv[2:]
    with open(dest_file_path, "r") as f:
        html = f.read()
    for src_path in src_paths:
        with open(src_path, "rb") as f:
            content = f.read().decode("utf-8")
        src_basename = os.path.basename(src_path)
        template_string = "%" + src_basename + "%"
        if template_string not in html:
            raise ValueError(
                "Cannot find %s in dest file %s"
                % (template_string, dest_file_path)
            )
        html = html.replace(template_string, content)
    sys.stdout.write(html)


if __name__ == "__main__":
    inline_content()
