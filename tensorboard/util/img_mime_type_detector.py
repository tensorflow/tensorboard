# Copyright 2025 The TensorFlow Authors. All Rights Reserved.
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

"""Utility to determine the MIME type of an image."""

from PIL import Image
import io

_IMGHDR_TO_MIMETYPE = {
    "bmp": "image/bmp",
    "gif": "image/gif",
    "jpeg": "image/jpeg",
    "png": "image/png",
}
_DEFAULT_IMAGE_MIMETYPE = "application/octet-stream"


def from_bytes(img_bytes: bytes) -> str:
    """Returns the MIME type of an image from its bytes."""
    format_lower = None
    try:
        img = Image.open(io.BytesIO(img_bytes))
        format_lower = img.format.lower()
        if format_lower == "jpg":
            format_lower = "jpeg"
    except:
        # Let the default value be returned.
        pass
    return _IMGHDR_TO_MIMETYPE.get(format_lower, _DEFAULT_IMAGE_MIMETYPE)
