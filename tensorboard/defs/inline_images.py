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
"""Inline png images in html.

Replaces %*.png% in the input .html file with a data URI containing the
base64-encoded image content of the corresopnding .png files in the images/
subdirectory.
"""


import base64
import os
import sys

MIME_TYPE = "image/png"


# TODO(#5039): Generalize this utility for more than just PNGs using mimetypes.
def inline_images():
    input_html_path = sys.argv[1]
    image_files = sys.argv[2:]
    with open(input_html_path, "r") as f:
        html = f.read()
    for image_file in image_files:
        with open(image_file, "rb") as f:
            base64_content = base64.b64encode(f.read()).decode("utf-8")
        data_uri = "data:%s;base64,%s" % (MIME_TYPE, base64_content)
        image_basename = os.path.basename(image_file)
        image_template = "%" + image_basename + "%"
        if image_template not in html:
            raise ValueError(
                "Cannot find %s in input html file %s"
                % (image_template, input_html_path)
            )
        html = html.replace(image_template, data_uri)
    sys.stdout.write(html)


if __name__ == "__main__":
    inline_images()
