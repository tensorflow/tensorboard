#!/bin/python
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

import sys


def replace_template(template_path, content_path, dest_path):
    with open(template_path, "rb") as f:
        template = f.read()

    with open(content_path, "rb") as f:
        content = f.read()

    new_content = template.replace("{{% REPLACE_ME %}}", content.strip())
    with open(dest_path, "w") as f:
        f.write(new_content)


if __name__ == "__main__":
    args = sys.argv[1:]
    replace_template(*args)
