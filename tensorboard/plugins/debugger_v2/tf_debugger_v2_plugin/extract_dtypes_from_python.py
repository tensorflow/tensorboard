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
"""Used in genrule to convert dtype type info from Python to TypeScript."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import json
import sys

from tensorboard.compat.tensorflow_stub import dtypes


def write_file(out_path):
    with open(out_path, "w") as f:
        name_map = json.dumps(dtypes._TYPE_TO_STRING)
        f.write(
            "export const DTYPE_ENUM_TO_NAME: "
            "{[enumValue: string]: string} = %s;\n" % name_map
        )


if __name__ == "__main__":
    write_file(sys.argv[1])
