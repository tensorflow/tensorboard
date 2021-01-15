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
# ==============================================================================

import hashlib
import os
import sys
import re


def replace_files(template_filepath, handlebar_and_filepath):
    replacements = {}
    for handlebar, filepath in handlebar_and_filepath.items():
        with open(filepath, "rb") as f:
            res = f.read()
            digest = hashlib.sha256(res).hexdigest()

        basename = os.path.basename(filepath)
        replacements[handlebar] = basename + "?_file_hash=%s" % digest[:8]

    with open(template_filepath, "r") as f:
        template = f.read()

    return re.sub(
        "|".join(re.escape(k) for k in replacements),
        lambda k: replacements[k.group()],
        template,
    )


def main():
    """Replaces resource declaration in template with hash of the resource file.

    Expects arguments to be passed via argv in following format:

       python resource_digest_suffixer.py <template_file> <handlebar_1> \
          <res_1> <handlebar_2> <res_2>...
    """
    template_filepath = sys.argv[1]
    res_handlebar_and_filepath = sys.argv[2:]

    handlebar_and_filepath = {}

    for index in range(0, len(res_handlebar_and_filepath), 2):
        handlebar = res_handlebar_and_filepath[index]
        filepath = res_handlebar_and_filepath[index + 1]
        handlebar_and_filepath[handlebar] = filepath

    sys.stdout.write(replace_files(template_filepath, handlebar_and_filepath))


if __name__ == "__main__":
    main()
