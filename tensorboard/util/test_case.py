# Copyright 2017 The TensorFlow Authors. All Rights Reserved.
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

"""TensorBoard test case helper module.

This module provides a TensorBoard base test class with some of the
niceties of tf.test.TestCase, while only requiring standard unittest
be installed.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import atexit
import os
import shutil
import six
import tempfile
import unittest

from tensorboard.util import tb_logging


logger = tb_logging.get_logger()

_temp_dir = None


def get_temp_dir():
  """Return a temporary directory for tests to use."""
  global _temp_dir
  if not _temp_dir:
    if os.environ.get('TEST_TMPDIR'):
      temp_dir = tempfile.mkdtemp(prefix=os.environ['TEST_TMPDIR'])
    else:
      temp_dir = tempfile.mkdtemp()

    def delete_temp_dir(dirname=temp_dir):
      try:
        shutil.rmtree(dirname)
      except OSError as e:
        logger.error('Error removing %s: %s', dirname, e)

    atexit.register(delete_temp_dir)
    _temp_dir = temp_dir

  return _temp_dir


class TestCase(unittest.TestCase):
  """TensorBoard base test class.
  This class can lazily create a temporary directory for tests to use.
  """

  def __init__(self, method='runTest'):
    super(TestCase, self).__init__(method)
    self._method = method
    self._tempdir = None

  def setUp(self):
    super(TestCase, self).setUp()

  def tearDown(self):
    super(TestCase, self).tearDown()

  def assertItemsEqual(self, actual, expected, msg=None):
    """Test that sequence first contains the same elements as second,
    regardless of their order.

    Same as assertCountEqual in Python 3 with unittest.TestCase."""
    if hasattr(self, 'assertCountEqual'):
        self.assertCountEqual(actual, expected, msg)
    else:
        super(TestCase, self).assertItemsEqual(actual, expected, msg)

  def assertStartsWith(self, actual, expected_start, msg=None):
    """Test that string first starts with string second."""
    if not actual.startswith(expected_start):
      if msg is None:
        msg = '{} does not start with {}'.format(actual, expected_start)
      raise AssertionError(msg)

  def get_temp_dir(self):
    """Returns a unique temporary directory for the test to use.
    If you call this method multiple times during in a test, it will return the
    same folder. However, across different runs the directories will be
    different. This will ensure that across different runs tests will not be
    able to pollute each others environment.
    If you need multiple unique directories within a single test, you should
    use tempfile.mkdtemp as follows:
      tempfile.mkdtemp(dir=self.get_temp_dir()):
    Returns:
      string, the path to the unique temporary directory created for this test.
    """
    if not self._tempdir:
      self._tempdir = tempfile.mkdtemp(dir=get_temp_dir())
    return self._tempdir


def main(*args, **kwargs):
  """Pass args and kwargs through to unittest main"""
  return unittest.main(*args, **kwargs)
