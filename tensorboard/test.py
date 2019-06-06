# Copyright 2019 The TensorFlow Authors. All Rights Reserved.
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

"""TensorBoard test module.

This module provides a TensorBoard base test class and main function
with some of the niceties of tf.test, while only requiring that Abseil
be installed (`pip install absl-py`).
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import atexit
import os
import shutil
import six

from absl.testing import absltest


class TestCase(absltest.TestCase):
  """TensorBoard base test class.

  This class can lazily create a temporary directory for tests to use.
  """

  def __init__(self, *args, **kwargs):
    super(TestCase, self).__init__(*args, **kwargs)
    self._tempdir = None

  def get_temp_dir(self):
    """Returns a unique temporary directory for the test to use.

    If you call this method multiple times during in a test, it will return the
    same folder. However, across different runs the directories will be
    different. This will ensure that across different runs tests will not be
    able to pollute each others environment.
    If you need multiple unique directories within a single test, you should
    use `self.create_tempdir()`, provided by `absltest.TestCase`.
      tempfile.mkdtemp(dir=self.get_temp_dir()):

    Returns:
      string, the path to the unique temporary directory created for this test.
    """
    if not self._tempdir:
      self._tempdir = self.create_tempdir().full_path
    return self._tempdir


def main(*args, **kwargs):
  """Pass args and kwargs through to absltest main."""
  return absltest.main(*args, **kwargs)
