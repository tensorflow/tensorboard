# Copyright 2018 The TensorFlow Authors. All Rights Reserved.
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

"""TensorBoard helper routine for platform.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function


def readahead_file_path(path, unused_readahead=None):
  """Readahead files not implemented; simply returns given path."""
  return path


def get_resource_as_file(name, mode='rb'):
  """Get the open file object to the named resource.

  Args:
    name: The name of the resource.
    mode: The file mode. read_resource only supports 'r', 'rt' and 'rb'.
  Returns:
    The open file object to the named resource.
  Raises:
    IOError: if the name is not found, or the resource cannot be opened.
    ValueError: If the mode is not supported.
  """

  if mode not in ('r', 'rb', 'rt'):
    raise ValueError('Invalid mode: %r' % mode)

  return open(name, mode)
