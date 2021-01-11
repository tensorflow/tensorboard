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


def suffixer():
    template_filename = sys.argv[1]
    res_filenames = sys.argv[2:]

    with open(template_filename, "r") as f:
        template = f.read()

    for filename in res_filenames:
        with open(filename, "rb") as f:
            res = f.read()
            digest = hashlib.md5(res).hexdigest()

        res_name = os.path.basename(filename)
        template = template.replace(
            res_name, res_name + "?_file_md5=%s" % digest[:8]
        )

    sys.stdout.write(template)


if __name__ == "__main__":
    suffixer()
