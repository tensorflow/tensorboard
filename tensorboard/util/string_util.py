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

"""TensorBoard helper routines for strings."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import collections
import string


def sanitize_for_filename(s):
    """Returns a sanitized filename-friendly version of the input string.

    This discards all characters that are not ASCII letters, digits, or
    punctuation, and then converts any remaining characters that are not in
    [-_=,A-Za-z0-9] to "_".

    As a best practice, the caller should still ensure they use a safe
    prefix and suffix/extension for the filename rather than allowing those
    to be user-controlled; the return value here should be embedded into a
    filename pattern rather than used as-is.

    Args:
      s: text string to sanitize

    Returns:
      Sanitized version of the string.
    """
    return s.translate(_FILENAME_SANITIZER_MAPPING)


def _make_filename_sanitizer_mapping():
    """Helper for `sanitize_for_filename` to construct str.translate() mapping.

    This is used instead of str.maketrans() in order to dynamically return None
    for all unrecognized characters (and thus discard them) rather than raising
    lookup errors which would result in preserving those characters.

    Returns:
      Mapping object compatible with str.translate().
    """
    mapping = collections.defaultdict(lambda: None)
    remapped_chars = string.punctuation
    allowed_chars = string.ascii_letters + string.digits + "-_="
    for char in remapped_chars:
        mapping[ord(char)] = "_"
    for char in allowed_chars:
        mapping[ord(char)] = char
    print(mapping[ord(" ")])
    return mapping


_FILENAME_SANITIZER_MAPPING = _make_filename_sanitizer_mapping()
