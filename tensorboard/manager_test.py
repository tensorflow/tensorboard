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
# ==============================================================================
"""Unit tests for `tensorboard.manager`."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import datetime
import json
import os
import tempfile

import six
import tensorflow as tf

try:
  # python version >= 3.3
  from unittest import mock  # pylint: disable=g-import-not-at-top
except ImportError:
  import mock  # pylint: disable=g-import-not-at-top,unused-import

from tensorboard import manager
from tensorboard import version
from tensorboard.util import tb_logging


class ManagerTest(tf.test.TestCase):
  def setUp(self):
    super(ManagerTest, self).setUp()
    self.info_dir = os.path.join(self.get_temp_dir(), ".test-tensorboard-info")
    os.mkdir(self.info_dir)
    patcher = mock.patch(
        "tensorboard.manager._get_info_dir",
        lambda: self.info_dir,
    )
    patcher.start()
    self.addCleanup(patcher.stop)

  def _make_info(self, i=0):
    return manager.TensorboardInfo(
        version=version.VERSION,
        start_time=datetime.datetime.fromtimestamp(1548973541 + i),
        port=6060 + i,
        pid=76540 + i,
        path_prefix="/foo",
        logdir="~/my_data/",
        db="",
        cache_key="asdf",
    )

  @mock.patch("os.getpid", lambda: 76540)
  def test_write_remove_info_file(self):
    info = self._make_info()
    manager.write_info_file(info)
    filename = "pid-76540.info"
    expected_filepath = os.path.join(self.info_dir, filename)
    self.assertEqual(os.listdir(self.info_dir), [filename])
    with open(expected_filepath) as infile:
      self.assertEqual(manager._info_from_string(infile.read()), info)
    manager.remove_info_file()
    self.assertEqual(os.listdir(self.info_dir), [])

  def test_write_info_file_rejects_bad_types(self):
    info = self._make_info()._replace(start_time=1549061116)
    with six.assertRaisesRegex(
        self,
        ValueError,
        "expected 'start_time' of type.*datetime.*, but found: 1549061116",
    ):
      manager.write_info_file(info)
    self.assertEqual(os.listdir(self.info_dir), [])

  def test_write_info_file_rejects_wrong_version(self):
    info = self._make_info()._replace(version="reversion")
    with six.assertRaisesRegex(
        self,
        ValueError,
        "expected 'version' to be '.*', but found: 'reversion'",
    ):
      manager.write_info_file(info)
    self.assertEqual(os.listdir(self.info_dir), [])

  def test_tensorboardinfo_serde_roundtrip(self):
    # This is also tested as part of integration tests below.
    info = self._make_info()
    also_info = manager._info_from_string(manager._info_to_string(info))
    self.assertEqual(also_info, info)

  def test_remove_nonexistent(self):
    # Should be a no-op, except to create the info directory.
    manager.remove_info_file()

  def test_cache_key_differs_by_logdir(self):
    results = [
        manager.cache_key(
            working_directory=d,
            arguments=["--logdir", "something"],
        )
        for d in ("/home/me", "/home/you")
    ]
    self.assertEqual(len(results), len(set(results)))

  def test_cache_key_differs_by_arguments(self):
    results = [
        manager.cache_key(
            working_directory="/home/me",
            arguments=arguments,
        )
        for arguments in (
            ["--logdir=something"],
            ["--logdir", "something"],
            ["--logdir", "", "something"],
            ["--logdir", "", "something", ""],
        )
    ]
    self.assertEqual(len(results), len(set(results)))

  def test_cache_key_rejects_string_arguments(self):
    with six.assertRaisesRegex(self, TypeError, "should be a list"):
      manager.cache_key(
          working_directory="/home/me",
          arguments="--logdir=something",
      )

  def test_get_all(self):

    def add_info(i):
      with mock.patch("os.getpid", lambda: 76540 + i):
        manager.write_info_file(self._make_info(i))

    def remove_info(i):
      with mock.patch("os.getpid", lambda: 76540 + i):
        manager.remove_info_file()

    make_info = self._make_info

    self.assertItemsEqual(manager.get_all(), [])
    add_info(1)
    self.assertItemsEqual(manager.get_all(), [make_info(1)])
    add_info(2)
    self.assertItemsEqual(manager.get_all(), [make_info(1), make_info(2)])
    remove_info(1)
    self.assertItemsEqual(manager.get_all(), [make_info(2)])
    add_info(3)
    self.assertItemsEqual(manager.get_all(), [make_info(2), make_info(3)])
    remove_info(3)
    self.assertItemsEqual(manager.get_all(), [make_info(2)])
    remove_info(2)
    self.assertItemsEqual(manager.get_all(), [])

  def test_get_all_ignores_bad_files(self):
    with open(os.path.join(self.info_dir, "pid-1234.info"), "w") as outfile:
      outfile.write("good luck parsing this\n")
    with open(os.path.join(self.info_dir, "pid-5678.info"), "w") as outfile:
      outfile.write('{"valid_json":"yes","valid_tbinfo":"no"}\n')
    with mock.patch.object(tb_logging.get_logger(), "warning") as fn:
      self.assertEqual(manager.get_all(), [])
    self.assertEqual(fn.call_count, 2)


if __name__ == '__main__':
  tf.test.main()
